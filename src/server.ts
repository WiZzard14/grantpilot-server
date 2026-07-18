import mongoose from "mongoose";
import { app } from "./app.js";
import { ensureRuntimeReady } from "./config/runtime.js";
import { env } from "./config/env.js";

await ensureRuntimeReady();

const server = app.listen(env.PORT, () => {
  console.log(`GrantPilot API running on http://localhost:${env.PORT}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received; shutting down gracefully`);
  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
