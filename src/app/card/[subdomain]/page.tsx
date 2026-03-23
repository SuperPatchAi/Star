import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { getPublicProfile } from "@/lib/actions/profile";
import { getSocialUrl } from "@/lib/utils";
import { SOCIAL_PLATFORMS } from "@/lib/db/types";
import { SOCIAL_ICON_MAP } from "@/components/ui/social-icons";
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
  return {
    title: `${displayName} — SuperPatch Rep`,
    description: `Connect with ${displayName}, an independent SuperPatch representative.`,
    openGraph: {
      title: `${displayName} — SuperPatch Rep`,
      description: `Connect with ${displayName}, an independent SuperPatch representative.`,
      type: "profile",
      ...(profile.avatar_url && { images: [{ url: profile.avatar_url }] }),
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
      <div className="w-full max-w-sm rounded-2xl border bg-card shadow-lg overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/80 to-primary" />

        <div className="px-6 pb-6 -mt-12 text-center">
          <Avatar className="h-24 w-24 mx-auto ring-4 ring-card">
            <AvatarImage
              src={profile.avatar_url ?? undefined}
              alt={displayName}
            />
            <AvatarFallback className="text-2xl bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>

          <h1 className="mt-4 text-xl font-bold">{displayName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Independent SuperPatch Representative
          </p>

          <Button asChild className="w-full mt-6">
            <a href={storeUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4 mr-2" />
              Visit My Store
            </a>
          </Button>

          {socialEntries.length > 0 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              {socialEntries.map((platform) => {
                const Icon = SOCIAL_ICON_MAP[platform.key];
                const handle = profile.social_links[platform.key]!;
                const url = getSocialUrl(platform.key, handle);
                return (
                  <a
                    key={platform.key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center size-10 rounded-full border bg-muted/50 hover:bg-muted transition-colors"
                    title={platform.label}
                  >
                    {Icon && <Icon className="size-5" />}
                  </a>
                );
              })}
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-6">
            Powered by SuperPatch S.T.A.R.
          </p>
        </div>
      </div>
    </div>
  );
}
