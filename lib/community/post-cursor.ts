export type CommunityPostSort = "featured" | "latest" | "popular";

export type CommunityPostCursor = {
  version: 1;
  sort: CommunityPostSort;
  placement: number;
  followsAuthor: number;
  followsTopic: number;
  interestScore?: number;
  promotionRank: number;
  commentCount: number;
  likeCount: number;
  bookmarkCount: number;
  time: string;
  id: string;
};

const postIdPattern = /^PST-[A-Z0-9]{12}$/;

function integer(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function validCursor(value: unknown): value is CommunityPostCursor {
  if (!value || typeof value !== "object") return false;
  const cursor = value as Partial<CommunityPostCursor>;
  return cursor.version === 1
    && (cursor.sort === "featured" || cursor.sort === "latest" || cursor.sort === "popular")
    && integer(cursor.placement)
    && integer(cursor.followsAuthor)
    && integer(cursor.followsTopic)
    && (cursor.interestScore === undefined || integer(cursor.interestScore))
    && integer(cursor.promotionRank)
    && integer(cursor.commentCount)
    && integer(cursor.likeCount)
    && integer(cursor.bookmarkCount)
    && typeof cursor.time === "string"
    && Number.isFinite(Date.parse(cursor.time))
    && typeof cursor.id === "string"
    && postIdPattern.test(cursor.id);
}

export function encodeCommunityPostCursor(cursor: CommunityPostCursor) {
  if (!validCursor(cursor)) throw new Error("社区分页游标无效");
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCommunityPostCursor(value: string | undefined, sort: CommunityPostSort) {
  if (!value || value.length > 600 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    return validCursor(parsed) && parsed.sort === sort ? parsed : null;
  } catch {
    return null;
  }
}
