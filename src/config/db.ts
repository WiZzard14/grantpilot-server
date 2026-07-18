import mongoose from "mongoose";
import { env } from "./env.js";

let connectionPromise: Promise<typeof mongoose> | null = null;

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return mongoose;

  if (!connectionPromise) {
    mongoose.set("strictQuery", true);
    connectionPromise = mongoose
      .connect(env.MONGODB_URI, {
        dbName: env.MONGODB_DB_NAME,
        serverSelectionTimeoutMS: 10_000,
        autoIndex: env.NODE_ENV !== "production"
      })
      .then((connection) => {
        console.log(`MongoDB connected (database: ${env.MONGODB_DB_NAME})`);
        return connection;
      })
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }

  return connectionPromise;
}
