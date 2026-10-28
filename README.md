# Creatieve Therapie Antwerpen — website

Statische site (Eleventy), automatisch gepubliceerd op GitHub Pages bij elke wijziging op `main`.
Je hoeft niets te installeren om de site te onderhouden: alles kan in de browser.

## Waar staat wat

- Pagina's: `content/*.md` — bovenaan `title` en `permalink`, daaronder de tekst in Markdown.
- Nieuwsbericht: nieuw bestand in `content/nieuws/` met `title`, `date` (JJJJ-MM-DD) en `permalink`.
- Menu: `_includes/menu.html`.
- Afbeeldingen: in `content/images/`, gebruiken als `/images/...`.
- Oude URL doorverwijzen: lijst `redirects` in `content/redirects.njk`.

## Een wijziging maken

**Kleine wijziging (tikfout, adres, nieuwsbericht)** — op github.com:

1. Open het bestand en klik op het potloodje (✏️).
2. Pas de tekst aan en klik op **Commit changes**.
3. Kies **Create a new branch … and start a pull request** als je eerst een preview wil zien,
   of **Commit directly to the main branch** om het meteen te publiceren.

**Grotere wijziging, of met een AI-assistent** (bv. Claude Code op claude.ai/code, ChatGPT Codex,
GitHub Copilot): koppel de assistent aan deze repository en vraag in gewone taal wat je wil,
bv. *"Voeg een nieuwsbericht toe over de workshop van 12 december."* De assistent maakt een
**pull request**: een voorstel tot wijziging. De afspraken voor AI-assistenten staan in `AGENTS.md`.

## Preview bekijken en publiceren

1. Een paar minuten na het openen (of bijwerken) van een pull request verschijnt daarin een reactie
   met een **previewlink** (`…/pr-<nummer>/`). Daar staat de volledige site mét de wijziging.
2. Ziet het er goed uit? Klik in de pull request op **Merge pull request**. Binnen enkele minuten
   staat het online. Niet goed? Vraag de assistent om het aan te passen; de preview volgt vanzelf.
3. Een gesloten of gemergde pull request verdwijnt uit de previews.

Bouwt een wijziging niet (bv. een kapotte link), dan meldt de reactie dat met een ❌ en wordt
er niets gepubliceerd: de bestaande site blijft gewoon online.

> Previews werken alleen voor pull requests vanuit deze repository, niet vanuit forks.
> Verhuist de site later naar Netlify of Cloudflare Pages, dan hebben die eigen previews en
> kan het previewgedeelte uit `.github/workflows/deploy.yml` weg.

## Lokaal werken (alleen voor wie technisch wil meewerken)

Nodig: [Node.js](https://nodejs.org) (LTS) en [GitHub Desktop](https://desktop.github.com) om de code op te halen.

```
npm install
npm start       # lokaal bekijken op http://localhost:8080
npm run build   # bouwt naar _site/
npm run check   # zoekt kapotte interne links in _site/
```
