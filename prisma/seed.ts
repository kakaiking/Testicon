import { prisma } from "../src/lib/db";

async function main() {
  const adminEmail = (process.env.ADMIN_EMAILS || "admin@hackstreetboys.com").split(",")[0].trim();

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: { email: adminEmail, role: "ADMIN", name: "Admin" },
  });

  const sampleApp = await prisma.testApp.upsert({
    where: { id: "seed-app-1" },
    update: {},
    create: {
      id: "seed-app-1",
      name: "Internal Portal Demo",
      description: "Test the HackstreetBoys internal portal shell. Report any UI bugs, broken links, or layout issues.",
      iconUrl: "",
      launchUrl: "https://kakaiking.github.io/Internal-App/index.html",
      internalAppId: null,
      ndaText: `NON-DISCLOSURE AGREEMENT

By participating in this software test, you agree to:
1. Keep all information about this application confidential
2. Not share screenshots, recordings, or details with third parties
3. Not attempt to access systems beyond your authorized scope
4. Report security vulnerabilities responsibly`,
      termsText: `TERMS OF TESTING

You understand that:
1. This is pre-release software that may contain bugs
2. Features may change without notice during the test period
3. Your feedback will be used to improve the product
4. Rewards are paid based on issue severity at admin discretion`,
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 86400000),
      rewardLow: 5,
      rewardMedium: 15,
      rewardHigh: 50,
      rewardCritical: 100,
      status: "ACTIVE",
    },
  });

  console.log("Seeded:", { admin: admin.email, app: sampleApp.name });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
