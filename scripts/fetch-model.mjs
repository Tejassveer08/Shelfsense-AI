// Downloads the query-embedding model (all-MiniLM-L6-v2, ONNX, fp32 — the exact model the
// catalogue was embedded with) into ./models so it ships inside the Vercel functions.
// Runs automatically before `npm run build`; safe to re-run (existing files are skipped).
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const REPO = "Xenova/all-MiniLM-L6-v2";
const FILES = ["config.json", "tokenizer.json", "tokenizer_config.json", "onnx/model.onnx"];
const root = path.join(process.cwd(), "models", REPO);

for (const file of FILES) {
  const dest = path.join(root, file);
  const existing = await stat(dest).catch(() => null);
  if (existing?.size) continue;
  const url = `https://huggingface.co/${REPO}/resolve/main/${file}`;
  process.stdout.write(`fetching ${REPO}/${file} … `);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, bytes);
  console.log(`${(bytes.length / 1e6).toFixed(1)} MB`);
}
console.log(`embedding model ready in models/${REPO}`);
