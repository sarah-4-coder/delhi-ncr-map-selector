/* eslint-disable prefer-const */
/* eslint-disable no-var */
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

// Define the shape of our cached mongoose connection
interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extend the NodeJS.Global interface to include our custom property
declare global {
  var mongoose: CachedConnection | undefined;
}

let cached: CachedConnection = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
    };

    console.log("Attempting to connect to MongoDB...");
    console.log("MONGODB_URI:", MONGODB_URI!.replace(/\/\/.*@/, "//<credentials>@")); // Log the URI without sensitive info

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log("MongoDB connected successfully");
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    console.error("MongoDB connection error:", e);
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;