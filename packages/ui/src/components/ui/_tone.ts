// Shared semantic-color vocabulary for @cloud/ui.
//
// Two ORTHOGONAL styling dimensions run through the library — keep them apart:
//
//   • `variant` = FORM / emphasis. How the thing is drawn: filled, outline,
//     ghost, soft, link. Lives in each component's cva config.
//   • `tone`    = SEMANTIC STATUS COLOR. What the thing means: neutral, success,
//     warning, error, info. Maps to the semantic color tokens (success-bg/-strong …).
//
// Rule of thumb for new components: status/health/result coloring → expose `tone`,
// not bespoke `variant` values. Reserve `variant` for visual form.
//
// Deliberate exception: components whose form and color are NOT freely
// combinable (e.g. Button does not open arbitrary `ghost × danger` pairs) fold
// the blessed combinations into a single enumerated `variant` (`destructive`,
// `danger`, `ghost-danger`) instead of opening a variant × tone matrix of invalid pairs.
// When you do this, say so in a comment so it reads as a choice, not a slip.
//
// Components subset this union to what they actually support via `Exclude`/`Pick`
// (e.g. Progress has no `neutral` — omitting tone already yields the brand color).

export type Tone = "neutral" | "success" | "warning" | "error" | "info"
