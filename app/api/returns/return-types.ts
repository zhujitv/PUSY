export type OrderRow = {
  id: string;
  member_id: number | null;
  customer: string;
  email: string;
  phone: string;
  total: number;
  delivery: string;
  status: string;
  created_at: string;
  shipment_status: string | null;
  delivered_at: string | null;
  existing_return_id: string | null;
};

export type ItemRow = { id: number; order_id: string; product_slug: string; product_name: string; quantity: number; unit_price: number };
export type LookupIdentity = { memberId: number | null; email: string; grantId: string | null };
