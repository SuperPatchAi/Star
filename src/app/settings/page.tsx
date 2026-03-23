import { getAuthUser } from "@/lib/auth";
import { getNotificationPreferences } from "@/lib/actions/push-subscriptions";
import { ProfileSection } from "@/components/settings/profile-section";
import { NotificationSection } from "@/components/settings/notification-section";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { AccountSection } from "@/components/settings/account-section";
import { AboutSection } from "@/components/settings/about-section";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const { user, profile } = await getAuthUser();
  const notificationPrefs = await getNotificationPreferences();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pb-8 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile, notifications, and preferences.
        </p>
      </div>

      <ProfileSection
        profile={profile}
        email={user.email ?? ""}
      />

      <NotificationSection
        initialPrefs={notificationPrefs}
      />

      <AppearanceSection />

      <AccountSection email={user.email ?? ""} />

      <AboutSection />
    </div>
  );
}
