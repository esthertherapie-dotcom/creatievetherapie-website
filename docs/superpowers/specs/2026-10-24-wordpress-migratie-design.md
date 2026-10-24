# Migratie creatievetherapieantwerpen.be: WordPress → Eleventy + GitHub Pages

Datum: 2026-10-24

## Doel

De site `http://creatievetherapieantwerpen.be` (WordPress 5.1, thema Twenty Seventeen, PHP 5.5) vervangen door een statische site:
inhoud als Markdown in deze repo, een kleine bouwstap (Eleventy) naar HTML, gratis gehost op GitHub Pages met het eigen domein en https.

- **Fase 1** — de site *zoals hij is*: zelfde layout, zelfde inhoud, zelfde URL's.
- **Fase 2** — fouten oplossen (kapotte links, dubbele/lege pagina's, rare slugs). Look & feel en inhoud blijven verder gelijk.

De inhoud wordt beheerd door de eigenaar zelf, via bestanden (geen CMS).

## Huidige site (vastgesteld 2026-10-24)

- 27 gepubliceerde pagina's, 1 bericht, 43 media-items; REST API open op `/wp-json/wp/v2/`.
- Homepage = bloglijst (kop "Posts", berichten met datum en volledige inhoud), custom headerfoto `wp-content/uploads/2026/01/27-1.jpg`, sitetitel "Creatieve Therapie Antwerpen", tagline "Groepspraktijk voor ervaringsgerichte psychotherapie".
- Geen sidebar, geen widgets, geen formulieren, geen iframes. Inhoud is tekst, citaten (`wp-block-quote`), enkele afbeeldingen (`wp-block-image`) en 2 galerijen (`wp-block-gallery`).
- Menu met submenu's (Over ons → Team → therapeuten → disciplines; Praktisch → Contact, Routebeschrijving, Tarief; Therapie → Thema's, disciplines).

## Structuur

```
content/                     Eleventy-input; 1 .md per pagina
  <slug>.md                  front matter: title, permalink (= oude URL)
  nieuws/<datum>-<slug>.md   berichten (tag: posts), permalink = oude /JJJJ/MM/DD/slug/
  index.njk                  homepage: bloglijst
  images/                    enkel effectief gebruikte afbeeldingen
_includes/layout.njk         Twenty Seventeen-markup: header, headerfoto, menu, footer
_data/menu.json              menu-items met kinderen
assets/                      style.css, blocks.css, js, fonts van Twenty Seventeen (ongewijzigd)
scripts/check-links.js       linkcheck op _site/
eleventy.config.js
package.json                 enige dependency: @11ty/eleventy (dev)
CNAME                        creatievetherapieantwerpen.be
.github/workflows/deploy.yml build + linkcheck + deploy naar GitHub Pages
```

Eleventy-config: `dir.input = "content"`, includes en data uit de repo-root, `assets/` en `content/images/` als passthrough copy. Uitvoer `_site/` (in `.gitignore`).

## Layout

`_includes/layout.njk` reproduceert de gerenderde HTML van Twenty Seventeen: dezelfde element-ids en classes (`#page`, `.site-header`, `.custom-header`, `.navigation-top`, `#site-navigation`, `.site-content`, `.entry-content`, …) en dezelfde body-classes per paginatype (`home blog …` voor de homepage, `page …` voor pagina's), zodat de originele CSS ongewijzigd werkt. Ook de JS van het thema (mobiel menu, dropdowns, header-gedrag) wordt ongewijzigd overgenomen, inclusief de jQuery-versie die WordPress meelevert. De Google Fonts-link (Libre Franklin) blijft.

Afwijkingen van "as is":
- Footer "Proudly powered by WordPress" vervalt (niet meer waar).
- Weggelaten WordPress-onderdelen: RSS-feeds, reacties, zoeken, auteur/datum/categorie-archieven, `wp-json`, `xmlrpc.php`, emoji-script, wp-embed.

## Migratie (eenmalig, niet in de repo)

Script in de scratchpad, draait één keer:
1. Haalt alle pagina's en berichten op via de REST API (`content.rendered`).
2. Zet HTML om naar Markdown (turndown). Galerijen, afbeeldingen met bijschrift en andere blokken die niet zuiver omzetten blijven als HTML in de Markdown.
3. Schrijft front matter: `title` (HTML-entities gedecodeerd), `permalink` = huidige URL-pad, voor berichten ook `date`.
4. Downloadt enkel de afbeeldingen die in inhoud of header gebruikt worden naar `content/images/` en herschrijft de paden. `srcset` vervalt.
5. Herschrijft absolute interne links `http://creatievetherapieantwerpen.be/...` naar relatieve `/...`.

Alle 27 pagina's gaan mee, ook leeg/dubbel, zodat elke bestaande URL blijft werken.

Het menu wordt overgenomen uit de gerenderde `#site-navigation` van de homepage naar `_data/menu.json`.

## Bouwen en publiceren

- `npm start`: lokale preview met live reload.
- `npm run build`: bouwt naar `_site/` en draait daarna `scripts/check-links.js`.
- GitHub Action bij push naar `main`: `npm ci`, `npm run build`, deploy via `actions/upload-pages-artifact` + `actions/deploy-pages`.
- Publieke GitHub-repo (vereist voor gratis GitHub Pages). Het aanmaken van de repo en de eerste push gebeuren pas na bevestiging van de eigenaar.
- DNS-omschakeling is de laatste stap en gebeurt door de eigenaar bij de registrar: A-records naar GitHub Pages, daarna "Enforce HTTPS" aanzetten. Vóór het opzeggen van de oude hosting controleren of er geen mail (MX) via loopt.

## Controle

- `scripts/check-links.js` (Node, geen dependencies): loopt alle `.html` in `_site/` af, verzamelt `href`/`src` die met `/` beginnen, en faalt (exit 1) als het doelbestand niet bestaat. Externe links worden niet gecontroleerd.
- Na de migratie: per pagina titel, tekst (genormaliseerd) en aantal afbeeldingen vergelijken met de live site.
- Visuele vergelijking: door de eigenaar, oude site naast `npm start`.

## Fase 2: bekende fouten (elk een aparte commit)

| Pagina | Probleem |
|---|---|
| Praktisch (`/hoe/`) | e-maillink zonder `mailto:` |
| Tarief (`/tarief/`) | link-URL is tekst ("http:// de terugbetalingsvoorwaarden…") |
| Therapie (`/psychotherapie/`) | link naar `wp-admin/post.php?post=91` |
| Esther De Clercq | slug `/vanaf-april-2022-charlotte-cornelis/` |
| Idalie Samad | slug `/vanaf-midden-april-2024-idalie-samad/` |
| Beeldende therapie | 3 versies: `/beeldende-therapie/`, `/beeldende-therapie-2/`, `/http-creatievetherapieantwerpen-be-wp-admin-post-phppost91actionedit/` |
| Yoga, Dans- en bewegingstherapie, Dramatherapie | dubbele `-2`-pagina's |
| Lege pagina's | `dans-en-bewegingstherapie-2`, `welzijn`, `groepsaanbod`, `individueel`, `yoga-therapie`, `yoga-2`, `yoga` |
| Nieuwsbericht | datum in het Engels |

Inhoudelijke keuzes (welke versie blijft, wat met lege pagina's) beslist de eigenaar. Gewijzigde URL's krijgen een doorverwijspagina (`<meta http-equiv="refresh">` + `rel="canonical"`), omdat GitHub Pages geen server-redirects kent.

## Buiten scope

CMS, contactformulier, zoeken, RSS, analytics, herontwerp.
