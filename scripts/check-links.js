// Meldt interne href/src in de gebouwde site die naar een niet-bestaand bestand wijzen.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function brokenLinks(root) {
  const broken = [];
  for (const file of fs.readdirSync(root, { recursive: true })) {
    if (!file.endsWith(".html")) continue;
    const pageUrl = "/" + file.split(path.sep).join("/");
    const html = fs.readFileSync(path.join(root, file), "utf8");
    for (const [, ref] of html.matchAll(/(?:href|src)="([^"]*)"/g)) {
      if (/\s/.test(ref)) { broken.push(`${pageUrl} -> ${ref}`); continue; }
      if (/^([a-z]+:|#|\/\/)/i.test(ref)) continue; // extern, mailto:, tel:, ankers
      const target = path.join(root, decodeURIComponent(new URL(ref, "http://x" + pageUrl).pathname));
      const ok = fs.existsSync(target) && (fs.statSync(target).isFile() || fs.existsSync(path.join(target, "index.html")));
      if (!ok) broken.push(`${pageUrl} -> ${ref}`);
    }
  }
  return broken;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const broken = brokenLinks(process.argv[2] ?? "_site");
  for (const b of broken) console.error("BROKEN", b);
  console.log(`${broken.length} broken link(s)`);
  process.exitCode = broken.length ? 1 : 0;
}
