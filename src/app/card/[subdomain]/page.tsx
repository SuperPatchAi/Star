import { notFound } from "next/navigation";
import { getPublicProfile } from "@/lib/actions/profile";
import { SOCIAL_PLATFORMS } from "@/lib/db/types";
import { products as allProducts } from "@/data/products";
import { BusinessCardDisplay } from "@/components/card/business-card-display";
import type { Metadata } from "next";

interface CardPageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ products?: string }>;
}

function resolveProducts(param: string | undefined) {
  if (!param) return [];
  const ids = param.split(",").map((s) => s.trim()).filter(Boolean);
  return allProducts.filter((p) => ids.includes(p.id));
}

export async function generateMetadata({
  params,
  searchParams,
}: CardPageProps): Promise<Metadata> {
  const { subdomain } = await params;
  const { products: productsParam } = await searchParams;
  const profile = await getPublicProfile(subdomain);
  if (!profile) return { title: "Not Found" };

  const displayName = profile.full_name || subdomain;
  const matchedProducts = resolveProducts(productsParam);
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? "https://star-seven-sigma.vercel.app"
    : "http://localhost:3000";
  const ogProductsSuffix = productsParam ? `?products=${productsParam}` : "";
  const ogImageUrl = `${baseUrl}/api/og/card/${subdomain}${ogProductsSuffix}`;

  const description =
    matchedProducts.length > 0
      ? `${displayName} recommends: ${matchedProducts.map((p) => p.name).join(", ")}. Shop now!`
      : `Connect with ${displayName}, an independent SuperPatch representative.`;

  return {
    title: `${displayName} — SuperPatch Rep`,
    description,
    openGraph: {
      title: `${displayName} — SuperPatch Rep`,
      description,
      type: "profile",
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayName} — SuperPatch Rep`,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function CardPage({ params, searchParams }: CardPageProps) {
  const { subdomain } = await params;
  const { products: productsParam } = await searchParams;
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
  const matchedProducts = resolveProducts(productsParam);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <BusinessCardDisplay
        displayName={displayName}
        initials={initials}
        avatarUrl={profile.avatar_url}
        storeUrl={storeUrl}
        socialEntries={socialEntries}
        socialLinks={profile.social_links}
        {...(matchedProducts.length > 0 && {
          products: matchedProducts,
          storeSubdomain: profile.store_subdomain,
        })}
      />
    </div>
  );
}
