# Enseada – Makler-Website-Template (Übergabe)

Du (Claude) arbeitest hier mit dem Besitzer dieses Ordners weiter. Lies diese Datei zuerst, dann `README.md`.
Sprache mit dem Besitzer: Deutsch, kurz und direkt. Englische Fachbegriffe immer kurz auf Deutsch erklären.

## Was das ist
Fertiges Website-Template für Immobilienmakler in Pipa (Brasilien). Demo-Marke „Enseada Imóveis“. Alle Namen, Preise, Zahlen, Adressen, Kundenstimmen und die CRECI-Nummer sind ERFUNDEN (Platzhalter).
- Statische Seite, vier Sprachen: Portugiesisch (Startseite), Englisch, Spanisch, Deutsch. Währung R$ / US$ / €.
- Wird per `build.py` (Python) aus Daten und Vorlagen zu fertigen HTML-Dateien gebaut (`dist/`: 169 HTML-Dateien inkl. Druckseiten, 26 MB; die Build-Meldung zeigt „Seiten: 128“).
- Schema-Daten, `llms.txt`, `sitemap.xml`, `robots.txt`, IndexNow, WebP-Bilder in drei Größen, WhatsApp-Knopf, Karte (OpenStreetMap + Leaflet), Rechner, Merkliste, Sprachwechsel ohne Neuladen.
- Verwendungszweck: ein Template pro Kunde anpassen (Name, Farbe, Objekte, Fotos), nicht neu erfinden.

## Wo liegt was
| Pfad | Inhalt |
|---|---|
| `content/site.json` | alle Kundendaten (Name, Makler, CRECI, Telefon, WhatsApp, Adresse, Farbe `brandColor`, Kurzname `brandShort`, Zahlen, Kundenstimmen, Links) |
| `content/imoveis/*.json` | je Immobilie eine Datei (10 Beispiele) |
| `content/seiten/*.json` | Ratgeber-/Inhaltsseiten (comprar, vender, comprar-do-exterior, golpes, residencia, caminhos, calculadoras, traducao, verificada) |
| `content/blog/*.json` | Artikel (optionales Modul) |
| `content/fotos/` | Fotos (WebP), `content/video/` Hero-Videos (in `site.json` AUS, Hero zeigt ein Foto; `build.py` kopiert den Ordner aber trotzdem nach `dist/video`, die 3 MB werden also mit ausgeliefert – Ordner leeren, wenn nicht gewünscht) |
| `content/paises.json`, `taxas.json` | Länderdaten, Steuer-/Kostensätze |
| `src/templates/*.html` | Seitenvorlagen (Jinja2) |
| `src/textos.json`, `textos_neu.json`, `textos_v2.json` | alle festen Texte, je Eintrag pt/en/es/de |
| `src/site.css` + `src/guia.css` | Gestaltung (beide werden zusammengefügt; Farben/Abstände oben in `:root`) |
| `src/site.js` + `src/guia.js` | Bedienung (Sprachwechsel, Übergänge, Filter, Karte, Rechner) |
| `src/fonts/`, `src/vendor/`, `src/static/` | Schrift Open Sans, Leaflet, Kartenbilder |
| `build.py` | baut alles nach `dist/` (enthält auch `typo()`: verhindert Einzelwörter am Zeilenende) |
| `tools/make_pdfs.py` | erzeugt PDF-Exposés (braucht Playwright/Chromium; läuft im GitHub-Workflow, nicht in `build.py`) |
| `.github/workflows/site.yml` | baut und veröffentlicht bei jedem Push auf GitHub Pages |
| `.pages.yml` | Formular für Pages CMS (Makler pflegt Objekte selbst) |

Nicht vom Build benutzt (Altlasten/Entwürfe, nicht löschen ohne Rückfrage): `src/views/`, `src/core.js`, `src/base.css`, `src/hanken-*.woff2`, `src/cormorant-*.woff2`.

## Bauen und testen
Python 3.12 oder neuer (getestet mit 3.12 und 3.13). Immer im Projektordner ausführen (alle Pfade relativ). `dist/` wird bei jedem Bauen neu erzeugt und gehört nicht ins Repo (.gitignore). Texte in `src/textos.json` werden von `textos_neu.json` und danach `textos_v2.json` überschrieben (die letzte Datei gewinnt) – beim Ändern eines Textes immer in allen drei Dateien nach dem Schlüssel suchen.
```
pip install -r requirements.txt
SITE_BASE=/ python build.py
cd dist && python -m http.server 8000      # dann http://localhost:8000
```
Nach JEDER Änderung: bauen, prüfen (keine Fehlermeldung, Build-Meldung „Seiten: 128“, 169 HTML-Dateien in dist), im Browser ansehen: Handy (320 px und 390 px) UND Desktop, in allen vier Sprachen. Nie „fertig“ melden, ohne gebaut und angesehen zu haben.

