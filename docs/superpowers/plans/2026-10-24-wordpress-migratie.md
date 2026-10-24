# Migratie WordPress → Eleventy + GitHub Pages — Implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** creatievetherapieantwerpen.be als statische Eleventy-site in deze repo, identiek aan de WordPress-site, met de beslist fase 2-fixes, gepubliceerd via GitHub Pages.

**Architecture:** Inhoud als Markdown in `content/` (eenmalig gemigreerd uit de WordPress REST API met turndown). Eén Nunjucks-shell (`_includes/layout.njk`) reproduceert de Twenty Seventeen-markup zodat de originele thema-CSS/JS ongewijzigd werkt. Een linkcheck-script zonder dependencies bewaakt interne links in CI.

**Tech Stack:** Node 22, Eleventy 3 (`@11ty/eleventy@3`), Nunjucks, markdown-it (ingebouwd in Eleventy), turndown 7 (alleen in het eenmalige migratiescript, niet in de repo), GitHub Actions + GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-24-wordpress-migratie-design.md`

## Global Constraints

- Repo-root: `C:/git/ArdonToonstra/creatievetherapieantwerpen`. Remote: `https://github.com/esthertherapie-dotcom/creatievetherapie-website.git`, branch `main`.
- Scratchpad (migratiescripts, niet in de repo): `SCRATCH=C:/Users/Ardon/AppData/Local/Temp/claude/c--git-ArdonToonstra-creatievetherapieantwerpen/d4231ed1-adf5-4ee7-955a-23ed1548f178/scratchpad`
- Bronsite: `http://creatievetherapieantwerpen.be` (alleen http).
- Enige repo-dependency: `@11ty/eleventy` (devDependency). Scripts in de repo gebruiken alleen Node-stdlib.
- Fase 1: alle 27 pagina's + 1 bericht, elke URL identiek aan nu. Thema-CSS/JS ongewijzigd.
- Afwijkingen in fase 1 (spec): geen "Proudly powered by WordPress", geen byline "by admin", geen `srcset`, geen feeds/reacties/zoeken/archieven/emoji/wp-embed.
- Commitberichten eindigen met `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Niets pushen vóór Task 7.

## Review Focus

- Hoofdlettergevoelige bestandsnamen: lokaal (Windows) werkt `/images/2026/05/julie.jpg` ook als het bestand `Julie.jpg` heet, op GitHub Pages (Linux) niet → linkcheck draait in CI op Linux (Task 7, stap 2).
- Behouden HTML-blokken (galerij, figuur, citaat) met een lege regel erin breken in Markdown → turndown `keepReplacement` haalt lege regels weg; `verify.mjs` vergelijkt tekst en aantal `<img>` per pagina (Task 3, stap 6).
- Titels met `:`, `’` of `&` in front matter → titels worden als JSON-string geschreven; `<title>` van `/themas-hulpvragen/` en het bericht wordt gecontroleerd (Task 3, stap 7).
- WordPress-tekst met `{{` of `{%` zou als template uitgevoerd worden → `markdownTemplateEngine: false` (Task 1); tekstvergelijking in Task 3 vangt afwijkingen.
- Mobiel menu en submenu's werken alleen met jQuery vóór de thema-JS en de SVG-sprite in de pagina → controle op scriptvolgorde en `id="icon-bars"` (Task 3, stap 7) en visueel op smalle breedte (Task 3, stap 9).

---

### Task 1: Eleventy-skelet en linkcheck

**Files:**
- Create: `package.json`, `eleventy.config.js`, `scripts/check-links.js`, `scripts/check-links.test.js`

**Interfaces:**
- Produces: `brokenLinks(root: string): string[]` uit `scripts/check-links.js` — elk item `"<pagina-url> -> <href/src>"`. CLI: `node scripts/check-links.js [_site]`, exit 1 bij kapotte links.
- Produces: Eleventy-filter `longDate(date: Date): string`; globale data `layout = "page.njk"`, `bodyClass = "page-template-default page page-two-column"`.
- Produces: npm-scripts `start`, `build`, `check`, `test`.

- [ ] **Step 1: Schrijf de falende test**

`scripts/check-links.test.js`:

```js
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
```

- [ ] **Step 2: Draai de test, verwacht falen**

Run: `cd C:/git/ArdonToonstra/creatievetherapieantwerpen && node --test scripts/check-links.test.js`
Expected: FAIL met `Cannot find module` / `ERR_MODULE_NOT_FOUND` voor `check-links.js`.

- [ ] **Step 3: Schrijf de linkcheck**

`scripts/check-links.js`:

```js
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
```

- [ ] **Step 4: Draai de test, verwacht slagen**

Run: `node --test scripts/check-links.test.js`
Expected: `# pass 1`, `# fail 0`.

- [ ] **Step 5: package.json en Eleventy installeren**

`package.json`:

```json
{
  "name": "creatievetherapie-website",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "eleventy --serve",
    "build": "eleventy",
    "check": "node scripts/check-links.js _site",
    "test": "node --test scripts/check-links.test.js"
  }
}
```

Run: `npm install --save-dev @11ty/eleventy@3`
Expected: `package.json` krijgt `devDependencies["@11ty/eleventy"]`, `package-lock.json` ontstaat.

- [ ] **Step 6: Eleventy-config**

`eleventy.config.js`:

```js
export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("content/images");
  eleventyConfig.addGlobalData("layout", "page.njk");
  eleventyConfig.addGlobalData("bodyClass", "page-template-default page page-two-column");
  eleventyConfig.addFilter("longDate", (d) =>
    d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }));
  return {
    dir: { input: "content", includes: "../_includes", output: "_site" },
    markdownTemplateEngine: false, // WordPress-tekst nooit als template uitvoeren
  };
}
```

- [ ] **Step 7: Build draait**

Run: `npm test && npm run build`
Expected: test slaagt; Eleventy eindigt zonder fout (0 bestanden geschreven is ok: `content/` bestaat nog niet of is leeg).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json eleventy.config.js scripts/
git commit -m "Eleventy-skelet en linkcheck

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Eenmalige migratie uit WordPress

**Files:**
- Create (scratchpad, niet in repo): `$SCRATCH/migrate/migrate.mjs`
- Generated in repo: `content/*.md` (27), `content/nieuws/2026-09-16-nieuw-nieuwe-dramatherapeut-esther-de-clercq.md`, `content/images/**`, `_includes/menu.html`, `_includes/svg-icons.svg`, `assets/css/{style,blocks,block-library,block-library-theme}.css`, `assets/fonts/font-libre-franklin.css`, `assets/fonts/libre-franklin/*`, `assets/js/{jquery,jquery-migrate.min,global,navigation,jquery.scrollTo}.js`

**Interfaces:**
- Produces: Markdown-bestanden met front matter `title` (JSON-string), `permalink` (oud URL-pad); bericht ook `date: JJJJ-MM-DD`. Interne links relatief (`/tarief/`), afbeeldingen als `/images/JJJJ/MM/bestand`.
- Produces: `_includes/menu.html` = `<ul id="top-menu" class="menu">…</ul>` met `<li class="menu-item[ menu-item-has-children]">`.
- Produces: `_includes/svg-icons.svg` = de verborgen sprite-`<svg>` met o.a. `#icon-bars`, `#icon-close`, `#icon-angle-down`, `#icon-arrow-right`, `#icon-quote-right`.
- Produces: assetpaden zoals hierboven, gebruikt door `layout.njk` (Task 3).

- [ ] **Step 1: Turndown installeren in de scratchpad**

```bash
mkdir -p "$SCRATCH/migrate" && cd "$SCRATCH/migrate" && npm init -y >/dev/null && npm install turndown@7
```

Expected: `added N packages`.

- [ ] **Step 2: Schrijf het migratiescript**

`$SCRATCH/migrate/migrate.mjs`:

```js
// Eenmalige migratie: WordPress (REST API + gerenderde HTML) -> Eleventy-repo.
// Gebruik: node migrate.mjs <repo-root>
import fs from "node:fs/promises";
import path from "node:path";
import TurndownService from "turndown";

const SITE = "http://creatievetherapieantwerpen.be";
const ROOT = process.argv[2];
if (!ROOT) throw new Error("Gebruik: node migrate.mjs <repo-root>");

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res;
}
async function save(rel, data) {
  const file = path.join(ROOT, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
}
const download = async (url, rel) => save(rel, Buffer.from(await (await get(url)).arrayBuffer()));
const decode = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(n)).replace(/&amp;/g, "&");

const images = new Set(["2026/01/27-1.jpg"]); // headerfoto
function localize(html) {
  return html
    .replace(/\s(?:srcset|sizes|data-id|data-link)="[^"]*"/g, "")
    .replace(/https?:\/\/creatievetherapieantwerpen\.be\/wp-content\/uploads\/([^"'\s)]+)/g, (_, p) => (images.add(p), `/images/${p}`))
    .replace(/https?:\/\/creatievetherapieantwerpen\.be\/?/g, "/");
}

const td = new TurndownService({
  headingStyle: "atx", bulletListMarker: "-", emDelimiter: "_", strongDelimiter: "**",
  // Behouden HTML-blokken zonder lege regels, anders breekt Markdown ze af.
  keepReplacement: (content, node) => node.isBlock ? "\n\n" + node.outerHTML.replace(/\n\s*\n/g, "\n") + "\n\n" : node.outerHTML,
});
// Wat niet zuiver naar Markdown gaat blijft HTML (galerij, figuur, citaatblok, uitlijning).
td.keep((n) => n.nodeName === "FIGURE" || n.hasAttribute("style") || /\bwp-block-/.test(n.getAttribute("class") || ""));
const toMd = (html) => td.turndown(localize(html));

for (const p of await (await get(`${SITE}/wp-json/wp/v2/pages?per_page=100`)).json()) {
  const fm = `---\ntitle: ${JSON.stringify(decode(p.title.rendered))}\npermalink: ${new URL(p.link).pathname}\n---\n`;
  await save(`content/${p.slug}.md`, `${fm}\n${toMd(p.content.rendered)}\n`);
}
for (const p of await (await get(`${SITE}/wp-json/wp/v2/posts?per_page=100`)).json()) {
  const date = p.date.slice(0, 10);
  const fm = `---\ntitle: ${JSON.stringify(decode(p.title.rendered))}\ndate: ${date}\npermalink: ${new URL(p.link).pathname}\n---\n`;
  await save(`content/nieuws/${date}-${p.slug}.md`, `${fm}\n${toMd(p.content.rendered)}\n`);
}

const home = await (await get(`${SITE}/`)).text();
const menu = home.match(/<ul id="top-menu"[\s\S]*?<\/ul><\/div>/)[0].slice(0, -"</div>".length);
await save("_includes/menu.html", localize(menu).replace(/<li id="menu-item-\d+" class="([^"]*)">/g,
  (_, c) => `<li class="menu-item${c.includes("menu-item-has-children") ? " menu-item-has-children" : ""}">`) + "\n");
await save("_includes/svg-icons.svg", home.match(/<svg style="position: absolute;[\s\S]*?<\/svg>/)[0] + "\n");

const assets = {
  "css/style.css": "wp-content/themes/twentyseventeen/style.css",
  "css/blocks.css": "wp-content/themes/twentyseventeen/assets/css/blocks.css",
  "css/block-library.css": "wp-includes/css/dist/block-library/style.min.css",
  "css/block-library-theme.css": "wp-includes/css/dist/block-library/theme.min.css",
  "fonts/font-libre-franklin.css": "wp-content/themes/twentyseventeen/assets/fonts/font-libre-franklin.css",
  "js/jquery.js": "wp-includes/js/jquery/jquery.js",
  "js/jquery-migrate.min.js": "wp-includes/js/jquery/jquery-migrate.min.js",
  "js/global.js": "wp-content/themes/twentyseventeen/assets/js/global.js",
  "js/navigation.js": "wp-content/themes/twentyseventeen/assets/js/navigation.js",
  "js/jquery.scrollTo.js": "wp-content/themes/twentyseventeen/assets/js/jquery.scrollTo.js",
};
for (const [dest, src] of Object.entries(assets)) await download(`${SITE}/${src}`, `assets/${dest}`);
const fontCss = await fs.readFile(path.join(ROOT, "assets/fonts/font-libre-franklin.css"), "utf8");
const fonts = new Set([...fontCss.matchAll(/url\('\.\/(libre-franklin\/[^'?]+)/g)].map((m) => m[1]));
for (const f of fonts) await download(`${SITE}/wp-content/themes/twentyseventeen/assets/fonts/${f}`, `assets/fonts/${f}`);

for (const p of images) await download(`${SITE}/wp-content/uploads/${p}`, `content/images/${p}`);
console.log(`klaar: ${images.size} afbeeldingen, ${Object.keys(assets).length} assets, ${fonts.size} fonts`);
```

- [ ] **Step 3: Draai de migratie**

Run: `node "$SCRATCH/migrate/migrate.mjs" C:/git/ArdonToonstra/creatievetherapieantwerpen`
Expected: `klaar: N afbeeldingen, 10 assets, 32 fonts` zonder fout (N ≈ 7–10).

- [ ] **Step 4: Controleer de output**

```bash
cd C:/git/ArdonToonstra/creatievetherapieantwerpen
ls content/*.md | wc -l                         # 27
ls content/nieuws/                              # 2026-09-16-nieuw-nieuwe-dramatherapeut-esther-de-clercq.md
grep -c '<li class="menu-item' _includes/menu.html   # 23
grep -c '<symbol id=' _includes/svg-icons.svg         # 52
grep -rn --include='*.md' --include='*.html' 'creatievetherapieantwerpen\.be' content _includes # leeg (alle interne links relatief)
head -8 content/themas-hulpvragen.md            # title: "Thema’s/ hulpvragen", permalink: /themas-hulpvragen/
head -8 content/nieuws/*.md                     # title met ":", date: 2026-09-16, permalink: /2026/09/16/nieuw-nieuwe-dramatherapeut-esther-de-clercq/
```

Expected: getallen zoals in de commentaren; geen absolute interne URL's meer.

- [ ] **Step 5: Commit**

```bash
git add content _includes/menu.html _includes/svg-icons.svg assets
git commit -m "Inhoud, afbeeldingen, menu en thema-assets uit WordPress

Gemigreerd met een eenmalig script via de WordPress REST API.
Twenty Seventeen-assets (GPL) ongewijzigd overgenomen.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Twenty Seventeen-layout en vergelijking met de live site

**Files:**
- Create: `_includes/layout.njk`, `_includes/page.njk`, `_includes/post.njk`, `content/index.njk`, `content/nieuws/nieuws.json`
- Create (scratchpad): `$SCRATCH/migrate/verify.mjs`

**Interfaces:**
- Consumes: `menu.html`, `svg-icons.svg`, `assets/*` (Task 2); `longDate`, globale `layout`/`bodyClass` (Task 1).
- Produces: elke pagina in `_site/<permalink>/index.html` met `<div class="entry-content">…</article>`, gebruikt door `verify.mjs`.

- [ ] **Step 1: Shell-layout**

`_includes/layout.njk`:

```njk
<!DOCTYPE html>
<html lang="en-US" class="no-js no-svg">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>(function(html){html.className = html.className.replace(/\bno-js\b/,'js')})(document.documentElement);</script>
<title>{% if page.url == "/" %}Creatieve Therapie Antwerpen – Groepspraktijk voor ervaringsgerichte psychotherapie{% else %}{{ title }} – Creatieve Therapie Antwerpen{% endif %}</title>
<link rel="stylesheet" href="/assets/css/block-library.css">
<link rel="stylesheet" href="/assets/css/block-library-theme.css">
<link rel="stylesheet" href="/assets/fonts/font-libre-franklin.css">
<link rel="stylesheet" href="/assets/css/style.css">
<link rel="stylesheet" href="/assets/css/blocks.css">
<script src="/assets/js/jquery.js"></script>
<script src="/assets/js/jquery-migrate.min.js"></script>
</head>
<body class="{{ bodyClass }} wp-embed-responsive has-header-image colors-light">
<div id="page" class="site">
	<a class="skip-link screen-reader-text" href="#content">Skip to content</a>
	<header id="masthead" class="site-header">
		<div class="custom-header">
			<div class="custom-header-media">
				<div id="wp-custom-header" class="wp-custom-header"><img src="/images/2026/01/27-1.jpg" width="556" height="1304" alt="Creatieve Therapie Antwerpen"></div>
			</div>
			<div class="site-branding">
				<div class="wrap">
					<div class="site-branding-text">
						{% if page.url == "/" %}<h1 class="site-title"><a href="/" rel="home">Creatieve Therapie Antwerpen</a></h1>{% else %}<p class="site-title"><a href="/" rel="home">Creatieve Therapie Antwerpen</a></p>{% endif %}
						<p class="site-description">Groepspraktijk voor ervaringsgerichte psychotherapie</p>
					</div>
				</div>
			</div>
		</div>
		<div class="navigation-top">
			<div class="wrap">
				<nav id="site-navigation" class="main-navigation" aria-label="Top Menu">
					<button class="menu-toggle" aria-controls="top-menu" aria-expanded="false">
						<svg class="icon icon-bars" aria-hidden="true" role="img"> <use href="#icon-bars" xlink:href="#icon-bars"></use> </svg><svg class="icon icon-close" aria-hidden="true" role="img"> <use href="#icon-close" xlink:href="#icon-close"></use> </svg>Menu
					</button>
					<div class="menu-main-container">{% include "menu.html" %}</div>
					{% if page.url == "/" %}<a href="#content" class="menu-scroll-down"><svg class="icon icon-arrow-right" aria-hidden="true" role="img"> <use href="#icon-arrow-right" xlink:href="#icon-arrow-right"></use> </svg><span class="screen-reader-text">Scroll down to content</span></a>{% endif %}
				</nav>
			</div>
		</div>
	</header>
	<div class="site-content-contain">
		<div id="content" class="site-content">
			<div class="wrap">
{{ content | safe }}
			</div>
		</div>
		<footer id="colophon" class="site-footer">
			<div class="wrap"></div>
		</footer>
	</div>
</div>
<script>
var twentyseventeenScreenReaderText = {"quote":"<svg class=\"icon icon-quote-right\" aria-hidden=\"true\" role=\"img\"> <use href=\"#icon-quote-right\" xlink:href=\"#icon-quote-right\"><\/use> <\/svg>","expand":"Expand child menu","collapse":"Collapse child menu","icon":"<svg class=\"icon icon-angle-down\" aria-hidden=\"true\" role=\"img\"> <use href=\"#icon-angle-down\" xlink:href=\"#icon-angle-down\"><\/use> <span class=\"svg-fallback icon-angle-down\"><\/span><\/svg>"};
</script>
<script src="/assets/js/global.js"></script>
<script src="/assets/js/navigation.js"></script>
<script src="/assets/js/jquery.scrollTo.js"></script>
{% include "svg-icons.svg" %}
</body>
</html>
```

- [ ] **Step 2: Pagina- en berichtlayout**

`_includes/page.njk`:

```njk
---
layout: layout.njk
---
<div id="primary" class="content-area">
	<main id="main" class="site-main">
		<article class="page type-page status-publish hentry">
			<header class="entry-header">
				<h1 class="entry-title">{{ title }}</h1>
			</header>
			<div class="entry-content">
{{ content | safe }}
			</div>
		</article>
	</main>
</div>
```

`_includes/post.njk`:

```njk
---
layout: layout.njk
---
<div id="primary" class="content-area">
	<main id="main" class="site-main">
		<article class="post type-post status-publish format-standard hentry">
			<header class="entry-header">
				<div class="entry-meta"><span class="posted-on"><span class="screen-reader-text">Posted on</span> <a href="{{ page.url }}" rel="bookmark"><time class="entry-date published" datetime="{{ page.date.toISOString() }}">{{ page.date | longDate }}</time></a></span></div>
				<h1 class="entry-title">{{ title }}</h1>
			</header>
			<div class="entry-content">
{{ content | safe }}
			</div>
		</article>
	</main>
</div>
```

`content/nieuws/nieuws.json`:

```json
{
  "layout": "post.njk",
  "tags": "posts",
  "bodyClass": "post-template-default single single-post single-format-standard"
}
```

- [ ] **Step 3: Homepage (nieuwslijst)**

`content/index.njk`:

```njk
---
layout: layout.njk
bodyClass: home blog hfeed
permalink: /
---
<header class="page-header">
	<h2 class="page-title">Posts</h2>
</header>
<div id="primary" class="content-area">
	<main id="main" class="site-main">
	{% for post in collections.posts | reverse %}
		<article class="post type-post status-publish format-standard hentry">
			<header class="entry-header">
				<div class="entry-meta"><span class="screen-reader-text">Posted on</span> <a href="{{ post.url }}" rel="bookmark"><time class="entry-date published" datetime="{{ post.date.toISOString() }}">{{ post.date | longDate }}</time></a></div>
				<h3 class="entry-title"><a href="{{ post.url }}" rel="bookmark">{{ post.data.title }}</a></h3>
			</header>
			<div class="entry-content">
{{ post.content | safe }}
			</div>
		</article>
	{% endfor %}
	</main>
</div>
```

- [ ] **Step 4: Bouwen**

Run: `npm run build`
Expected: `Wrote 29 files` (27 pagina's + 1 bericht + homepage), geen fouten.

- [ ] **Step 5: Linkcheck — alleen de bekende fase 2-fouten**

Run: `npm run check`
Expected (exit 1, precies deze twee):

```
BROKEN /hoe/index.html -> creatievetherapieantwerpen@gmail.com
BROKEN /psychotherapie/index.html -> /wp-admin/post.php?post=91&amp;action=edit
2 broken link(s)
```

Elke andere melding (ontbrekende afbeelding, asset of pagina) eerst oplossen.

- [ ] **Step 6: Tekst en afbeeldingen vergelijken met de live site**

`$SCRATCH/migrate/verify.mjs`:

```js
// Vergelijkt tekst en aantal afbeeldingen van entry-content per pagina: live WordPress vs _site.
// Gebruik: node verify.mjs <repo-root>
import fs from "node:fs";
import path from "node:path";

const SITE = "http://creatievetherapieantwerpen.be";
const ROOT = process.argv[2];
const decode = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const text = (html) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const entry = (html) => html.split('<div class="entry-content">')[1]?.split("</article>")[0] ?? "";
const json = async (u) => (await fetch(`${SITE}/wp-json/wp/v2/${u}`)).json();

const items = [...await json("pages?per_page=100"), ...await json("posts?per_page=100")];
let bad = 0;
for (const p of items) {
  const url = new URL(p.link).pathname;
  const live = entry(await (await fetch(p.link)).text());
  const built = entry(fs.readFileSync(path.join(ROOT, "_site", url, "index.html"), "utf8"));
  const [a, b] = [text(live), text(built)];
  const imgs = [live, built].map((h) => (h.match(/<img /g) || []).length);
  if (a === b && imgs[0] === imgs[1]) continue;
  bad++;
  let i = 0; while (i < a.length && a[i] === b[i]) i++;
  console.log(`VERSCHIL ${url}\n  live:  …${a.slice(Math.max(0, i - 40), i + 60)}\n  nieuw: …${b.slice(Math.max(0, i - 40), i + 60)}\n  img: ${imgs.join(" vs ")}`);
}
console.log(`${items.length - bad}/${items.length} identiek`);
```

Run: `node "$SCRATCH/migrate/verify.mjs" C:/git/ArdonToonstra/creatievetherapieantwerpen`
Expected: `27/28 identiek`. Het enige verschil is `/tarief/`: de link met spaties in de URL wordt in Markdown letterlijke tekst `[hier](http:// de …)`. Dat wordt opgelost in Task 4. Bij elk ander verschil eerst de turndown-output van die pagina bekijken en het script of de `.md` corrigeren.

- [ ] **Step 7: Markup-controles**

```bash
grep -o '<title>[^<]*' _site/themas-hulpvragen/index.html          # <title>Thema’s/ hulpvragen – Creatieve Therapie Antwerpen
grep -o '<title>[^<]*' _site/2026/09/16/*/index.html                # <title>NIEUW: nieuwe dramatherapeut Esther de Clercq – …
grep -o '<body class="[^"]*"' _site/index.html _site/tarief/index.html _site/2026/09/16/*/index.html
#   home blog hfeed … / page-template-default page page-two-column … / post-template-default single …
grep -c 'id="icon-bars"' _site/tarief/index.html                    # 1
grep -o 'src="/assets/js/[^"]*"' _site/tarief/index.html            # jquery, jquery-migrate, global, navigation, jquery.scrollTo (in die volgorde)
grep -c 'menu-scroll-down' _site/index.html _site/tarief/index.html # 1 en 0
grep -o 'September 16, 2026' _site/index.html                       # September 16, 2026
```

Expected: zoals in de commentaren.

- [ ] **Step 8: Commit**

```bash
git add _includes/layout.njk _includes/page.njk _includes/post.njk content/index.njk content/nieuws/nieuws.json
git commit -m "Twenty Seventeen-layout voor pagina's, bericht en nieuwslijst

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 9: Visuele controle door de eigenaar (checkpoint)**

Run: `npm start` (http://localhost:8080). Vraag de eigenaar om naast de live site te vergelijken: homepage (grote headerfoto, scroll-pijl), `/tarief/` (twee kolommen), `/rosana-pinheiro/` (citaatblok), `/routebeschrijving/` en `/vanaf-april-2022-charlotte-cornelis/` (galerijen), het bericht, en op smalle breedte het mobiele menu met uitklapbare submenu's. Pas verder na akkoord.

---

### Task 4: Fase 2 — kapotte links

**Files:**
- Modify: `content/hoe.md`, `content/psychotherapie.md`, `content/tarief.md`

- [ ] **Step 1: Bevestig de exacte huidige tekst**

```bash
grep -n 'creatievetherapieantwerpen@gmail.com' content/hoe.md
grep -n 'wp-admin' content/psychotherapie.md
grep -n 'http:// de' content/tarief.md
```

Expected: resp. `[mailen.](creatievetherapieantwerpen@gmail.com)`, `(/wp-admin/post.php?post=91&action=edit)`, `[hier](http:// de terugbetalingsvoorwaarden en bedragen per ziekenfonds)` (met eventuele kleine verschillen in tekens rond de link; vervang alleen de URL tussen haakjes).

- [ ] **Step 2: Vervang de link-doelen**

- `content/hoe.md`: `(creatievetherapieantwerpen@gmail.com)` → `(mailto:creatievetherapieantwerpen@gmail.com)`
- `content/psychotherapie.md`: `(/wp-admin/post.php?post=91&action=edit)` → `(/beeldende-therapie/)`
- `content/tarief.md`: `(http:// de terugbetalingsvoorwaarden en bedragen per ziekenfonds)` → `(https://www.vindeentherapeut.be/info/terugbetaling-psychotherapie.html)`

- [ ] **Step 3: Bouwen en controleren**

Run: `npm run build && npm run check && grep -o '<a href="[^"]*">hier</a>' _site/tarief/index.html`
Expected: `0 broken link(s)` en `<a href="https://www.vindeentherapeut.be/info/terugbetaling-psychotherapie.html">hier</a>`.

- [ ] **Step 4: Commit**

```bash
git add content/hoe.md content/psychotherapie.md content/tarief.md
git commit -m "Kapotte links op Praktisch, Therapie en Tarief herstellen

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Fase 2 — nette URL's voor Esther De Clercq en Idalie Samad

**Files:**
- Rename: `content/vanaf-april-2022-charlotte-cornelis.md` → `content/esther-de-clercq.md`; `content/vanaf-midden-april-2024-idalie-samad.md` → `content/idalie-samad.md`
- Modify: elk bestand in `content/` en `_includes/menu.html` dat de oude paden bevat
- Create: `content/redirects.njk`

**Interfaces:**
- Produces: `content/redirects.njk` met front-matterlijst `redirects: [{from, to}]`; later uitbreidbaar voor de open punten.

- [ ] **Step 1: Hernoemen en permalinks aanpassen**

```bash
git mv content/vanaf-april-2022-charlotte-cornelis.md content/esther-de-clercq.md
git mv content/vanaf-midden-april-2024-idalie-samad.md content/idalie-samad.md
grep -rl -e '/vanaf-april-2022-charlotte-cornelis/' -e '/vanaf-midden-april-2024-idalie-samad/' content _includes \
  | xargs sed -i -e 's#/vanaf-april-2022-charlotte-cornelis/#/esther-de-clercq/#g' -e 's#/vanaf-midden-april-2024-idalie-samad/#/idalie-samad/#g'
grep -rn -e 'vanaf-april-2022' -e 'vanaf-midden-april' content _includes
```

Expected: laatste grep leeg (permalinks in de twee bestanden, menu, contact en het nieuwsbericht zijn mee aangepast).

- [ ] **Step 2: Doorverwijspagina's**

`content/redirects.njk`:

```njk
---
pagination:
  data: redirects
  size: 1
  alias: r
permalink: "{{ r.from }}"
layout: false
eleventyExcludeFromCollections: true
redirects:
  - { from: /vanaf-april-2022-charlotte-cornelis/, to: /esther-de-clercq/ }
  - { from: /vanaf-midden-april-2024-idalie-samad/, to: /idalie-samad/ }
---
<!DOCTYPE html>
<html lang="nl-BE">
<meta charset="utf-8">
<title>Doorverwijzing</title>
<link rel="canonical" href="https://creatievetherapieantwerpen.be{{ r.to }}">
<meta http-equiv="refresh" content="0; url={{ r.to }}">
<a href="{{ r.to }}">{{ r.to }}</a>
</html>
```

- [ ] **Step 3: Bouwen en controleren**

```bash
npm run build && npm run check
grep -o 'url=[^"]*' _site/vanaf-april-2022-charlotte-cornelis/index.html _site/vanaf-midden-april-2024-idalie-samad/index.html
ls _site/esther-de-clercq/index.html _site/idalie-samad/index.html
```

Expected: `0 broken link(s)`; `url=/esther-de-clercq/` en `url=/idalie-samad/`; beide nieuwe pagina's bestaan.

- [ ] **Step 4: Commit**

```bash
git add -A content _includes/menu.html
git commit -m "Nette URL's voor Esther De Clercq en Idalie Samad, oude adressen verwijzen door

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Fase 2 — Nederlandse thema-teksten en datums

**Files:**
- Modify: `_includes/layout.njk`, `_includes/post.njk`, `content/index.njk`, `eleventy.config.js`

- [ ] **Step 1: Teksten vervangen**

`_includes/layout.njk`:
- `<html lang="en-US"` → `<html lang="nl-BE"`
- `>Skip to content<` → `>Naar de inhoud springen<`
- `aria-label="Top Menu"` → `aria-label="Hoofdmenu"`
- `>Scroll down to content<` → `>Naar de inhoud scrollen<`
- `"expand":"Expand child menu","collapse":"Collapse child menu"` → `"expand":"Submenu openen","collapse":"Submenu sluiten"`

`_includes/post.njk` en `content/index.njk`:
- `>Posted on<` → `>Geplaatst op<`

`content/index.njk`:
- `<h2 class="page-title">Posts</h2>` → `<h2 class="page-title">Nieuws</h2>`

`eleventy.config.js`:
- `d.toLocaleDateString("en-US",` → `d.toLocaleDateString("nl-BE",`

- [ ] **Step 2: Bouwen en controleren**

```bash
npm run build && npm run check
grep -o '16 september 2026' _site/index.html _site/2026/09/16/*/index.html
grep -o '<h2 class="page-title">[^<]*' _site/index.html
grep -rlE --include='*.html' 'Posted on|Skip to content|Expand child menu|lang="en-US"' _site || echo "geen Engels meer"
```

Expected: `0 broken link(s)`; datum op beide pagina's; `Nieuws`; `geen Engels meer`.

- [ ] **Step 3: Commit**

```bash
git add _includes/layout.njk _includes/post.njk content/index.njk eleventy.config.js
git commit -m "Thema-teksten en datums in het Nederlands

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Publiceren op GitHub Pages

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

- [ ] **Step 1: Workflow**

`.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm run check
      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: README**

`README.md`:

````md
# Creatieve Therapie Antwerpen — website

Statische site (Eleventy), automatisch gepubliceerd op GitHub Pages bij elke push naar `main`.

- Pagina's: `content/*.md` — bovenaan `title` en `permalink`, daaronder de tekst in Markdown.
- Nieuwsbericht: nieuw bestand in `content/nieuws/` met `title`, `date` (JJJJ-MM-DD) en `permalink`.
- Menu: `_includes/menu.html`.
- Afbeeldingen: in `content/images/`, gebruiken als `/images/...`.
- Oude URL doorverwijzen: lijst `redirects` in `content/redirects.njk`.

```
npm install
npm start       # lokaal bekijken op http://localhost:8080
npm run build   # bouwt naar _site/
npm run check   # zoekt kapotte interne links in _site/
```
````

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml README.md
git commit -m "Publicatie via GitHub Pages en README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: GitHub Pages aanzetten (eigenaar)**

Run: `gh api repos/esthertherapie-dotcom/creatievetherapie-website/pages`
Bij `404`: vraag iemand met admin-rechten op de repo om Settings → Pages → Build and deployment → Source: **GitHub Actions** te kiezen. (De huidige gebruiker heeft WRITE, niet ADMIN.)

- [ ] **Step 5: Pushen en de run volgen**

```bash
git push -u origin main
gh run watch --repo esthertherapie-dotcom/creatievetherapie-website --exit-status
```

Expected: alle stappen groen, inclusief `npm run check` op Linux (vangt hoofdlettergevoelige paden).

- [ ] **Step 6: Domein en DNS (eigenaar)**

Geef de eigenaar deze stappen:
1. Settings → Pages → Custom domain: `creatievetherapieantwerpen.be` → Save.
2. Bij de registrar: A-records voor `creatievetherapieantwerpen.be` naar `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; AAAA naar `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`; CNAME `www` → `esthertherapie-dotcom.github.io`. MX-records niet aanraken.
3. Na de DNS-check in Settings → Pages: **Enforce HTTPS** aanvinken.
4. Oude hosting pas opzeggen nadat de nieuwe site live werkt en vaststaat dat er geen mail via die hosting loopt.

- [ ] **Step 7: Live controle (na DNS)**

```bash
for p in / /tarief/ /esther-de-clercq/ /vanaf-april-2022-charlotte-cornelis/ /images/2026/01/27-1.jpg; do
  curl -s -o /dev/null -w "%{http_code} $p\n" "https://creatievetherapieantwerpen.be$p"; done
```

Expected: overal `200`.
