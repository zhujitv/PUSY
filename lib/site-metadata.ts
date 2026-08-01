import type { Metadata } from "next";

export function publicPageMetadata(path: string, title: string, description: string): Metadata {
  const canonical = `https://pusy.cn${path}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical },
  };
}
