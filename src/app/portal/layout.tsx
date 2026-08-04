import { getSession } from "@/lib/auth";
import { PortalLayoutClient } from "./PortalLayoutClient";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return <PortalLayoutClient session={session}>{children}</PortalLayoutClient>;
}
