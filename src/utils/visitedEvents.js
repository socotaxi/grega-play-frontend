const VISITED_KEY = 'gp_visited_events_v1';

const safeParseJson = (raw, fallback) => {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const loadVisited = () => {
  const arr = safeParseJson(localStorage.getItem(VISITED_KEY), []);
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((x) => x && (x.public_code || x.event_id))
    .map((x) => ({
      event_id: x.event_id || null,
      public_code: x.public_code || null,
      title: x.title || 'Événement',
      theme: x.theme || '',
      visited_at: x.visited_at || null,
      cover_url: x.cover_url || null,
    }))
    .slice(0, 20);
};

export const saveVisited = (arr) => {
  try {
    localStorage.setItem(VISITED_KEY, JSON.stringify(arr.slice(0, 20)));
  } catch {
    // ignore
  }
};

export const removeVisitedByKey = (arr, item) => {
  const key = item.event_id ? `id:${item.event_id}` : `code:${item.public_code}`;
  return arr.filter((x) => {
    const k = x.event_id ? `id:${x.event_id}` : `code:${x.public_code}`;
    return k !== key;
  });
};
