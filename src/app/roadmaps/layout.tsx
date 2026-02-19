import { getAuthUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function RoadmapsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getAuthUser();

  return (
    <AppShell user={user} profile={profile}>
      {children}
    </AppShell>
  );
}
