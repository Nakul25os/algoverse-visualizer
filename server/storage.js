import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isVercel = process.env.VERCEL;
const historyPath = isVercel
  ? path.join("/tmp", "history.json")
  : path.join(__dirname, "data", "history.json");

function ensureStorage() {
  if (!fs.existsSync(historyPath)) {
    fs.mkdirSync(path.dirname(historyPath), { recursive: true });
    fs.writeFileSync(historyPath, "[]", "utf8");
  }
}

export function readHistory() {
  ensureStorage();
  const raw = fs.readFileSync(historyPath, "utf8");
  return JSON.parse(raw || "[]");
}

export function writeHistory(entries) {
  ensureStorage();
  fs.writeFileSync(historyPath, JSON.stringify(entries, null, 2), "utf8");
}

export function appendHistory(entry) {
  const history = readHistory();
  const updated = [entry, ...history].slice(0, 30);
  writeHistory(updated);
  return updated;
}
