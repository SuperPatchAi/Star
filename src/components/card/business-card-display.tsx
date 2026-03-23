"use client";

import { useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { getSocialUrl } from "@/lib/utils";
import { SOCIAL_ICON_MAP } from "@/components/ui/social-icons";
import { ShareCardButton } from "./share-card-button";
import type { SocialLinks, SocialPlatform } from "@/lib/db/types";

interface BusinessCardDisplayProps {
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  storeUrl: string;
  socialEntries: { key: SocialPlatform; label: string }[];
  socialLinks: SocialLinks;
}

export function BusinessCardDisplay({
  displayName,
  initials,
  avatarUrl,
  storeUrl,
  socialEntries,
  socialLinks,
}: BusinessCardDisplayProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm">
      <div
        ref={cardRef}
        className="w-full rounded-2xl border bg-card shadow-lg overflow-hidden"
      >
        <div className="h-24 bg-gradient-to-r from-primary/80 to-primary" />

        <div className="px-6 pb-6 -mt-12 text-center">
          <Avatar className="h-24 w-24 mx-auto ring-4 ring-card">
            <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
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
                const handle = socialLinks[platform.key]!;
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

      <ShareCardButton cardRef={cardRef} displayName={displayName} />
    </div>
  );
}
