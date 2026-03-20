import type { MatrixClient } from "@vector-im/matrix-bot-sdk";

export type MatrixRoomInfo = {
  name?: string;
  canonicalAlias?: string;
  altAliases: string[];
};

const MAX_CACHE_SIZE = 100;

export function createMatrixRoomInfoResolver(client: MatrixClient) {
  const roomInfoCache = new Map<string, MatrixRoomInfo>();
  const cacheKeys: string[] = [];

  const evictOldest = () => {
    if (cacheKeys.length > MAX_CACHE_SIZE) {
      const oldestKey = cacheKeys.shift();
      if (oldestKey) {
        roomInfoCache.delete(oldestKey);
      }
    }
  };

  const getRoomInfo = async (roomId: string): Promise<MatrixRoomInfo> => {
    const cached = roomInfoCache.get(roomId);
    if (cached) {
      return cached;
    }
    let name: string | undefined;
    let canonicalAlias: string | undefined;
    let altAliases: string[] = [];
    const [nameState, aliasState] = await Promise.allSettled([
      client.getRoomStateEvent(roomId, "m.room.name", "").catch(() => null),
      client.getRoomStateEvent(roomId, "m.room.canonical_alias", "").catch(() => null),
    ]);
    if (nameState.status === "fulfilled") {
      name = nameState.value?.name;
    }
    if (aliasState.status === "fulfilled") {
      canonicalAlias = aliasState.value?.alias;
      altAliases = aliasState.value?.alt_aliases ?? [];
    }
    const info = { name, canonicalAlias, altAliases };
    roomInfoCache.set(roomId, info);
    cacheKeys.push(roomId);
    evictOldest();
    return info;
  };

  const getMemberDisplayName = async (roomId: string, userId: string): Promise<string> => {
    try {
      const memberState = await client
        .getRoomStateEvent(roomId, "m.room.member", userId)
        .catch(() => null);
      return memberState?.displayname ?? userId;
    } catch {
      return userId;
    }
  };

  return {
    getRoomInfo,
    getMemberDisplayName,
  };
}
