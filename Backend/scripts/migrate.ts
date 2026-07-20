import { migrateDatabase } from "../src/database.js";

await migrateDatabase();
console.log("Database migrations completed");
process.exit(0);
