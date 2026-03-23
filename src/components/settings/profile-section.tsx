"use client";

import { useState, useRef, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Camera, Loader2, Check, ZoomIn, ZoomOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

const AVATAR_SIZE = 512;

function cropAndResize(imageSrc: string, crop: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));

      ctx.drawImage(
        img,
        crop.x, crop.y, crop.width, crop.height,
        0, 0, AVATAR_SIZE, AVATAR_SIZE,
      );
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Failed to process image"))),
        "image/webp",
        0.85,
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageSrc;
  });
}

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

  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? email[0]?.toUpperCase() ?? "U";

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setCropPos({ x: 0, y: 0 });
    setCropZoom(1);
    setCroppedArea(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedArea(croppedPixels);
  }, []);

  const handleCropCancel = useCallback(() => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }, [cropSrc]);

  const handleCropSave = useCallback(async () => {
    if (!cropSrc || !croppedArea) return;

    setUploading(true);
    setCropSrc(null);
    try {
      const processed = await cropAndResize(cropSrc, croppedArea);
      URL.revokeObjectURL(cropSrc);
      const formData = new FormData();
      formData.append("avatar", new File([processed], "avatar.webp", { type: "image/webp" }));

      const { url, error } = await uploadAvatar(formData);
      if (error) {
        toast.error(error);
      } else if (url) {
        setAvatarUrl(url);
        toast.success("Photo updated");
      }
    } catch {
      toast.error("Failed to process image");
    } finally {
      setUploading(false);
    }
  }, [cropSrc, croppedArea]);

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

      <Dialog open={!!cropSrc} onOpenChange={(open) => { if (!open) handleCropCancel(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Photo</DialogTitle>
          </DialogHeader>
          <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black">
            {cropSrc && (
              <Cropper
                image={cropSrc}
                crop={cropPos}
                zoom={cropZoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCropPos}
                onZoomChange={setCropZoom}
                onCropComplete={handleCropComplete}
              />
            )}
          </div>
          <div className="flex items-center gap-3 px-1">
            <ZoomOut className="size-4 text-muted-foreground shrink-0" />
            <Slider
              min={1}
              max={3}
              step={0.05}
              value={[cropZoom]}
              onValueChange={([v]) => setCropZoom(v)}
              className="flex-1"
            />
            <ZoomIn className="size-4 text-muted-foreground shrink-0" />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCropCancel}>
              Cancel
            </Button>
            <Button onClick={handleCropSave} disabled={uploading}>
              {uploading ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              Save Photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
