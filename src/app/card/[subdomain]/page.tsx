import { notFound } from "next/navigation";
import { getPublicProfile } from "@/lib/actions/profile";
import { SOCIAL_PLATFORMS } from "@/lib/db/types";
import { BusinessCardDisplay } from "@/components/card/business-card-display";
import type { Metadata } from "next";

interface CardPageProps {
  params: Promise<{ subdomain: string }>;
}

export async function generateMetadata({
  params,
}: CardPageProps): Promise<Metadata> {
  const { subdomain } = await params;
  const profile = await getPublicProfile(subdomain);
  if (!profile) return { title: "Not Found" };

  const displayName = profile.full_name || subdomain;
  const ogImageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL ? "https://star-seven-sigma.vercel.app" : "http://localhost:3000"}/api/og/card/${subdomain}`;

  return {
    title: `${displayName} — SuperPatch Rep`,
    description: `Connect with ${displayName}, an independent SuperPatch representative.`,
    openGraph: {
      title: `${displayName} — SuperPatch Rep`,
      description: `Connect with ${displayName}, an independent SuperPatch representative.`,
      type: "profile",
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayName} — SuperPatch Rep`,
      description: `Connect with ${displayName}, an independent SuperPatch representative.`,
      images: [ogImageUrl],
    },
  };
}

export default async function CardPage({ params }: CardPageProps) {
  const { subdomain } = await params;
  const profile = await getPublicProfile(subdomain);

  if (!profile) notFound();

  const displayName = profile.full_name || subdomain;
  const initials = profile.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? subdomain[0]?.toUpperCase() ?? "S";

  const storeUrl = `https://${profile.store_subdomain}.superpatch.com`;
  const socialEntries = SOCIAL_PLATFORMS.filter(
    (p) => profile.social_links[p.key]?.trim()
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <BusinessCardDisplay
        displayName={displayName}
        initials={initials}
        avatarUrl={profile.avatar_url}
        storeUrl={storeUrl}
        socialEntries={socialEntries}
        socialLinks={profile.social_links}
      />
    </div>
  );
}
