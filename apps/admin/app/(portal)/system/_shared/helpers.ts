// 相对时间，过去 / 未来对称：过去 "Xd ago"，未来 "in Xd"（如邀请过期时间在未来）。
// 30 天外回退绝对日期。注意：早先只算过去，未来时间会因 diff 为负命中 "just now"。
export function relTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(ms);
  const phrase = (n: number, unit: string) => (ms >= 0 ? `in ${n}${unit}` : `${n}${unit} ago`);
  if (abs < 60_000) return "just now";
  if (abs < 3_600_000) return phrase(Math.floor(abs / 60_000), "m");
  if (abs < 86_400_000) return phrase(Math.floor(abs / 3_600_000), "h");
  if (abs < 30 * 86_400_000) return phrase(Math.floor(abs / 86_400_000), "d");
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDateTime(iso: string | number): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const HUES = [210, 260, 330, 30, 150, 180];

export function hueFor(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return HUES[Math.abs(hash) % HUES.length];
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
