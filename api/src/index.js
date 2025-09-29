import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoUri = process.env.MONGO_URI || "mongodb://mongo:27017";
const dbName = process.env.MONGO_DB || "fin_tool";

let db;
(async () => {
  const client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db(dbName);
  console.log(`API connected to MongoDB database: ${dbName}`);
})().catch(err => {
  console.error("Mongo connect error:", err);
  process.exit(1);
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "api" });
});

app.get("/api/accounts", async (_req, res) => {
  const items = await db.collection("accounts").find({}).limit(10).toArray();
  res.json(items);
});

const port = process.env.API_PORT || 3000;
app.listen(port, () => console.log(`API listening on :${port}`));
