export type CommunityClientEventType = "post_impression" | "product_click" | "add_to_cart" | "share_poster" | "share_open" | "checkout_started";

export function recordCommunityEvent(eventType: CommunityClientEventType, postId: string, productSlug?: string, stableKey?: string, source?: string) {
  if (typeof window === "undefined") return;
  const storageKey = stableKey ? `pusy-community-event:${stableKey}` : "";
  try { if (storageKey && window.sessionStorage.getItem(storageKey)) return; } catch {}
  const body = JSON.stringify({ eventKey: crypto.randomUUID(), eventType, postId, productSlug, source });
  try { if (storageKey) window.sessionStorage.setItem(storageKey, "pending"); } catch {}
  void fetch("/api/community/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).then((response) => {
    if (!response.ok && storageKey) { try { window.sessionStorage.removeItem(storageKey); } catch {} }
  }).catch(() => {
    if (storageKey) { try { window.sessionStorage.removeItem(storageKey); } catch {} }
  });
}
