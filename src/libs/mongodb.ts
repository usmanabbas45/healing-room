import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

let isConnected = false;

export const connectDB = async () => {
  if (!MONGODB_URI) {
    console.warn("⚠️  MONGODB_URI not set - database features disabled");
    return false;
  }

  if (isConnected) {
    return true;
  }

  try {
    const { connection } = await mongoose.connect(MONGODB_URI);
    isConnected = connection.readyState === 1;
    if (isConnected) {
      console.log("✅ MongoDB connected");
    }
    return isConnected;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    return false;
  }
};
