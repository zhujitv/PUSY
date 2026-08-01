import { COMMUNITY_MEDIA_BYTES, COMMUNITY_MEDIA_LIMIT, COMMUNITY_MEDIA_TOTAL_BYTES } from "./contracts";

export type CommunityMediaInput = {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  bytes: Buffer;
};

const imagePattern = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

function detectedImageType(bytes: Buffer): CommunityMediaInput["mimeType"] | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

export function parseCommunityMedia(value: unknown): CommunityMediaInput[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > COMMUNITY_MEDIA_LIMIT) {
    throw new Error(`请上传 1 至 ${COMMUNITY_MEDIA_LIMIT} 张图片`);
  }

  const media = value.map((item) => {
    const match = imagePattern.exec(String(item ?? ""));
    if (!match) throw new Error("仅支持 JPG、PNG 或 WebP 图片");
    const bytes = Buffer.from(match[2], "base64");
    if (!bytes.length || bytes.length > COMMUNITY_MEDIA_BYTES) throw new Error("单张图片不能超过 450KB");
    const mimeType = `image/${match[1]}` as CommunityMediaInput["mimeType"];
    if (detectedImageType(bytes) !== mimeType) throw new Error("图片内容与格式不一致");
    return { mimeType, bytes };
  });

  if (media.reduce((total, item) => total + item.bytes.length, 0) > COMMUNITY_MEDIA_TOTAL_BYTES) {
    throw new Error("图片总大小不能超过 1.5MB");
  }
  return media;
}

export function normalizeCommunityPostInput(payload: Record<string, unknown>) {
  const displayName = String(payload.displayName ?? "").trim().replace(/\s+/g, " ").slice(0, 30);
  const title = String(payload.title ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  const body = String(payload.body ?? "").trim().slice(0, 1_500);
  if (displayName.length < 2 || /@|\b1[3-9]\d{9}\b/.test(displayName)) throw new Error("请填写 2 至 30 个字的社区昵称，且不要包含联系方式");
  if (body.length < 10) throw new Error("正文至少需要 10 个字");
  return { displayName, title, body, media: parseCommunityMedia(payload.images) };
}
