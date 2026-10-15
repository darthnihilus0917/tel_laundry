-- Customers sign in with an email (or Google) and a 4-digit PIN. The contact number stays a profile field.
-- email is nullable: walk-in customers registered by staff may not have one.
alter table customers
  add column email         text,
  add column auth_provider text not null default 'email' check (auth_provider in ('email', 'google'));

-- one account per email address per branch, case-insensitive
create unique index customers_branch_email_uq on customers (branch_id, lower(email)) where email is not null;
