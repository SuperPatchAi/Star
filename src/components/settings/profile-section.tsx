"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Loader2, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { updateProfile, uploadAvatar, updateStoreSubdomain } from "@/lib/actions/profile";
import { ShareCopyButton } from "@/components/ui/share-copy-button";
import type { UserProfile } from "@/lib/db/types";

interface ProfileSectionProps {
  profile: UserProfile | null;
  email: string;
}

export function ProfileSection({ profile, email }: ProfileSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameChanged, setNameChanged] = useState(false);
  const [subdomain, setSubdomain] = useState(profile?.store_subdomain ?? "");
  const [savingSubdomain, setSavingSubdomain] = useState(false);
  const [subdomainChanged, setSubdomainChanged] = useState(false);

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? email[0]?.toUpperCase() ?? "U";

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);

    const { url, error } = await uploadAvatar(formData);
    setUploading(false);

    if (error) {
      toast.error(error);
    } else if (url) {
      setAvatarUrl(url);
      toast.success("Photo updated");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleSaveName = useCallback(async () => {
    setSavingName(true);
    const { error } = await updateProfile({ full_name: fullName });
    setSavingName(false);
    if (error) {
      toast.error(error);
    } else {
      setNameChanged(false);
      toast.success("Name updated");
    }
  }, [fullName]);

  const handleSaveSubdomain = useCallback(async () => {
    const cleaned = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!cleaned) return;
    setSavingSubdomain(true);
    const { error } = await updateStoreSubdomain(cleaned);
    setSavingSubdomain(false);
    if (error) {
      toast.error(error);
    } else {
      setSubdomain(cleaned);
      setSubdomainChanged(false);
      toast.success("Store URL updated");
    }
  }, [subdomain]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your personal information and store link.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleAvatarClick}
            className="relative group"
            disabled={uploading}
          >
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl || undefined} alt={fullName || "Avatar"} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? (
                <Loader2 className="size-5 text-white animate-spin" />
              ) : (
                <Camera className="size-5 text-white" />
              )}
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Profile Photo</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              JPEG, PNG, WebP, or GIF. Max 2MB.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-8 text-xs"
              onClick={handleAvatarClick}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Change Photo"}
            </Button>
          </div>
        </div>

        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="full-name">Full Name</Label>
          <div className="flex gap-2">
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setNameChanged(e.target.value !== (profile?.full_name ?? ""));
              }}
              placeholder="Your name"
            />
            {nameChanged && (
              <Button
                size="sm"
                onClick={handleSaveName}
                disabled={savingName}
                className="shrink-0"
              >
                {savingName ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Email (read-only) */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={email}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Managed by your authentication provider.
          </p>
        </div>

        {/* Store URL */}
        <div className="space-y-2">
          <Label htmlFor="store-url">SuperPatch Store URL</Label>
          <div className="flex gap-2">
            <div className="flex flex-1 items-center rounded-lg border overflow-hidden bg-background">
              <Input
                id="store-url"
                type="text"
                autoComplete="url"
                placeholder="yourname"
                value={subdomain}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                  setSubdomain(val);
                  setSubdomainChanged(val !== (profile?.store_subdomain ?? ""));
                }}
                className="flex-1 border-0 text-right pr-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <span className="shrink-0 px-2 text-sm text-muted-foreground">
                .superpatch.com
              </span>
            </div>
            {subdomainChanged && (
              <Button
                size="sm"
                onClick={handleSaveSubdomain}
                disabled={savingSubdomain || !subdomain.trim()}
                className="shrink-0"
              >
                {savingSubdomain ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Used to generate purchase links in the sales flow.
          </p>
        </div>

        {/* My Links Card */}
        {subdomain && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <Label>My Links Card</Label>
            <p className="text-xs text-muted-foreground">
              Share your digital business card with prospects and customers.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted rounded-md px-3 py-2 truncate">
                {`https://star-seven-sigma.vercel.app/card/${subdomain}`}
              </code>
              <ShareCopyButton
                text={`https://star-seven-sigma.vercel.app/card/${subdomain}`}
                title="My SuperPatch Card"
                className="size-9 min-h-[44px] min-w-[44px] shrink-0"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
