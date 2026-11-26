# Enseada Imóveis – Makler-Template (Demo)

> Für Claude und neue Bearbeiter: zuerst `CLAUDE.md` lesen (Aufbau, Regeln, Entscheidungen, offene Punkte).

Statische Website für Immobilienmakler. Alle Namen, Preise, Adressen, Zahlen und Kundenstimmen sind erfunden.

- **Jede Seite ist eine fertige HTML-Datei** (Portugiesisch, Englisch, Spanisch, Deutsch) – lesbar für Google und KI-Suchen.
- **Im Hintergrund:** Schema-Daten je Seite, `llms.txt`, `sitemap.xml`, `robots.txt`, IndexNow, Bilder als WebP in drei Größen.
- **Eine Schrift** (Open Sans, liegt im Projekt), keine fremden Schrift- oder Skript-Server.
- **Karte:** OpenStreetMap über Leaflet (liegt im Projekt). Sie wird erst geladen, wenn sie sichtbar wird.
- **Pflege per Formular:** Der Makler meldet sich bei [Pages CMS](https://app.pagescms.org) an, klickt auf „Imóveis“ → „Add an entry“, füllt das Formular aus und speichert. Die Seite baut sich neu und ist nach etwa einer Minute online.

## Seiten

Startseite · Objektliste (alle / Kauf / Miete / Grundstücke, mit Filter, Sortierung und Karte) · Objektseite · Über uns · Ratgeber · Artikel · Kontakt · Datenschutz · 404

## Für einen neuen Kunden anpassen

1. Dieses Projekt kopieren und GitHub Pages auf „GitHub Actions“ stellen.
2. `content/site.json` ausfüllen: Name, Makler, CRECI, Telefon, WhatsApp, E-Mail, Adresse, Koordinaten, Fotos, Zahlen, Kundenstimmen, Instagram.
3. Beispiel-Einträge in `content/imoveis/` und `content/blog/` durch die des Kunden ersetzen, Fotos nach `content/fotos/`.
4. Feste Texte (Überschriften, Über uns, Fragen, Datenschutz) stehen in `src/textos.json`, je Eintrag in pt, en, es, de.
5. Farben, Rundungen und Abstände stehen oben in `src/site.css` (Abschnitt `:root`).
6. Formular-Versand: `contactUrl` und `newsletterUrl` in `site.json` eintragen (z. B. Formspree, Brevo). Ohne `contactUrl` öffnet das Kontaktformular WhatsApp mit der fertigen Nachricht.
7. Eigene Domain verbinden – dann liegen `robots.txt` und `llms.txt` im Wurzelverzeichnis.
8. Datenschutz-Seite vor dem Start vom Kunden bzw. dessen Anwalt prüfen lassen (Mustertext).

## Aufbau

| Ordner / Datei | Inhalt |
| --- | --- |
| `content/site.json` | alle Kundendaten an einer Stelle |
| `content/imoveis/` | ein Eintrag je Immobilie |
| `content/seiten/`, `paises.json`, `taxas.json` | Ratgeberseiten, Länder- und Kostendaten |
| `src/guia.css`, `src/guia.js` | weitere Gestaltung/Bedienung (werden mit site.* zusammengefügt) |
| `tools/make_pdfs.py` | PDF-Exposés (nach dem Bauen) |
| `content/blog/` | ein Eintrag je Artikel |
| `content/fotos/` | Fotos (werden beim Bauen verkleinert) |
| `src/templates/` | Seitenvorlagen |
| `src/textos.json` | feste Texte in vier Sprachen (pt, en, es, de), dazu `textos_neu.json`, `textos_v2.json` |
| `src/site.css`, `src/site.js` | Gestaltung und Bedienung |
| `src/fonts/`, `src/vendor/` | Schrift Open Sans, Karten-Bibliothek Leaflet (mit Lizenzen) |
| `build.py` | baut alles nach `dist/` |
| `.pages.yml` | Aufbau des Formulars |
| `.github/workflows/site.yml` | baut und veröffentlicht bei jeder Änderung |

## Lokal bauen

```
pip install -r requirements.txt
SITE_BASE=/ python build.py
cd dist && python -m http.server 8000
```

## Hinweise

- Video im Einstieg: in `site.json` AUS, der Einstieg zeigt ein Foto (`media.hero` in `site.json`). Die Videodateien `content/video/hero.mp4` / `hero-m.mp4` liegen noch im Ordner, sind aber nicht mehr in `site.json` eingetragen. Das Demo-Video stammt von Pexels (Alef Morais, freie Pexels-Lizenz) und wird je Kunde ersetzt.

- Kartenkacheln kommen von openstreetmap.org. Für Seiten mit sehr vielen Besuchern einen eigenen Kachel-Anbieter eintragen (`src/site.js`, Zeile mit `tile.openstreetmap.org`).
- Wechselkurse (US$, €) werden nur abgefragt, wenn ein Besucher die Währung umstellt oder eine Objektseite öffnet (frankfurter.dev). Ersatzwerte stehen in `site.json` unter `fx`.
