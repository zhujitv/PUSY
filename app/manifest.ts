import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PÚSY 中国官方网站",
    short_name: "PÚSY",
    description: "PÚSY 中国官方网站｜彩妆与护肤",
    start_url: "/",
    display: "standalone",
    background_color: "#fff7fb",
    theme_color: "#ef398b",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
