export function createGiftCardCode() {
  const token = crypto.randomUUID().replaceAll("-", "").toUpperCase();
  return `PUSY-${token.match(/.{4}/g)!.join("-")}`;
}
