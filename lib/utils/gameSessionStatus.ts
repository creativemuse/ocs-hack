/** True when API session payload indicates the in-memory (or future) lobby state. */
export const isLobbySessionStatus = (session: unknown): boolean => {
  if (!session || typeof session !== 'object') return false;
  const s = session as Record<string, unknown>;
  const st = s.status;
  if (st === 'lobby') return true;
  if (st && typeof st === 'object' && 'tag' in st) {
    const tag = (st as { tag?: string }).tag;
    return tag === 'Lobby' || tag === 'lobby';
  }
  return false;
};
