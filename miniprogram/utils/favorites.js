const FAVORITES_KEY = "pusy_favorites_v1";

function favoriteIds() {
  const stored = wx.getStorageSync(FAVORITES_KEY);
  return Array.isArray(stored) ? stored.filter((id) => typeof id === "string" && id) : [];
}

function saveFavoriteIds(ids) {
  const unique = Array.from(new Set(ids.filter(Boolean))).slice(0, 100);
  wx.setStorageSync(FAVORITES_KEY, unique);
  return unique;
}

function isFavorite(productId) {
  return favoriteIds().includes(productId);
}

function toggleFavorite(productId) {
  if (!productId) return false;
  const current = favoriteIds();
  const active = !current.includes(productId);
  saveFavoriteIds(active ? [productId, ...current] : current.filter((id) => id !== productId));
  return active;
}

function favoriteProducts(products) {
  const ids = favoriteIds();
  const byId = new Map((products || []).map((product) => [product.id, product]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

module.exports = { FAVORITES_KEY, favoriteIds, favoriteProducts, isFavorite, saveFavoriteIds, toggleFavorite };
