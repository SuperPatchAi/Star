import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getOnboardingState } from "@/lib/actions/onboarding";
import { OnboardingCarousel } from "@/components/onboarding/onboarding-carousel";

export default async function OnboardingPage() {
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const { step } = await getOnboardingState();
  if (step !== "carousel") redirect("/dashboard");

  return <OnboardingCarousel />;
}
