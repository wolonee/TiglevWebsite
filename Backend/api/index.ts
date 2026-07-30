import type { Request, Response } from "express";
import app from "../src/app.js";
import { migrateDatabase } from "../src/database.js";

export default async function handler(request: Request, response: Response) {
  try {
    await migrateDatabase();
    return app(request, response);
  } catch (error) {
    console.error("Database migration failed:", error);
    return response.status(500).json({ error: "Database initialization failed" });
  }
}
