import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { SOCIAL_PLATFORMS, type SocialLinks } from "@/lib/db/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function getProductPurchaseUrl(subdomain: string, productId: string): string {
  return `https://${subdomain}.superpatch.com/products/${productId}-patch`;
}

export function getSocialUrl(platform: string, handle: string): string {
  const entry = SOCIAL_PLATFORMS.find(p => p.key === platform);
  return entry ? `https://${entry.prefix}${handle}` : handle;
}

const SOCIAL_LABELS: Record<string, string> = {
  instagram: 'IG',
  facebook: 'FB',
  tiktok: 'TikTok',
  youtube: 'YT',
  linkedin: 'LinkedIn',
  x: 'X',
};

const NO_AT_PLATFORMS = new Set(['linkedin']);

export function buildSocialFooter(links: SocialLinks): string {
  const priority = ['instagram', 'facebook', 'tiktok', 'x', 'youtube', 'linkedin'];
  const parts: string[] = [];
  for (const key of priority) {
    if (parts.length >= 2) break;
    const handle = links[key as keyof SocialLinks]?.trim();
    if (handle) {
      const prefix = NO_AT_PLATFORMS.has(key) ? '' : '@';
      parts.push(`${SOCIAL_LABELS[key]}: ${prefix}${handle}`);
    }
  }
  if (parts.length === 0) return '';
  return `\n\nConnect with me: ${parts.join(' | ')}`;
}

export async function shareOrCopy(
  text: string,
  title?: string
): Promise<"shared" | "copied" | "failed"> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ text, ...(title && { title }) });
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "failed";
    }
  }
  const copied = await copyToClipboard(text);
  return copied ? "copied" : "failed";
}
