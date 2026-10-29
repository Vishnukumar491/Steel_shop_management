import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import sessionsRouter from "./routes/sessions.js";
import entriesRouter from "./routes/entries.js";
import reportsRouter from "./routes/reports.js";

const app = express();

// CORS is only needed for local split-origin development. In production the
// browser calls /api on the same origin, and Vercel routes it to this service.
if (!process.env.VERCEL) {
  const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim());
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin not allowed by CORS"));
    },
  }));
}

app.use(express.json({ limit: "1mb" }));
app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "Steel Shop API is running" });
});

// Connect lazily for API requests; this also works with Vercel's serverless
// request lifecycle, where the process may be reused between invocations.
app.use("/api", async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

app.use("/api/sessions", sessionsRouter);
app.use("/api/entries", entriesRouter);
app.use("/api/reports", reportsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === "production"
      ? "Internal server error"
      : (err.message || "Internal server error"),
  });
});

// Vercel consumes the exported Express app. For local development, run `npm start`.
if (!process.env.VERCEL) {
  const port = process.env.PORT || 5000;
  app.listen(port, "0.0.0.0", () => console.log(`API listening on ${port}`));
}

export default app;
