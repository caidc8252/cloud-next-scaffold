// Small presentation helpers shared by client components.

/** First letters of the first two words, uppercased. Relative-time labels are
 *  localized via the i18n formatter (useFormatter().relativeTime), not here. */
export function initials(name = ""): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase() || "?"
  );
}
