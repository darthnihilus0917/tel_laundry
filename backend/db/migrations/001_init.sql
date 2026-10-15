-- TEL Laundry Ops — initial schema.
-- Written to run on PostgreSQL 12+ (local) and Supabase (PostgreSQL 15+) unchanged:
-- plain SQL, CHECK constraints instead of enums, pgcrypto only where the server lacks gen_random_uuid().
-- Shapes follow the front-end prototype (src/data/seedData.js).

-- gen_random_uuid() is built in from PostgreSQL 13 (and on Supabase); PostgreSQL 12 needs pgcrypto.
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'gen_random_uuid') then
    create extension if not exists pgcrypto;
  end if;
end
$$;

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------- branches
-- NFR-5: every customer/order/ticket carries branch_id, so a second branch is a filter, not a migration.
create table branches (
  id         text primary key,            -- 'main'
  name       text not null,
  created_at timestamptz not null default now()
);
insert into branches (id, name) values ('main', 'Main branch');

-- ---------------------------------------------------------------- staff
-- Owner, attendants and riders. With Supabase Auth, add auth_user_id uuid references auth.users(id).
create table staff (
  id         uuid primary key default gen_random_uuid(),
  branch_id  text not null references branches(id) default 'main',
  name       text not null,
  role       text not null check (role in ('owner', 'attendant', 'rider')),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- customers
-- address / delivery_address: {unit, subdivision, barangay, city, landmark} (see src/utils/address.js).
create table customers (
  id               uuid primary key default gen_random_uuid(),
  branch_id        text not null references branches(id) default 'main',
  first_name       text not null,
  last_name        text not null,
  contact          text not null,
  pin_hash         text,                   -- scrypt hash; the prototype's 4-digit PIN is never stored in clear
  address          jsonb not null,
  delivery_address jsonb,                  -- null = same as pick-up address
  area             text,                   -- route grouping, defaults to the subdivision
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint address_complete check (
    coalesce(address->>'unit', '') <> '' and coalesce(address->>'subdivision', '') <> ''
    and coalesce(address->>'barangay', '') <> '' and coalesce(address->>'city', '') <> '')
);
create unique index customers_branch_contact_uq on customers (branch_id, contact);
create index customers_name_idx on customers (lower(last_name), lower(first_name));
create trigger customers_updated_at before update on customers
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------- orders
-- Order IDs are TEL-MMDDYY-XXXX (Manila date). XXXX is one continuous counter that never resets,
-- starting at 1000 — an atomic sequence, so two requests can never receive the same number.
create sequence order_seq start 1000 minvalue 1000;

create function new_order_id() returns text as $$
  select 'TEL-' || to_char(now() at time zone 'Asia/Manila', 'MMDDYY') || '-' || nextval('order_seq')::text;
$$ language sql;

create table orders (
  id                  text primary key default new_order_id(),
  branch_id           text not null references branches(id) default 'main',
  customer_id         uuid not null references customers(id),
  status              text not null default 'New Request' check (status in (
    'New Request', 'Assigned for Pickup', 'Picked Up', 'In Shop', 'Ready for Delivery',
    'Out for Delivery', 'Delivered', 'Payment Verification', 'Completed',
    'Rider Will Return', 'Cancelled')),
  weight_kg           numeric(5, 2) check (weight_kg is null or weight_kg > 0),
  price               numeric(10, 2) check (price is null or price >= 0),   -- final bill
  handover            text not null check (handover in ('Meet the Rider', 'Leave at Lobby')),
  channel             text not null default 'Text'
                      check (channel in ('Text', 'Viber', 'Messenger', 'In-Person / Walk-in', 'App')),
  rider_id            uuid references staff(id),
  pickup_date         date not null,
  pickup_slot         text not null,
  notes               text not null default '',
  -- exceptions / outcomes
  return_reason       text,
  cancel_reason       text,
  delay_reason        text,
  delay_eta           text,
  delay_notified      boolean not null default false,
  -- payments
  payment_status      text not null default 'Unpaid' check (payment_status in (
    'Unpaid', 'Pending Verification', 'Verified', 'Shortage Logged', 'Awaiting Re-upload')),
  payment_method      text not null default 'Cash' check (payment_method in ('Cash', 'GCash')),
  gcash_ref           text check (gcash_ref is null or gcash_ref ~ '^[0-9]{4}$'),
  shortage            numeric(10, 2) check (shortage is null or shortage > 0),
  reject_reason       text,
  payment_logged_at   timestamptz,
  verified_at         timestamptz,
  verified_by         text,
  -- photos are data URLs for now; move to Supabase Storage and keep only the path.
  -- Retention: photos are cleared 30 days after payment verification (photos_purged = true).
  bag_photo           text,        -- customer's photo of the bag (lobby pick-up)
  ref_photo           text,        -- rider's reference photo at pick-up
  proof_photo         text,        -- proof of delivery
  receipt_photo       text,        -- customer's GCash receipt
  photos_purged       boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index orders_status_idx on orders (status);
create index orders_customer_idx on orders (customer_id);
create index orders_rider_idx on orders (rider_id) where rider_id is not null;
create index orders_pickup_date_idx on orders (pickup_date);
create index orders_created_idx on orders (created_at);
create trigger orders_updated_at before update on orders
  for each row execute function set_updated_at();

-- An order carries one or more packages, each with its own special instruction (max 150 chars).
create table order_items (
  order_id    text not null references orders(id) on delete cascade,
  position    smallint not null,
  package     text not null check (package in ('Premium', 'Deluxe')),
  instruction text not null default '' check (char_length(instruction) <= 150),
  primary key (order_id, position)
);

-- ---------------------------------------------------------------- order_events
-- NFR-3 traceability: every status / payment change is recorded.
create table order_events (
  id          bigint generated always as identity primary key,
  order_id    text not null references orders(id) on delete cascade,
  event       text not null,           -- created, status_change, rider_assigned, payment_logged, ...
  from_value  text,
  to_value    text,
  actor       text,                    -- staff name / role until real auth exists
  created_at  timestamptz not null default now()
);
create index order_events_order_idx on order_events (order_id, created_at);

-- ---------------------------------------------------------------- complaints
create table complaints (
  id           uuid primary key default gen_random_uuid(),
  branch_id    text not null references branches(id) default 'main',
  order_id     text not null references orders(id),
  kind         text not null default 'Issue' check (kind in ('Issue', 'Follow-up')),
  channel      text not null default 'Text'
               check (channel in ('Text', 'Viber', 'Messenger', 'In-Person / Walk-in', 'App')),
  message      text not null,
  photos       jsonb not null default '[]'::jsonb,   -- array of data URLs (max 10), purged with the order's photos
  status       text not null default 'Open' check (status in ('Open', 'In Progress', 'Resolved')),
  assigned_to  uuid references staff(id),
  response     text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
create index complaints_status_idx on complaints (status);
create index complaints_order_idx on complaints (order_id);
create trigger complaints_updated_at before update on complaints
  for each row execute function set_updated_at();
