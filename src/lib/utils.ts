import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
