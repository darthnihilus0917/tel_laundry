import express from "express";
import cors from "cors";
import { HttpError } from "./domain.js";
import customers from "./routes/customers.js";
import orders from "./routes/orders.js";
import complaints from "./routes/complaints.js";
import meta from "./routes/meta.js";

export function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? true }));
  app.use(express.json({ limit: "6mb" })); // photos arrive as data URLs

  app.use("/api/customers", customers);
  app.use("/api/orders", orders);
  app.use("/api/complaints", complaints);
  app.use("/api", meta);

  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

  // Express 5 forwards rejected promises from async handlers here.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON" });
    if (err.type === "entity.too.large") return res.status(413).json({ error: "Payload too large" });
    if (err.code === "22P02") return res.status(400).json({ error: "Malformed id or value" }); // invalid text representation
    if (err.code === "23514" || err.code === "23502") return res.status(400).json({ error: "Value violates a database constraint" });
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
