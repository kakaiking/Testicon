import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client/web";
import { put } from "@vercel/blob";
import { readFile } from "fs/promises";
import path from "path";

function createRemoteClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) {
    throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required");
  }
  const libsql = createClient({ url, authToken: token });
  return new PrismaClient({ adapter: new PrismaLibSQL(libsql) });
}

async function migrateIconUrl(iconUrl: string | null): Promise<string | null> {
  if (!iconUrl || !iconUrl.startsWith("/uploads/")) return iconUrl;

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) return iconUrl;

  const relative = iconUrl.replace(/^\/uploads\//, "");
  const filePath = path.join(process.cwd(), "public", "uploads", relative);
  const data = await readFile(filePath);
  const blob = await put(relative, data, { access: "public", token: blobToken });
  return blob.url;
}

async function main() {
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  const local = new PrismaClient({
    datasources: { db: { url: `file:${dbPath}` } },
  });
  const remote = createRemoteClient();

  const users = await local.user.findMany();
  const apps = await local.testApp.findMany();
  const invitations = await local.invitation.findMany();
  const enrollments = await local.testerEnrollment.findMany();
  const issues = await local.issue.findMany();
  const rewards = await local.reward.findMany();

  console.log("Migrating:", {
    users: users.length,
    apps: apps.length,
    invitations: invitations.length,
    enrollments: enrollments.length,
    issues: issues.length,
    rewards: rewards.length,
  });

  console.log("Clearing remote database...");
  await remote.reward.deleteMany();
  await remote.issue.deleteMany();
  await remote.testerEnrollment.deleteMany();
  await remote.invitation.deleteMany();
  await remote.testApp.deleteMany();
  await remote.user.deleteMany();

  for (const user of users) {
    await remote.user.create({ data: user });
  }

  for (const app of apps) {
    const iconUrl = await migrateIconUrl(app.iconUrl);
    await remote.testApp.create({ data: { ...app, iconUrl } });
  }

  for (const invitation of invitations) {
    await remote.invitation.create({ data: invitation });
  }

  for (const enrollment of enrollments) {
    await remote.testerEnrollment.create({ data: enrollment });
  }

  for (const issue of issues) {
    await remote.issue.create({ data: issue });
  }

  for (const reward of rewards) {
    await remote.reward.create({ data: reward });
  }

  console.log("Migration complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
