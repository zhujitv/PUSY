const encoder = new TextEncoder();

function bytesToBase64(bytes: Uint8Array) { let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary); }
function base64ToBytes(value: string) { const binary = atob(value); return Uint8Array.from(binary, (char) => char.charCodeAt(0)); }
function pemBytes(pem: string) { return base64ToBytes(pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")); }

export async function rsaSign(content: string, privateKeyPem: string) {
  const key = await crypto.subtle.importKey("pkcs8", pemBytes(privateKeyPem), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  return bytesToBase64(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(content))));
}

export async function rsaVerify(content: string, signature: string, publicKeyPem: string) {
  const key = await crypto.subtle.importKey("spki", pemBytes(publicKeyPem), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, base64ToBytes(signature), encoder.encode(content));
}

export async function sha256(value: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function aesGcmDecrypt(ciphertext: string, nonce: string, associatedData: string, keyValue: string) {
  if (encoder.encode(keyValue).length !== 32) throw new Error("微信支付 APIv3 密钥必须为 32 字节");
  const key = await crypto.subtle.importKey("raw", encoder.encode(keyValue), "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: encoder.encode(nonce), additionalData: encoder.encode(associatedData), tagLength: 128 }, key, base64ToBytes(ciphertext));
  return new TextDecoder().decode(plain);
}

export function secureEqual(a: string, b: string) {
  const left = encoder.encode(a); const right = encoder.encode(b);
  if (left.length !== right.length) return false;
  let diff = 0; for (let index = 0; index < left.length; index++) diff |= left[index] ^ right[index];
  return diff === 0;
}