## Veröffentlichen (eigenes Konto nötig, kostet nichts)
1. Neues GitHub-Repository anlegen, diesen Ordner hochladen (ohne `dist/`).
2. Repo → Settings → Pages → Source: „GitHub Actions“.
3. Der Workflow baut mit `SITE_ORIGIN=https://<konto>.github.io` und `SITE_BASE=/<repo-name>/` selbst. Mit eigener Domain: `SITE_BASE=/` und `SITE_ORIGIN=https://domain`.
4. WICHTIG pro Kunde ändern: in `build.py` den `INDEXNOW_KEY` (eigener 32-stelliger Zufallswert). `ORIGIN` steht auf der Platzhalter-Domain `example.github.io` und kommt im Workflow aus `SITE_ORIGIN`.

## Neuen Kunden anpassen (Reihenfolge)
1. `content/site.json`: Name, Makler, CRECI, Kontakt, `brandColor`, `brandShort`, Koordinaten, Zahlen, Kundenstimmen, Social-Links. Demo-Hinweis `demoNote` auf `false`.
2. Objekte in `content/imoveis/` ersetzen, Fotos nach `content/fotos/` (Preis 0 = „Preis auf Anfrage“ funktioniert).
3. Feste Texte nur in `src/textos*.json` ändern, immer alle vier Sprachen gleichzeitig.
4. `contactUrl` / `newsletterUrl` / `uploadUrl` in `site.json` eintragen (z. B. Formspree). Ohne Eintrag öffnet das Kontaktformular WhatsApp; Newsletter/Upload haben dann KEIN Ziel.
5. „Pipa“ steht ca. 200-mal fest (src/textos*.json, content/) (Ortsname ist nicht überall Variable) – bei einem anderen Ort alles durchsehen.
6. Impressum/Datenschutz (LGPD) vom Kunden bzw. dessen Anwalt prüfen lassen.

## Datenformate (kurz)
- `content/imoveis/<slug>.json` (Dateiname = slug): `slug, ref, deal` (venda/aluguel), `type` (casa/apartamento/terreno), `name, title{pt,en,es,de}, loc, lat, lng, price` (0 = auf Anfrage), `condo, iptu, beds, suites, baths, parking, area, lot, year, beach, status` (novo/disponivel/reservado), `date, imgs` (Fotonamen ohne .webp, erstes = Titelbild), `video, plan, feats, dist{beach,center,airport}, highlights{Sprache:[…]}, desc{Sprache}, ordem`; optional `feat, priceBefore, checks, temporada`. Beste Vorlage: eine vorhandene Datei kopieren.
- `content/blog/<slug>.json`: `title, date, updated, author, img, cat, excerpt, body` (je Sprache). `content/seiten/*.json`: Inhalt der Ratgeberseiten, je Sprache.
- `site.json`: `media{hero,about,story,sell,cta}` (Fotonamen), `stats, geo{lat,lng}, theme` (light/dark), `fx` (Ersatzkurse), `locPhotos, gaId, openingHours, rate, buyCosts`, Social-Links. `brandColor` (Format `#rrggbb`, wird automatisch auf lesbaren Kontrast abgedunkelt), `brandShort`, `uploadUrl` stehen leer drin.
- Fotos: WebP oder JPG in `content/fotos/`, Verweis nur per Dateiname ohne Endung; `build.py` erzeugt daraus drei Größen. Nicht mehr benutzte Fotos dürfen liegen bleiben.
- Pages CMS (`.pages.yml`): Repo auf app.pagescms.org verbinden (Branch main). Bekannte Lücke: Formular kennt nur pt/en/de (kein Spanisch) und nicht alle Felder (brandColor, brandShort, uploadUrl, fx, locPhotos, priceBefore, temporada, checks).
- PDF-Exposés lokal: `pip install playwright && playwright install chromium`, dann nach `build.py` mit gleichem `SITE_BASE`: `python tools/make_pdfs.py`.

