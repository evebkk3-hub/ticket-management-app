import { migrateDatabase } from "../database/database";
import { seedDatabase } from "../database/seed";

export async function bootstrapApplication(): Promise<void> {
  await migrateDatabase();
  await seedDatabase();
}
