const STORAGE_KEY = 'ubw_player_v1';

const defaultState = {
  currentYtId: null,
  currentPosition: 0,
  playlistOrder: [],
  watchedResourceIds: [],
  muted: true,
  shuffled: true,
  updatedAt: 0,
};

export function getYouTubeID(url) {
  if (!url) return null;
  if (url.length === 11 && !url.includes('/') && !url.includes('.')) {
    return url;
  }
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/,
    /youtube\.com\/.*[?&]v=([^&]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m && m[1]) return m[1];
  }
  return null;
}

export function loadState() {
  if (typeof window === 'undefined') return { ...defaultState };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return { ...defaultState };
  }
}

export function saveState(partial) {
  if (typeof window === 'undefined') return;
  try {
    const current = loadState();
    const next = { ...current, ...partial, updatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildPlaylist(videos, { shuffled, previousOrder }) {
  const validIds = videos.map((v) => v.id);
  const validSet = new Set(validIds);

  if (previousOrder && previousOrder.length > 0) {
    const preserved = previousOrder.filter((id) => validSet.has(id));
    const missing = validIds.filter((id) => !preserved.includes(id));
    return [...preserved, ...(shuffled ? shuffle(missing) : missing)];
  }
  return shuffled ? shuffle(validIds) : validIds;
}
