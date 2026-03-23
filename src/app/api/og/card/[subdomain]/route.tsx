import { ImageResponse } from "next/og";
import { getPublicProfile } from "@/lib/actions/profile";
import { SOCIAL_PLATFORMS } from "@/lib/db/types";
import { getSocialUrl } from "@/lib/utils";
import { products as allProductsData } from "@/data/products";

export const runtime = "edge";

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "IG",
  facebook: "FB",
  tiktok: "TikTok",
  youtube: "YT",
  linkedin: "LinkedIn",
  x: "X",
};

async function fetchImageAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/png";
    const base64 = Buffer.from(buf).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

function resolveProducts(param: string | undefined) {
  if (!param) return [];
  const ids = param.split(",").map((s) => s.trim()).filter(Boolean);
  return allProductsData.filter((p) => ids.includes(p.id)).slice(0, 4);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const profile = await getPublicProfile(subdomain);

  if (!profile) {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(req.url);
  const productsParam = url.searchParams.get("products") ?? undefined;
  const matchedProducts = resolveProducts(productsParam);
  const hasProducts = matchedProducts.length > 0;

  const displayName = profile.full_name || subdomain;
  const initials =
    profile.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? subdomain[0]?.toUpperCase() ?? "S";

  const avatarDataUri = profile.avatar_url
    ? await fetchImageAsDataUri(profile.avatar_url.split("?")[0])
    : null;

  const socialEntries = SOCIAL_PLATFORMS.filter(
    (p) => profile.social_links[p.key]?.trim()
  ).slice(0, 4);

  let interFont: ArrayBuffer | undefined;
  try {
    const fontRes = await fetch(
      "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiA.woff2"
    );
    interFont = await fontRes.arrayBuffer();
  } catch {
    // Falls back to Satori default font
  }

  const img = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: hasProducts ? 540 : 460,
            background: "white",
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          }}
        >
          <div
            style={{
              width: "100%",
              height: 100,
              background: "linear-gradient(90deg, #1a73e8 0%, #1557b0 100%)",
              display: "flex",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 120,
              height: 120,
              borderRadius: "50%",
              marginTop: -60,
              border: "5px solid white",
              overflow: "hidden",
              background: avatarDataUri ? "white" : "#dbeafe",
            }}
          >
            {avatarDataUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarDataUri}
                alt=""
                width={120}
                height={120}
                style={{ objectFit: "cover", width: 120, height: 120 }}
              />
            ) : (
              <span
                style={{
                  fontSize: 44,
                  fontWeight: 700,
                  color: "#1a73e8",
                }}
              >
                {initials}
              </span>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "16px 32px 28px",
            }}
          >
            <span
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              {displayName}
            </span>
            <span
              style={{
                fontSize: 15,
                color: "#64748b",
                marginTop: 6,
              }}
            >
              Independent SuperPatch Representative
            </span>

            {hasProducts ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  marginTop: 20,
                  width: "100%",
                }}
              >
                <span style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
                  Recommended products:
                </span>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    justifyContent: "center",
                    width: "100%",
                  }}
                >
                  {matchedProducts.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: "#f8fafc",
                        borderRadius: 12,
                        padding: "8px 14px",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: p.color,
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>
                          {p.name[0]}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                          {p.name}
                        </span>
                        <span style={{ fontSize: 11, color: "#64748b" }}>
                          {p.tagline}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {socialEntries.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      marginTop: 24,
                      flexWrap: "wrap",
                      justifyContent: "center",
                    }}
                  >
                    {socialEntries.map((p) => {
                      const handle = profile.social_links[p.key]!;
                      const label = SOCIAL_LABELS[p.key] || p.label;
                      return (
                        <div
                          key={p.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 13,
                            color: "#475569",
                            background: "#f1f5f9",
                            borderRadius: 8,
                            padding: "6px 12px",
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{label}</span>
                          <span style={{ color: "#94a3b8" }}>
                            {getSocialUrl(p.key, handle).replace(/^https?:\/\//, "")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 24,
                    background: "#1a73e8",
                    color: "white",
                    borderRadius: 12,
                    padding: "12px 28px",
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  {profile.store_subdomain}.superpatch.com
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      ...(interFont && {
        fonts: [
          {
            name: "Inter",
            data: interFont,
            style: "normal" as const,
            weight: 400 as const,
          },
        ],
      }),
    }
  );

  img.headers.set(
    "Cache-Control",
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
  );

  return img;
}
