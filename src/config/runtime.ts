import mongoose from "mongoose";
import { connectDatabase } from "./db.js";
import { seedDefaults } from "../data/seed.js";

const SEED_MARKER_ID = "grantpilot-default-seed-v11";
let readyPromise: Promise<void> | null = null;

async function ensureSeedData() {
  const metadata = mongoose.connection.collection<{
    _id: string;
    completedAt: Date;
    version: number;
  }>("grantpilot_metadata");
  const marker = await metadata.findOne({ _id: SEED_MARKER_ID });
  if (marker) return;

  await seedDefaults();
  await metadata.updateOne(
    { _id: SEED_MARKER_ID },
    { $set: { completedAt: new Date(), version: 11 } },
    { upsert: true }
  );
}

export async function ensureRuntimeReady() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await connectDatabase();
      await ensureSeedData();
    })().catch((error) => {
      readyPromise = null;
      throw error;
    });
  }

  return readyPromise;
}
