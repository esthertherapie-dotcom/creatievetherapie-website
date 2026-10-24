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
