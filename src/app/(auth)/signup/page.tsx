import { validateInviteToken } from "@/lib/actions/team";
import { SignupForm } from "./signup-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite: inviteToken } = await searchParams;

  let leaderName: string | null = null;
  if (inviteToken) {
    const result = await validateInviteToken(inviteToken);
    if (result.valid) {
      leaderName = result.leaderName;
    }
  }

  return <SignupForm inviteToken={inviteToken ?? null} leaderName={leaderName} />;
}