## Entscheidungen – NICHT wieder ändern (Stand der Übergabe)
- Keine Bankfinanzierung für Ausländer im Angebot; Rechner zeigen Spanne + Quelle + Stand.
- Keine Provision nennen. Sprachen: PT/EN/ES/DE. WhatsApp-Knopf bleibt. Exposé-PDF je Objekt.
- Aufenthalt: „ab R$ 700.000 (Nordeste)“.
- CRECI sichtbar, aber nicht in der Kopfleiste; Formulierung „Maklerin mit CRECI“ (nichts versprechen, was nicht belegt ist).
- Browsersprache-Umleitung der Startseite ist gewollt (pt-BR bleibt Portugiesisch).
- Hero = Foto statt Video. Karte bleibt (Verkaufsfunktion). Blog ist optionales Modul.
- Mobilmenü: 6 Punkte untereinander. Social-Icons in Originalfarben. CRECI-Siegel mittig/gold.
- Karte: OpenStreetMap-Kacheln (Google-Kacheln sind nicht erlaubt). Bei vielen Besuchern eigenen Kachel-Anbieter eintragen (`src/site.js`, Zeile `tile.openstreetmap.org`).
- Alles muss kostenlos laufen (GitHub Pages, keine bezahlten Dienste).
- Letzte Linie des Besitzers: Website steht zu ca. 60–70 %, es wird nur Feinschliff gemacht („wie Apple“: ruhig, flüssig, präzise), keine neuen Bereiche ohne Absprache.

## Bekannte offene Punkte (Entscheidung beim Besitzer, nichts selbst ändern)
- Demo-Zahlen/Platzhalter ersetzen oder klar als Platzhalter lassen (212 verkauft, 4,9 Google/128, 23 Länder, seit 2012, WhatsApp +55 84 99999-0000, CRECI 00000-F, Adresse 000).
- Objekt-Finanzierungsrechner: zeigt Punktwerte ohne Spanne/Quelle/Stand, passt nicht zur Regel „keine Bankfinanzierung für Ausländer“ – streichen oder umbauen?
- USD/EUR-Umrechnung (Live-Abruf frankfurter.dev) ohne Kursstand-Hinweis.
- Kontaktformular/Newsletter/Upload ohne Backend; PDF-Button gibt 404, wenn `tools/make_pdfs.py` nicht lief.
- Sprachprüfung offen (inhaltliche Sachfragen, nicht geändert): CRECI-Pflichtangabe, Kaufdauer 60–90 Tage, CPF-Weg, Anwalt-/Steuerberater-Vermittlung, Wortlaut „Zahlung folgt Vertrag und Eintragung“ (rechtlich heikel), Finanzierungsrechner EN/ES/DE vs. PT, Begriff „Aufenthaltstitel/Investorenvisum“, Lagunengrundstück foro vs. taxa de ocupação, beeidigte Übersetzung Argentinien.
- Merkliste speichert die Adresse in der alten Sprache; Scroll-Drift ±20 px bei Sprachwechsel.
- Nicht getestet: echtes iPhone/Safari und Firefox (Sprachwechsel, Übergänge, Karte). Das zuerst nachholen.
- SEO: ca. 29 Titel über 65 Zeichen; Objekt-Titel in allen Sprachen identisch.
- Preis-Sortierung auf „Alle“ mischt Miete und Kauf; Preis-Dropdown/Rechner nur in R$.

## Geplant (noch NICHT gebaut, nur auf Ansage)
Zwei weitere Varianten des Makler-Templates; später Varianten für Anwälte und Ärzte; CMS-Pflege durch den Kunden (Pages CMS ist per `.pages.yml` vorbereitet); Skript, das bestehende Maklerseiten ausliest und in dieses Template füllt (Demo-Akquise).

## Arbeitsregeln
- Vor jeder größeren Änderung kurz sagen, was geändert wird. Bestehende Dateien editieren, nicht neu schreiben.
- Nichts löschen, nichts veröffentlichen, nichts an Dritte senden ohne ausdrückliche Zustimmung.
- Keine Texte erfinden, die wie belegte Fakten wirken (Zahlen, Rechtsaussagen, Kundenstimmen). Unklares als „unklar“ markieren.
- Rechtlich heikle Texte (Verträge, Zahlung, Visum, Steuern) nicht allein formulieren: Anwalt/Steuerberater vor Ort prüfen lassen.
- Texte immer in allen vier Sprachen pflegen; PT ist die Quelle.
