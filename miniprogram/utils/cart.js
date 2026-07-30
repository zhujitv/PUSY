const { findProduct } = require("./catalog");
const { refreshCustomTabBar } = require("./tab-bar");

const CART_KEY = "pusy_cart_v1";

function getCart() {
  const stored = wx.getStorageSync(CART_KEY);
  return Array.isArray(stored) ? stored.filter((item) => item && item.productId && item.quantity > 0) : [];
}

function saveCart(cart) {
  wx.setStorageSync(CART_KEY, cart);
  syncCartBadge(cart);
  return cart;
}

function addToCart(productId, quantity = 1) {
  const cart = getCart();
  const product = findProduct(productId);
  const maximum = product.inventoryVerified ? Math.max(0, Number(product.stock || 0)) : 20;
  if (maximum < 1) return cart;
  const existing = cart.find((item) => item.productId === productId);
  if (existing) existing.quantity = Math.min(maximum, existing.quantity + quantity);
  else cart.push({ productId, quantity: Math.min(maximum, quantity) });
  return saveCart(cart);
}

function updateQuantity(productId, quantity) {
  const cart = getCart();
  const item = cart.find((entry) => entry.productId === productId);
  const product = findProduct(productId);
  const maximum = product.inventoryVerified ? Math.max(1, Number(product.stock || 1)) : 20;
  if (item) item.quantity = Math.max(1, Math.min(maximum, quantity));
  return saveCart(cart);
}

function removeFromCart(productId) {
  return saveCart(getCart().filter((item) => item.productId !== productId));
}

function getCartView() {
  const items = getCart().map((item) => {
    const product = findProduct(item.productId);
    return {
      ...item,
      product,
      subtotalFen: product.priceFen * item.quantity,
      subtotalText: formatMoney(product.priceFen * item.quantity),
    };
  });
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalFen = items.reduce((sum, item) => sum + item.subtotalFen, 0);
  return { items, count, totalFen, totalText: formatMoney(totalFen) };
}

function formatMoney(amountFen) {
  const amount = amountFen / 100;
  return `¥${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

function syncCartBadge(cart = getCart()) {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  try {
    if (count > 0) wx.setTabBarBadge({ index: 2, text: String(Math.min(count, 99)) });
    else wx.removeTabBarBadge({ index: 2 });
  } catch (error) {
    // Tab bar may not be ready during the earliest launch phase.
  }
  refreshCustomTabBar();
}

module.exports = {
  addToCart,
  formatMoney,
  getCart,
  getCartView,
  removeFromCart,
  saveCart,
  syncCartBadge,
  updateQuantity,
};
