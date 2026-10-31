// Fails the production build if the emitted CSS lacks Tailwind utilities.
// A missing PostCSS setup once shipped a completely unstyled site while every
// dev-server test passed, so this guards the build itself (locally and on Vercel).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), ".next", "static");
const REQUIRED = [".flex{", ".min-h-screen{", ".rounded-3xl{"];

function cssFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return cssFiles(path);
    return path.endsWith(".css") ? [path] : [];
  });
}

let css = "";
try {
  css = cssFiles(root).map((file) => readFileSync(file, "utf8")).join("\n");
} catch {
  console.error(`check-build-css: no build output found under ${root}`);
  process.exit(1);
}

const missing = REQUIRED.filter((selector) => !css.includes(selector));
if (missing.length > 0) {
  console.error(`check-build-css: Tailwind utilities missing from the production CSS: ${missing.join(", ")}`);
  console.error("check-build-css: is postcss.config.mjs present with @tailwindcss/postcss?");
  process.exit(1);
}
console.log("check-build-css: Tailwind utilities present in production CSS.");
