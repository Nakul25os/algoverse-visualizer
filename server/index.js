import express from "express";
import cors from "cors";
import { appendHistory, readHistory } from "./storage.js";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "AlgoVerse API" });
});

app.get("/api/history", (_req, res) => {
  res.json(readHistory());
});

app.post("/api/history", (req, res) => {
  const payload = req.body ?? {};
  const entry = {
    id: `${Date.now()}`,
    algorithm: payload.algorithm ?? "Unknown",
    category: payload.category ?? "General",
    input: payload.input ?? "",
    steps: payload.steps ?? 0,
    durationMs: payload.durationMs ?? 0,
    complexity: payload.complexity ?? {},
    createdAt: new Date().toISOString(),
  };

  const history = appendHistory(entry);
  res.status(201).json({ entry, history });
});

export default app;

if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`AlgoVerse API running on http://localhost:${port}`);
  });
}
