import type { MatrixClient } from "@vector-im/matrix-bot-sdk";

export type MatrixRoomInfo = {
  name?: string;
  canonicalAlias?: string;
  altAliases: string[];
};

const MAX_CACHE_SIZE = 100;
const MEMBER_CACHE_TTL_MS = 30_000; // Member display names cache TTL

type MemberCacheEntry = {
  displayName: string;
  ts: number;
};

export function createMatrixRoomInfoResolver(client: MatrixClient) {
  const roomInfoCache = new Map<string, MatrixRoomInfo>();
  const cacheKeys = new Set<string>();

  const evictOldest = () => {
    if (cacheKeys.size > MAX_CACHE_SIZE) {
      // Simple FIFO eviction: pick oldest entry
      const oldestKey = cacheKeys.values().next().value;
      if (oldestKey) {
        cacheKeys.delete(oldestKey);
        roomInfoCache.delete(oldestKey);
      }
    }
  };

  const getRoomInfo = async (roomId: string): Promise<MatrixRoomInfo> => {
    const cached = roomInfoCache.get(roomId);
    if (cached) {
      return cached;
    }

    // Parallel fetch of room name and alias state events
    const [nameState, aliasState] = await Promise.allSettled([
      client.getRoomStateEvent(roomId, "m.room.name", ""),
      client.getRoomStateEvent(roomId, "m.room.canonical_alias", ""),
    ]);

    let name: string | undefined;
    let canonicalAlias: string | undefined;
    let altAliases: string[] = [];

    if (nameState.status === "fulfilled") {
      name = nameState.value?.name;
    }
    if (aliasState.status === "fulfilled") {
      canonicalAlias = aliasState.value?.alias;
      altAliases = aliasState.value?.alt_aliases ?? [];
    }

    const info = { name, canonicalAlias, altAliases };
    roomInfoCache.set(roomId, info);
    cacheKeys.add(roomId);
    evictOldest();
    return info;
  };

  // Member display name cache to avoid redundant API calls
  const memberCache = new Map<string, MemberCacheEntry>();

  const getMemberDisplayName = async (roomId: string, userId: string): Promise<string> => {
    const cacheKey = `${roomId}:${userId}`;
    const now = Date.now();

    // Check cache
    const cached = memberCache.get(cacheKey);
    if (cached && now - cached.ts < MEMBER_CACHE_TTL_MS) {
      return cached.displayName;
    }

    try {
      const memberState = await client.getRoomStateEvent(roomId, "m.room.member", userId);
      const displayName = memberState?.displayname ?? userId;
      memberCache.set(cacheKey, { displayName, ts: now });
      return displayName;
    } catch {
      return userId;
    }
  };

  return {
    getRoomInfo,
    getMemberDisplayName,
  };
}
