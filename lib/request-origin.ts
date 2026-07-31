function normalizedHost(value: string | null) {
  return (value ?? "").split(",")[0].trim().toLowerCase().replace(/\.$/, "");
}

function isPusyPublicHost(host: string) {
  return host === "pusy.cn" || host === "www.pusy.cn";
}

export function hasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    if (originUrl.protocol !== "https:" && originUrl.protocol !== "http:") return false;

    const originHost = normalizedHost(originUrl.host);
    const requestHosts = new Set([
      normalizedHost(new URL(request.url).host),
      normalizedHost(request.headers.get("host")),
      normalizedHost(request.headers.get("x-forwarded-host")),
    ].filter(Boolean));

    if (requestHosts.has(originHost)) return true;
    if (isPusyPublicHost(originHost) && [...requestHosts].some(isPusyPublicHost)) return true;

    // Vercel may expose its internal deployment host through request.url while
    // the browser correctly reports the public custom domain as the origin.
    return isPusyPublicHost(originHost)
      && [...requestHosts].some((host) => host.endsWith(".vercel.app"))
      && request.headers.get("sec-fetch-site") === "same-origin";
  } catch {
    return false;
  }
}
