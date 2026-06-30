import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Tool root = one level up from src/. The checked-in table is a fixed asset that
// lives with the tool, so its default location must resolve relative to the tool
// — not to process.cwd(), which varies when the CLI is launched via the bin shim
// from a consumer repo root.
export const TOOL_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const DEFAULT_TABLES_DIR = join(TOOL_ROOT, 'tables')

// Consume-time @cloud/ui cross-check target: this repo's OWN packages/ui/src.
// The tool lives at <repo>/.claude/tools/foundation-map, so the repo root is
// three levels up. Resolved relative to the tool (not cwd) so the bin shim works
// from any directory; override with UI_SRC_DIR.
export const DEFAULT_UI_SRC = join(TOOL_ROOT, '..', '..', '..', 'packages', 'ui', 'src')
