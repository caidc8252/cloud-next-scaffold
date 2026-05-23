import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const dbPackageRoot = join(repoRoot, "packages", "db");
const envPath = join(repoRoot, ".env");

if (existsSync(envPath)) {
  loadEnv({ path: envPath });
}

const prismaArgs = process.argv.slice(2);
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const childEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry) => typeof entry[1] === "string")
);

const child = spawn(pnpmCommand, ["exec", "prisma", ...prismaArgs], {
  cwd: dbPackageRoot,
  env: childEnv,
  stdio: "inherit",
  shell: process.platform === "win32"
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
