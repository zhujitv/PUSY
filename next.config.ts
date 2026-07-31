import type { NextConfig } from "next";

const developmentScriptPolicy = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "avatars.mds.yandex.net", pathname: "/get-yastore/**" }],
  },
  async headers() {
    const securityHeaders = [
      { key: "Content-Security-Policy", value: `default-src 'self'; base-uri 'self'; form-action 'self' https://openapi.alipay.com https://mapi.alipay.com; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'${developmentScriptPolicy}; script-src-attr 'none'; connect-src 'self'; frame-src https://runtime.strm.yandex.ru; worker-src 'self' blob:; upgrade-insecure-requests` },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ];
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/products/yandex/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/assets/hero-clean-v2-42a264aa.webp",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  async redirects() {
    const productReplacements = {
      "maslo-dlya-gub-black-chernyiy-100710": "maslo-dlya-gub-black-chernyiy-100779",
      "maslo-dlya-gub-red-krasnyiy-100711": "maslo-dlya-gub-red-krasnyiy-100784",
      "maslo-dlya-gub-chocolate-shokoladnyiy-100707": "maslo-dlya-gub-chocolate-shokoladnyiy-100782",
      "maslo-dlya-gub-crystal-prozrachnyiy-100709": "maslo-dlya-gub-crystal-prozrachnyiy-100780",
      "maslo-dlya-gub-apricot-abrikosovyiy-100708": "maslo-dlya-gub-apricot-1-100778",
      "maslo-dlya-gub-purple-1-100706": "maslo-dlya-gub-purple-rozovyiy-100781",
    };
    return Object.entries(productReplacements).map(([source, destination]) => ({
      source: `/products/${source}`,
      destination: `/products/${destination}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
