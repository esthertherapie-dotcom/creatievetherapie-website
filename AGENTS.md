# Instructies voor AI-assistenten

Dit is de website van Creatieve Therapie Antwerpen, een groepspraktijk voor psychotherapie.
De mensen die je helpen zijn niet technisch: leg uit wat je deed in gewone taal, zonder vaktermen.

## Hoe de site werkt

- Statische site met Eleventy. Waar alles staat: zie `README.md`.
- Alle tekst is Nederlands (België). Behoud de toon en schrijfwijze van de bestaande pagina's.
- Markdown-bestanden worden niet als template uitgevoerd: zet geen `{{ }}` of `{% %}` in `content/*.md`.
- Interne links en afbeeldingen beginnen met `/` (bv. `/contact/`, `/images/foto.jpg`). Schrijf nooit het
  volledige webadres of de `github.io`-map uit; het juiste voorvoegsel wordt bij het bouwen toegevoegd.

## Werkwijze

- Werk altijd via een pull request, nooit rechtstreeks op `main`: wat op `main` komt, staat meteen online.
- Houd elke pull request klein en bij één onderwerp. Beschrijf in de PR in gewone taal wat er verandert.
- Verzin geen inhoud. Namen, adressen, telefoonnummers, tarieven, data en therapeutische claims komen
  alleen van de gebruiker. Twijfel je, vraag het.
- Voeg geen nieuwe npm-pakketten, frameworks of build-stappen toe.
- Controleer vóór je klaar bent (als je commando's kunt uitvoeren):
  `npm test`, `npm run build` en `npm run check` (zoekt kapotte links). Alle drie moeten slagen.
- Na het openen van de pull request plaatst GitHub binnen een paar minuten een reactie met een
  previewlink. Wijs de gebruiker daarop: zo kunnen ze de wijziging bekijken vóór ze op "Merge" klikken.
