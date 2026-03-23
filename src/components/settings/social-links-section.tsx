"use client";

import { useState, useCallback } from "react";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { updateSocialLinks } from "@/lib/actions/profile";
import type { SocialLinks } from "@/lib/db/types";
import { SOCIAL_PLATFORMS } from "@/lib/db/types";
import { SOCIAL_ICON_MAP } from "@/components/ui/social-icons";

interface SocialLinksSectionProps {
  initialLinks: SocialLinks;
}

export function SocialLinksSection({ initialLinks }: SocialLinksSectionProps) {
  const [links, setLinks] = useState<SocialLinks>({ ...initialLinks });
  const [savedLinks, setSavedLinks] = useState<SocialLinks>({ ...initialLinks });
  const [saving, setSaving] = useState(false);

  const hasChanges = SOCIAL_PLATFORMS.some(
    (p) => (links[p.key] ?? "") !== (savedLinks[p.key] ?? "")
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    const { error } = await updateSocialLinks(links);
    setSaving(false);
    if (error) {
      toast.error(error);
    } else {
      setSavedLinks({ ...links });
      toast.success("Social links updated");
    }
  }, [links]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Social Links</CardTitle>
        <CardDescription>
          Add your social accounts. They appear in shareable scripts and on your
          digital business card.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {SOCIAL_PLATFORMS.map((platform) => {
          const Icon = SOCIAL_ICON_MAP[platform.key];
          return (
            <div key={platform.key} className="space-y-1.5">
              <Label
                htmlFor={`social-${platform.key}`}
                className="flex items-center gap-2 text-sm"
              >
                {Icon && <Icon className="size-4 text-muted-foreground" />}
                {platform.label}
              </Label>
              <div className="flex items-center rounded-lg border overflow-hidden bg-background">
                <span className="shrink-0 pl-3 pr-1 text-xs text-muted-foreground">
                  {platform.prefix}
                </span>
                <Input
                  id={`social-${platform.key}`}
                  value={links[platform.key] ?? ""}
                  onChange={(e) =>
                    setLinks((prev) => ({
                      ...prev,
                      [platform.key]: e.target.value.replace(/^@/, ""),
                    }))
                  }
                  placeholder={platform.placeholder}
                  className="border-0 pl-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
          );
        })}

        {hasChanges && (
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Check className="size-4 mr-2" />
            )}
            Save Social Links
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
