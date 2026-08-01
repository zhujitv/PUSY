const encoder = new TextEncoder();
const ITERATIONS = 310_000;

function base64Url(value: Uint8Array) {
  return Buffer.from(value).toString("base64url");
}

function equal(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function derive(value: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(value), "PBKDF2", false, ["deriveBits"]);
  const saltBuffer = new ArrayBuffer(salt.byteLength);
  new Uint8Array(saltBuffer).set(salt);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: saltBuffer, iterations: ITERATIONS }, material, 256);
  return base64Url(new Uint8Array(bits));
}

export function validLoginPassword(value: string) {
  return value.length >= 10 && value.length <= 72 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export function validPaymentPassword(value: string) {
  if (!/^\d{6}$/.test(value) || /^(\d)\1{5}$/.test(value)) return false;
  const digits = [...value].map(Number);
  const step = digits[1] - digits[0];
  return !((step === 1 || step === -1) && digits.slice(1).every((digit, index) => digit - digits[index] === step));
}

export async function createMemberSecret(value: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { hash: await derive(value, salt), salt: base64Url(salt) };
}

export async function verifyMemberSecret(value: string, hash: string | null | undefined, salt: string | null | undefined) {
  if (!hash || !salt) return false;
  try {
    return equal(await derive(value, new Uint8Array(Buffer.from(salt, "base64url"))), hash);
  } catch {
    return false;
  }
}
