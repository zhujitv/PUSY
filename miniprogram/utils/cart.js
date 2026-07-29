const { findProduct } = require("../data/products");

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
  const existing = cart.find((item) => item.productId === productId);
  if (existing) existing.quantity += quantity;
  else cart.push({ productId, quantity });
  return saveCart(cart);
}

function updateQuantity(productId, quantity) {
  const cart = getCart();
  const item = cart.find((entry) => entry.productId === productId);
  if (item) item.quantity = Math.max(1, quantity);
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
