import { execSync } from "node:child_process";
import { createClient } from "@libsql/client/web";

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required");
  }

  const sql = execSync(
    "npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script",
    { encoding: "utf8" },
  );

  const client = createClient({ url, authToken });
  await client.executeMultiple(sql);
  console.log("Applied Prisma schema to Turso.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
