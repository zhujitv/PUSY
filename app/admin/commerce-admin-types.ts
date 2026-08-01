export type AdminReview = { id: number; product_slug: string; reviewer_name: string; rating: number; title: string; body: string; verified_purchase: number; images_json?: string; status: string; created_at: string };
export type SiteContent = Record<string, string>;
export type ContentRevision = { id: string; title: string; snapshot_json?: string; status: string; publish_at?: string; published_at?: string; created_by: string; created_at: string; updated_at: string };
