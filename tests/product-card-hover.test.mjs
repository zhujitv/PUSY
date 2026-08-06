import assert from "node:assert/strict";
import test from "node:test";
import { secondaryProductImage } from "../lib/product-media.ts";
import { readSource as read } from "./helpers/read-source.mjs";

test("selects the first product image that differs from the primary image", () => {
  assert.equal(secondaryProductImage({
    image: "/primary.webp",
    imageAlt: "/fallback.webp",
    images: ["/primary.webp", "/secondary.webp", "/third.webp"],
  }), "/secondary.webp");
});

test("falls back to imageAlt and leaves single-image products unchanged", () => {
  assert.equal(secondaryProductImage({
    image: "/primary.webp",
    imageAlt: "/fallback.webp",
    images: ["/primary.webp"],
  }), "/fallback.webp");
  assert.equal(secondaryProductImage({
    image: "/primary.webp",
    images: ["/primary.webp"],
  }), undefined);
});

test("shares the desktop hover treatment across storefront product cards", async () => {
  const [media, css, homepage, catalog, account, cart] = await Promise.all([
    read("app/components/ProductCardMedia.tsx"),
    read("app/styles/24-product-card-hover.css"),
    read("app/HomeClient.tsx"),
    read("app/components/CatalogClient.tsx"),
    read("app/account/AccountClient.tsx"),
    read("app/cart/page.tsx"),
  ]);

  assert.match(media, /secondaryProductImage\(product\)/);
  assert.match(media, /product-card-media-secondary/);
  assert.match(css, /opacity 250ms cubic-bezier\(\.4, 0, \.2, 1\)/);
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\) and \(min-width: 768px\)/);
  assert.match(css, /\.product-hover-trigger:hover \.product-card-media-secondary/);
  assert.match(css, /@media \(hover: none\), \(pointer: coarse\), \(max-width: 767px\)[\s\S]*display: none/);
  for (const source of [homepage, catalog, account, cart]) {
    assert.match(source, /ProductCardMedia/);
    assert.match(source, /product-hover-trigger/);
  }
});
