import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";

const DEFAULT_OG_PATH = "/og/lexi-default.jpg";

export type ProductOgInput = {
  title: string;
  description: string;
  /** Absolute or site-relative image URL */
  image?: string | null;
  path: string;
  brand?: string;
};

/** Absolute OG image URL — product hero, else LEXI default card. */
export function resolveOgImageUrl(image?: string | null): string {
  if (image?.startsWith("http://") || image?.startsWith("https://")) return image;
  if (image?.startsWith("/")) return absoluteUrl(image);
  return absoluteUrl(DEFAULT_OG_PATH);
}

export function buildProductMetadata(input: ProductOgInput): Metadata {
  const url = absoluteUrl(input.path);
  const ogImage = resolveOgImageUrl(input.image);
  const brand = input.brand ?? "LEXI";
  const title = input.title;
  const description = input.description;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      siteName: "LEXI",
      type: "website",
      url,
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${brand} · ${title}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export function defaultSiteOgImage(): string {
  return absoluteUrl(DEFAULT_OG_PATH);
}
