import { getAuthUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({
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
