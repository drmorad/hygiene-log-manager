import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { hashPassword, generateToken } from "./lib/auth";
import { eq } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function seedDirector() {
  try {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.role, "director")).limit(1);
    if (!existing) {
      const id = crypto.randomUUID();
      const defaultPassword = "Rewaya@2024";
      await db.insert(users).values({
        id,
        username: "director",
        passwordHash: hashPassword(defaultPassword),
        name: "Quality & Hygiene Director",
        role: "director",
        allowedHotels: ["Rewaya Majestic", "Rewaya Inn", "Rewaya Luxury"],
      });
      logger.info("──────────────────────────────────────────────────────────");
      logger.info("  Director account created (first-time setup)");
      logger.info("  Username : director");
      logger.info("  Password : Rewaya@2024");
      logger.info("  ⚠  Change this password after first login!");
      logger.info("──────────────────────────────────────────────────────────");
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed director account — ensure DATABASE_URL is set and tables are migrated");
  }
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  await seedDirector();
});
