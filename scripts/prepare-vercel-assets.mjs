import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = path.join(projectRoot, "dist", "public");
const publicDirectory = path.join(projectRoot, "public");

const builtIndex = path.join(sourceDirectory, "index.html");
await stat(builtIndex);

await rm(publicDirectory, { recursive: true, force: true });
await mkdir(publicDirectory, { recursive: true });
await cp(sourceDirectory, publicDirectory, { recursive: true });
