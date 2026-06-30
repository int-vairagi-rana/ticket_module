export function extractFcmTokensFromSessions(sessions: unknown): string[] {
  if (sessions === null || sessions === undefined) return [];

  let list: unknown[] = [];

  if (typeof sessions === "string") {
    try {
      list = JSON.parse(sessions) as unknown[];
    } catch {
      return [];
    }
  } else if (Array.isArray(sessions)) {
    list = sessions;
  } else {
    return [];
  }

  const tokens: string[] = [];
  for (const s of list) {
    if (!s || typeof s !== "object") continue;
    const t = (s as Record<string, unknown>)["fcm_device_token"];
    if (typeof t === "string") {
      const trimmed = t.trim();
      if (trimmed.length > 0) tokens.push(trimmed);
    }
  }

  return Array.from(new Set(tokens));
}