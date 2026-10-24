import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { brokenLinks } from "./check-links.js";

test("meldt enkel links waarvan het doel ontbreekt", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "site-"));
  fs.mkdirSync(path.join(root, "tarief"));
  fs.mkdirSync(path.join(root, "images"));
  fs.writeFileSync(path.join(root, "images", "a.jpg"), "");
  fs.writeFileSync(path.join(root, "tarief", "index.html"), "");
  fs.writeFileSync(path.join(root, "index.html"), `
    <a href="/tarief/">ok</a> <a href="/tarief">ok zonder slash</a> <img src="/images/a.jpg">
    <a href="https://example.com">extern</a> <a href="mailto:x@y.be">mail</a> <a href="#content">anker</a>
    <a href="/bestaat-niet/">weg</a> <a href="iemand@gmail.com">mailto vergeten</a>
    <a href="http:// tekst als url">spaties</a> <a href="/wp-admin/post.php?post=91&amp;action=edit">admin</a>`);
  assert.deepEqual(brokenLinks(root), [
    "/index.html -> /bestaat-niet/",
    "/index.html -> iemand@gmail.com",
    "/index.html -> http:// tekst als url",
    "/index.html -> /wp-admin/post.php?post=91&amp;action=edit",
  ]);
});
