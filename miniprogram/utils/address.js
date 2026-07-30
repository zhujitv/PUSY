const ADDRESS_KEY = "pusy_default_address_v1";
const config = require("../config/index");
const { request } = require("./request");
const { currentSession, refreshAccount } = require("./session");
const phonePattern = /^1[3-9]\d{9}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emptyAddress() {
  return { recipient: "", phone: "", email: "", province: "", city: "", district: "", detail: "", postcode: "" };
}

function getAddress() {
  const stored = wx.getStorageSync(ADDRESS_KEY);
  return stored && stored.recipient ? { ...emptyAddress(), ...stored } : null;
}

function addressText(address) {
  if (!address) return "";
  return [address.province, address.city, address.district, address.detail, address.postcode].filter(Boolean).join(" ");
}

function saveAddress(input) {
  const address = {
    recipient: String(input.recipient || "").trim().slice(0, 50),
    phone: String(input.phone || "").replace(/\s|-/g, ""),
    email: String(input.email || "").trim().toLowerCase().slice(0, 120),
    province: String(input.province || "").trim().slice(0, 30),
    city: String(input.city || "").trim().slice(0, 30),
    district: String(input.district || "").trim().slice(0, 30),
    detail: String(input.detail || "").trim().slice(0, 160),
    postcode: String(input.postcode || "").trim().slice(0, 12),
  };
  if (!address.recipient) throw new Error("请填写收货人姓名");
  if (!phonePattern.test(address.phone)) throw new Error("请填写有效的中国大陆手机号");
  if (!emailPattern.test(address.email)) throw new Error("请填写用于接收订单通知的邮箱");
  if (!address.province || !address.city || !address.detail) throw new Error("请填写完整收货地址");
  wx.setStorageSync(ADDRESS_KEY, address);
  return address;
}

function memberAddress(address, email = "") {
  if (!address) return null;
  return {
    ...emptyAddress(),
    id: address.id,
    recipient: address.recipient || "",
    phone: address.phone || "",
    email: email || address.email || "",
    province: address.province || "",
    city: address.city || "",
    district: address.district || "",
    detail: address.detail || "",
    postcode: address.postcode || "",
    isDefault: Boolean(address.is_default || address.isDefault),
  };
}

async function syncMemberAddress() {
  const session = currentSession();
  if (config.previewMode || !session || session.preview) return getAddress();
  const account = await refreshAccount();
  const remote = (account.addresses || []).find((item) => item.is_default) || (account.addresses || [])[0];
  if (!remote) return getAddress();
  const address = memberAddress(remote, (account.member || {}).email || (getAddress() || {}).email);
  wx.setStorageSync(ADDRESS_KEY, address);
  return address;
}

async function saveMemberAddress(input) {
  const address = saveAddress(input);
  const session = currentSession();
  if (config.previewMode || !session || session.preview) return address;
  const response = await request("/api/miniprogram/addresses", { method: "POST", data: address });
  const saved = memberAddress(response.address, address.email);
  wx.setStorageSync(ADDRESS_KEY, saved);
  await refreshAccount();
  return saved;
}

module.exports = { addressText, emptyAddress, getAddress, saveAddress, saveMemberAddress, syncMemberAddress };
