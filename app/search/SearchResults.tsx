"use client";
import { CatalogClient } from "../components/CatalogClient";
import { products } from "../data/products";
export function SearchResults({ query }: { query: string }) { const normalized = query.trim().toLowerCase(); const selected = normalized ? products.filter((product) => `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(normalized)) : products; return <CatalogClient initialProducts={selected} searchQuery={normalized || undefined} />; }
