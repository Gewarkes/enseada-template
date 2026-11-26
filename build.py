#!/usr/bin/env python3
"""Baut die statische Website nach dist/.

Jede Seite ist eine fertige HTML-Datei je Sprache (pt, en, de). Dazu: Bilder als WebP in drei
Größen, Schema-Daten je Seite, sitemap.xml, robots.txt, llms.txt und IndexNow.

Aufruf:  python build.py     (SITE_ORIGIN und SITE_BASE kommen aus der Umgebung)

Inhalte:  content/site.json (Kundendaten) · content/imoveis/*.json · content/blog/*.json · content/fotos/
Aussehen: src/site.css · src/site.js · src/templates/*.html · src/textos.json (alle festen Texte)
"""
import os, re, json, glob, shutil, hashlib, html, datetime
from PIL import Image
from jinja2 import Environment, FileSystemLoader, StrictUndefined
from markupsafe import Markup

ORIGIN = os.environ.get('SITE_ORIGIN', 'https://example.github.io').rstrip('/').lower()
BASE = os.environ.get('SITE_BASE', '/enseada-imoveis/')
INDEXNOW_KEY = '7c1e5a9d3b2f4e6a8c0d1f2b3a4c5d6e'
LANGS = ['pt', 'en', 'es', 'de']
HL = {'pt': 'pt-BR', 'en': 'en', 'es': 'es', 'de': 'de'}
D = 'dist'


def rd(f):
    return open(f, encoding='utf-8').read()


# ---------- Feinschliff Umbrüche: Zusammengehöriges nie trennen, kein Einzelwort in der letzten Zeile ----------
import re as _re
_NB = ' '
_CLOSE = _re.compile(r'^</(?:p|li|td|th|dd|dt|h1|h2|h3|h4|summary|label|small|blockquote|figcaption|a|b|strong|em|span|div|button|output|i|s)>', _re.I)
_UNITS = (r'm²|m2|km²|km|ha|%|h|Uhr|min|kg|dias?|days?|Tage[n]?|d[ií]as?|semanas?|weeks?|Wochen?|meses|months?|Monate[n]?|anos?|years?|Jahre[n]?|años?|'
          r'quartos?|bedrooms?|Schlafzimmer|dormitorios?|banheiros?|bathrooms?|Bäder|baños?|vagas?|suítes?|suites?|Zimmer|Bäder|Mi|Mio\.?|mil|Tsd\.?')
_TOKEN = _re.compile(
    r'(?P<mail>[\w.+-]+@[\w-]+(?:\.[\w-]+)+)'
    r'|(?P<phone>\+\d{1,3}(?:[  ]\(?\d+\)?)+(?:-\d+)?)'
    r'|(?P<creci>CRECI(?:/[A-Z]{2})?[  ]?\d[\d.]*(?:-[0-9A-Z])?)'
    r'|(?P<ref>\b(?:Ref\.?|Nr\.?|Nº|No\.|Tel\.?)[  ]?[A-Z0-9][\w./-]*)'
    r'|(?P<price>(?:R\$|US\$|€)[  ]?\d[\d.,]*(?:[  ](?:Mi|Mio\.?|mil|Tsd\.?))?)'
    r'|(?P<price2>\d[\d.,]*[  ](?:€|R\$|US\$))'
    r'|(?P<unit>\d[\d.,]*[  ]?(?:' + _UNITS + r')(?![\wÀ-ÿ]))'
    r'|(?P<code>\b\d{3,}-[0-9A-Z]\b)')

def _tail_join(piece):
    """Letzte zwei Wörter zusammenhalten (kein Einzelwort in der letzten Zeile). Passt das Paar nicht in die Spalte, löst guia.js die Bindung wieder (.tj.off)."""
    m = _re.match(r'^(.*?)(\s*)$', piece, _re.S)
    core, trail = m.groups()
    i = core.rfind(' ')
    if i < 0: return piece
    a, b = core[:i], core[i + 1:]
    j = a.rfind(' ')
    prev = a[j + 1:]
    if not prev or not b: return piece
    if '&' in prev + b and ';' not in prev + b: return piece
    if len(prev) + len(b) + 1 > 26: return piece
    if not _re.search(r'[\wÀ-ÿ]', b) or not _re.search(r'[\wÀ-ÿ]', prev): return piece
    return a[:j + 1] + '<span class="tj">' + prev + ' ' + b + '</span>' + trail

def _nb_tokens(txt, tail):
    out = []; pos = 0
    for m in _TOKEN.finditer(txt):
        out.append(txt[pos:m.start()]); out.append('<span class="nb">' + m.group(0) + '</span>'); pos = m.end()
    last = txt[pos:]
    out.append(_tail_join(last) if tail and last.strip() else last)
    return ''.join(out)

_VOID = {'br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'wbr', 'path', 'use', 'circle', 'rect', 'line', 'polyline', 'polygon', 'area', 'col'}
_PLAIN = {'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'dd', 'dt', 'blockquote', 'figcaption',
          'b', 'strong', 'em', 'i', 'small', 'cite', 'u', 'mark', 'sub', 'sup', 'code', 'abbr', 'time'}


def typo(html):
    i = html.find('<body')
    if i < 0: return html
    head, body = html[:i], html[i:]
    parts = _re.split(r'(<[^>]*>)', body)
    out = []; skip = 0; stack = []
    for k, p in enumerate(parts):
        if k % 2 == 1:
            low = p.lower()
            if _re.match(r'<(script|style|textarea|title|svg|option|select)\b', low) and not low.endswith('/>'): skip += 1
            elif _re.match(r'</(script|style|textarea|title|svg|option|select)>', low): skip = max(0, skip - 1)
            m = _re.match(r'<(/?)([a-z0-9]+)', low)
            if m and not skip:
                if m.group(1):
                    if m.group(2) in stack:
                        while stack and stack.pop() != m.group(2): pass
                elif m.group(2) not in _VOID and not low.endswith('/>'):
                    stack.append(m.group(2))
            out.append(p); continue
        if skip or not p.strip():
            out.append(p); continue
        nxt = parts[k + 1] if k + 1 < len(parts) else ''
        r = _nb_tokens(p, bool(_CLOSE.match(nxt)))
        # Textlauf in Flex-/Grid-Eltern bleibt EIN Element (sonst zerfaellt er in Spalten)
        if r != p and (stack[-1] if stack else '') not in _PLAIN:
            r = '<span class="tx">' + r + '</span>'
        out.append(r)
    return head + ''.join(out)


def wr(f, s):
    os.makedirs(os.path.dirname(f) or '.', exist_ok=True)
    open(f, 'w', encoding='utf-8').write(s)


def slug(s):
    s = str(s).lower()
    for a, b in zip('áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'):
        s = s.replace(a, b)
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def tri(v):
    """Text in drei Sprachen; fehlt eine Sprache, gilt Portugiesisch."""
    if not isinstance(v, dict):
        v = {'pt': v or ''}
    base = v.get('pt') or v.get('en') or v.get('es') or ''
    return {k: (v.get(k) or base) for k in LANGS}


def ik(k):
    """Dateiname eines Fotos ohne Ordner und Endung."""
    return slug(os.path.splitext(os.path.basename(str(k)))[0])


# ---------- 1 Inhalte ----------
site = json.loads(rd('content/site.json'))
for k, v in {'uploadUrl': '', 'channelUrl': '', 'theme': 'light', 'instagram': '', 'facebook': '', 'youtube': '', 'tiktok': '', 'brokerUrl': '', 'contactUrl': '', 'newsletterUrl': '', 'gaId': '', 'reviews': [], 'demoNote': False,
             'rate': 11.5, 'buyCosts': 0.045, 'fx': {'date': '', 'USD': 0.178, 'EUR': 0.16}, 'geo': {}, 'stats': {}, 'media': {}}.items():
    site.setdefault(k, v)
site['agent'].setdefault('photo', '')
T = json.loads(rd('src/textos.json'))
T.update(json.loads(rd('src/textos_neu.json')))
V2 = json.loads(rd('src/textos_v2.json'))
T.update(V2)
paises = json.loads(rd('content/paises.json'))
HERO = (site.get('media') or {}).get('hero') or '02'

listings = [json.loads(rd(f)) for f in sorted(glob.glob('content/imoveis/*.json'))]
for l in listings:
    l['slug'] = slug(l.get('slug') or l['name'])
    _p = l.get('price')
    l['por'] = not (isinstance(_p, (int, float)) and _p > 0)   # Preis auf Anfrage / 0 / fehlt
    l['price'] = 0 if l['por'] else _p
    for k in ('price', 'beds', 'baths', 'area', 'lot', 'year', 'beach', 'suites', 'parking', 'condo', 'iptu'):
        l[k] = l.get(k) or 0
    l['imgs'] = [ik(x) for x in (l.get('imgs') or [HERO])]
    l['feats'] = l.get('feats') or []
    l['dist'] = l.get('dist') or {}
    l['desc'] = tri(l.get('desc'))
    l['title'] = tri(l.get('title'))
    hl = l.get('highlights') or {}
    l['highlights'] = {k: (hl.get(k) or hl.get('pt') or []) for k in LANGS}
    l['status'] = l.get('status') or 'disponivel'
    l['date'] = l.get('date') or '2026-01-01'
    l['ref'] = l.get('ref') or l['slug'].upper()[:8]
    for k in ('video', 'plan', 'lat', 'lng', 'temporada'):
        l.setdefault(k, '')
    l['priceBefore'] = l.get('priceBefore') or 0
    l['checks'] = {'matricula': False, 'debts': False, 'date': '', **(l.get('checks') or {})}
    l['plan'] = ik(l['plan']) if l['plan'] else ''
    l['locslug'] = slug(l.get('loc', ''))
    l['cat'] = 'terrenos' if l.get('type') == 'terreno' else ('aluguel' if l.get('deal') == 'aluguel' else 'venda')
listings.sort(key=lambda x: (x.get('ordem') or 999, x['slug']))

taxes = json.loads(rd('content/taxas.json'))
pages = {}
for f in sorted(glob.glob('content/seiten/*.json')):
    pg = json.loads(rd(f))
    pages[pg['slug']] = pg
site['partners'] = []
site['agent'].setdefault('verifiedAt', '')
site['agent'].setdefault('creci', '')
site['agent'].setdefault('photo', '')
site['agent'].setdefault('langs', '')
if not site['agent'].get('initials'):
    site['agent']['initials'] = ''.join(w[0] for w in site['agent']['name'].split()[:2]).upper()
site.setdefault('brandShort', '')
site.setdefault('brandColor', '')
site['agent'].setdefault('creciUrl', 'https://www.cofeci.gov.br/')
posts = [json.loads(rd(f)) for f in sorted(glob.glob('content/blog/*.json'))]
for p in posts:
    p['slug'] = slug(p.get('slug') or tri(p['title'])['pt'])
    for k in ('cat', 'title', 'excerpt'):
        p[k] = tri(p.get(k))
    b = p.get('body')
    b = b if isinstance(b, dict) else {'pt': b or ''}
    b = {k: [x.strip() for x in re.split(r'\n\s*\n', b.get(k) or '') if x.strip()] for k in LANGS}
    p['body'] = {k: (b[k] or b['pt'] or b['en'] or b['es'] or b['de']) for k in LANGS}
    p['img'] = ik(p.get('img') or HERO)
    p['author'] = p.get('author') or site['agent']['name']
    p['read'] = {k: max(1, round(sum(len(x.split()) for x in p['body'][k]) / 200)) for k in LANGS}
posts.sort(key=lambda x: x.get('date', ''), reverse=True)

locs = []
for l in listings:
    if l.get('loc') and l['locslug'] not in [x['slug'] for x in locs]:
        locs.append({'slug': l['locslug'], 'name': l['loc']})
for x in locs:
    mine = [l for l in listings if l['locslug'] == x['slug']]
    x['n'] = len(mine)
    x['img'] = (site.get('locPhotos') or {}).get(x['slug']) or mine[0]['imgs'][-1]
    x['img'] = ik(x['img'])
locs.sort(key=lambda x: (-x['n'], x['name']))

# ---------- 2 Fotos -> WebP in drei Breiten ----------
shutil.rmtree(D, ignore_errors=True)
os.makedirs(D + '/assets')
os.makedirs(D + '/img')
dims = {}
n = 0
for f in sorted(glob.glob('content/fotos/*')):
    stem = ik(f)
    if f.lower().endswith(('.mp4', '.webm', '.mov')):
        continue
    try:
        im = Image.open(f).convert('RGB')
    except Exception as ex:
        print('Foto übersprungen:', f, ex)
        continue
    for suf, w in (('', 1400), ('-s', 760), ('-xs', 480)):
        o = f'{D}/img/{stem}{suf}.webp'
        j = im.copy()
        j.thumbnail((w, w * 3))
        j.save(o, quality=62 if suf == '' else 58, method=6)
        dims[stem + suf] = j.size
    os.makedirs(f'{D}/img/pdf', exist_ok=True)
    jp = im.copy(); jp.thumbnail((900, 900 * 3)); jp.save(f'{D}/img/pdf/{stem}.jpg', quality=80, optimize=True)
    n += 1
print('Fotos:', n)

# ---------- 3 Hilfen für die Vorlagen ----------
ICONS = {
    'arrow': 'M5 12h14M13 6l6 6-6 6', 'check': 'm5 12 5 5 9-10', 'menu': 'M4 7h16M4 12h16M4 17h16', 'close': 'M6 6l12 12M18 6 6 18',
    'bed': 'M3 18v-7h13a5 5 0 0 1 5 5v2M3 11V6M3 15h18M7 11V9h5v2',
    'bath': 'M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zM6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2',
    'area': 'M4 4h16v16H4zM4 9h3M4 14h3M9 20v-3M14 20v-3', 'lot': 'M3 17l9 4 9-4M3 12l9 4 9-4M12 3 3 7l9 4 9-4z',
    'pin': 'M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.800 7 11 7 11zM12 12.500a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5z',
    'phone': 'M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z',
    'mail': 'M3 6h18v12H3zM3 7l9 6 9-6', 'cal': 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
    'car': 'M3 13l2-5.500A2 2 0 0 1 6.900 6h10.200A2 2 0 0 1 19 7.500L21 13v5h-3v-2H6v2H3zM3 13h18M7 16h.010M17 16h.010',
    'camera': 'M4 8h3l2-3h6l2 3h3v11H4zM12 16.500a3.200 3.200 0 1 0 0-6.400 3.200 3.200 0 0 0 0 6.400z',
    'share': 'M12 15V4M8 8l4-4 4 4M5 12v7h14v-7', 'map': 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
    'list': 'M8 6h12M8 12h12M8 18h12M4 6h.010M4 12h.010M4 18h.010', 'doc': 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
    'globe': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
    'home': 'M4 11l8-7 8 7v9h-5v-6H9v6H4z', 'alert': 'M12 3 2 20h20zM12 10v5M12 17.500h.010', 'shield': 'M12 3 5 6v6c0 4.500 3 7.500 7 9 4-1.500 7-4.500 7-9V6zM9 12l2 2 4-4',
    'clock': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2', 'user': 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
    'ig': 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17.500 6.500h.010',
    'heart': 'M12 20s-7-4.500-7-10a4 4 0 0 1 7-2.500A4 4 0 0 1 19 10c0 5.500-7 10-7 10z', 'filter': 'M4 5h16l-6 8v6l-4-2v-4z',
    'tag': 'M3 12V4h8l10 10-8 8zM7.500 8.500h.010', 'sort': 'M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4',
    'road': 'M8 3L5 21M16 3l3 18M12 4v3M12 10.500v3M12 17v3',
    'plane': 'M21 4L10 14M21 4l-6 17-5-7-7-5z',
    'umbrella': 'M3 12a9 9 0 0 1 18 0zM12 12v7a2 2 0 0 0 4 0',
    'flame': 'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z',
    'wave': 'M3 15c2 0 2-2 4.500-2S10 15 12 15s2-2 4.500-2S19 15 21 15M3 19c2 0 2-2 4.500-2S10 19 12 19s2-2 4.500-2S19 19 21 19M8 4v7M14 4v7',
    'wifi': 'M2.500 9a14 14 0 0 1 19 0M5.500 12.500a9.500 9.500 0 0 1 13 0M8.700 16a5 5 0 0 1 6.600 0M12 19.500h.010',
    'snow': 'M12 3v18M4.200 7.500l15.600 9M4.200 16.500l15.600-9',
    'sofa': 'M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3M3 13a2 2 0 0 1 4 0v1h10v-1a2 2 0 0 1 4 0v5H3zM6 18v2M18 18v2',
    'gate': 'M4 20V6M20 20V6M4 8h16M4 14h16M12 6v14',
    'leaf': 'M5 19c0-9 5-14 15-14 0 10-5 15-14 15M5 19l8-8',
    'sun': 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2.500M12 19.500V22M2 12h2.500M19.500 12H22M5 5l1.800 1.800M17.200 17.200 19 19M5 19l1.800-1.800M17.200 6.800 19 5',
    'drop': 'M12 3s6 6.500 6 11a6 6 0 0 1-12 0c0-4.500 6-11 6-11z',
    'bolt': 'M13 3 5 14h6l-1 7 8-11h-6z',
    'eye': 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'info': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.500h.010', 'play': 'M8 5v14l11-7z',
}
WA = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z'
STAR = 'M12 3.500l2.600 5.300 5.900.900-4.300 4.100 1 5.800L12 16.900 6.800 19.600l1-5.800L3.500 9.700l5.900-.900z'
MONTHS = {
    'pt': 'janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro'.split(),
    'en': 'January February March April May June July August September October November December'.split(),
    'de': 'Januar Februar März April Mai Juni Juli August September Oktober November Dezember'.split(),
    'es': 'enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre'.split(),
}
FLG = {
    'pt': Markup('<svg viewBox="0 0 28 20"><rect width="28" height="20" fill="#009c3b"/><path d="M14 2.500L25 10 14 17.500 3 10z" fill="#ffdf00"/><circle cx="14" cy="10" r="4.300" fill="#002776"/></svg>'),
    'en': Markup('<svg viewBox="0 0 28 20"><rect width="28" height="20" fill="#012169"/><path d="M0 0l28 20M28 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0l28 20M28 0L0 20" stroke="#c8102e" stroke-width="1.600"/><path d="M14 0v20M0 10h28" stroke="#fff" stroke-width="6"/><path d="M14 0v20M0 10h28" stroke="#c8102e" stroke-width="3.400"/></svg>'),
    'es': Markup('<svg viewBox="0 0 28 20"><rect width="28" height="20" fill="#c60b1e"/><rect y="5" width="28" height="10" fill="#ffc400"/></svg>'),
    'de': Markup('<svg viewBox="0 0 28 20"><rect width="28" height="7" fill="#000"/><rect y="7" width="28" height="6" fill="#d00"/><rect y="13" width="28" height="7" fill="#ffce00"/></svg>'),
}
e = lambda s: html.escape(str(s), quote=True)


def icon(n, cls='ico'):
    return Markup(f'<svg class="{cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="{ICONS[n]}"/></svg>')


def wa_icon(cls='ico-wa'):
    return Markup(f'<svg class="{cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="{WA}"/></svg>')


def stars():
    return Markup('<div class="stars" aria-hidden="true">' + f'<svg viewBox="0 0 24 24"><path d="{STAR}"/></svg>' * 5 + '</div>')


def path(route, lang):
    pre = '' if lang == 'pt' else lang + '/'
    if route == 'home':
        return pre
    for a, b in (('imoveis-', 'imoveis/'), ('imovel-', 'imovel/'), ('artigo-', 'blog/')):
        if route.startswith(a):
            return pre + b + route[len(a):] + '/'
    return pre + route + '/'


def nf(n, lang, d=0):
    s = f'{n:,.{d}f}'
    return s if lang == 'en' else s.replace(',', '§').replace('.', ',').replace('§', '.')


def _lum(h):
    r, g, b = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    f = lambda v: v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def brand_css(hexcol):
    """Markenfarbe aus site.json: wird so abgedunkelt, dass weißer Text darauf mindestens Kontrast 4,5:1 hat."""
    h = (hexcol or '').strip()
    if not re.fullmatch(r'#[0-9a-fA-F]{6}', h):
        return ''
    r, g, b = [int(h[i:i + 2], 16) for i in (1, 3, 5)]
    k = 1.0
    while (1.05 / (_lum('#%02x%02x%02x' % (int(r * k), int(g * k), int(b * k))) + 0.05)) < 4.5 and k > 0.05:
        k -= 0.03
    main = '#%02x%02x%02x' % (int(r * k), int(g * k), int(b * k))
    k2 = min(1.0, k + 0.12)
    two = '#%02x%02x%02x' % (int(r * k2), int(g * k2), int(b * k2))
    return f':root{{--brand:{main};--brand-2:{two};--on-brand:#FFFFFF}}'


BRANDCSS = brand_css(site.get('brandColor'))


def make_ctx(lang, route):
    yrs = int((site.get('stats') or {}).get('years') or 0)
    fill = lambda s: s.replace('{years}', str(yrs)).replace('{since}', str(datetime.date.today().year - yrs))
    t = {k: fill((v.get(lang) or v.get('pt') or '') if isinstance(v, dict) else v) for k, v in T.items()}
    L = lambda o: '' if o is None else (o if isinstance(o, str) else (o.get(lang) or o.get('pt') or ''))
    url = lambda r, lg=None: BASE + path(r, lg or lang)

    def pic(k, sizes='100vw', alt='', cls='', eager=False, defer=False):
        k = ik(k)
        dm = dims.get(k, (1400, 933))
        src = f'{BASE}img/{k}-s.webp' if not eager else f'{BASE}img/{k}.webp'
        ss = f'{BASE}img/{k}-xs.webp 480w, {BASE}img/{k}-s.webp 760w, {BASE}img/{k}.webp 1400w'
        extra = 'fetchpriority="high" decoding="async"' if eager else 'loading="lazy" decoding="async"'
        c = f' class="{cls}"' if cls else ''
        if defer:   # Foto wird erst geladen, wenn der Besucher die Karte berührt
            return Markup(f'<img{c} data-src="{src}" data-srcset="{ss}" sizes="{sizes}" width="{dm[0]}" height="{dm[1]}" alt="{e(alt)}" decoding="async">')
        return Markup(f'<img{c} src="{src}" srcset="{ss}" sizes="{sizes}" width="{dm[0]}" height="{dm[1]}" alt="{e(alt)}" {extra}>')

    def money(v):
        return 'R$ ' + nf(round(v), lang)

    def price(l, tag='span'):
        if l['por']:
            return Markup(f'<{tag}>{e(t["priceOnReq"])}</{tag}>')
        suf = t['perMonth'] if l['deal'] == 'aluguel' else ''
        return Markup(f'<{tag} data-brl="{int(l["price"])}">{money(l["price"])}</{tag}>' + (f'<small>{e(suf)}</small>' if suf else ''))

    def fdate(d):
        y, m, dd = [int(x) for x in d.split('-')]
        mo = MONTHS[lang][m - 1]
        return {'pt': f'{dd} de {mo} de {y}', 'en': f'{dd} {mo} {y}', 'es': f'{dd} de {mo} de {y}', 'de': f'{dd}. {mo} {y}'}[lang]

    def plural(n, one, many):
        return f'{n} {t[one] if n == 1 else t[many]}'

    def wa(text=''):
        from urllib.parse import quote
        return f'https://wa.me/{site["wa"]}' + (f'?text={quote(text)}' if text else '')

    def facts(l):
        """Eckdaten einer Anzeige als Liste (Symbol, Zahl, Wort)."""
        o = []
        if l['beds']:
            o.append(('bed', l['beds'], t['bed1'] if l['beds'] == 1 else t['beds']))
        if l['baths']:
            o.append(('bath', l['baths'], t['bath1'] if l['baths'] == 1 else t['baths']))
        if l['area']:
            o.append(('area', nf(l['area'], lang), 'm²'))
        if l['lot'] and (l['type'] == 'terreno' or not l['area']):
            o.append(('lot', nf(l['lot'], lang), 'm² ' + t['lotWord']))
        return o

    return dict(lang=lang, hl=HL[lang], route=route, t=t, L=L, url=url, pic=pic, money=money, price=price, fdate=fdate,
                plural=plural, wa=wa, facts=facts, icon=icon, wa_icon=wa_icon, stars=stars, nf=lambda n, d=0: nf(n, lang, d),
                site=site, taxes=taxes, paises=paises, v2={k: t[k] for k in V2}, pages=pages, listings=listings, posts=posts, locs=locs, langs=LANGS, base=BASE, origin=ORIGIN,
                alt_url=lambda lg: BASE + path(route, lg), abs=lambda r, lg=None: ORIGIN + BASE + path(r, lg or lang),
                img=lambda k, s='': f'{BASE}img/{ik(k)}{s}.webp', imgabs=lambda k: f'{ORIGIN}{BASE}img/{ik(k)}.webp',
                year=datetime.date.today().year, demo=bool(site.get('demoNote')))


# ---------- 4 Stil und Skript ----------
css = rd('src/site.css') + '\n' + rd('src/guia.css')
css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
css = re.sub(r'\s*\n\s*', '\n', css).strip()
JSPRE = "(function(){var ac=window.__ac=new AbortController(),sig=ac.signal;window.__orig=window.__orig||{d:document.addEventListener,w:window.addEventListener};function wrap(o){return function(t,f,p){if(typeof p==='boolean')p={capture:p};p=Object.assign({},p||{});if(!p.signal)p.signal=sig;return o.call(this,t,f,p)}}document.addEventListener=wrap(window.__orig.d);window.addEventListener=wrap(window.__orig.w)})();\n"
JSPOST = '\ndocument.addEventListener=window.__orig.d;window.addEventListener=window.__orig.w;'
js = JSPRE + rd('src/site.js') + '\n' + rd('src/guia.js') + JSPOST
hc = hashlib.md5(css.encode()).hexdigest()[:8]
hj = hashlib.md5(js.encode()).hexdigest()[:8]
wr(f'{D}/assets/site.{hc}.css', css)
wr(f'{D}/assets/site.{hj}.js', js)
for f in glob.glob('src/fonts/*.woff2'):
    shutil.copy(f, f'{D}/assets/{os.path.basename(f)}')
shutil.copy('src/static/map-pipa.jpg', f'{D}/assets/map-pipa.jpg')
shutil.copy('src/static/map-pipa-wide.jpg', f'{D}/assets/map-pipa-wide.jpg')
if os.path.isdir('content/video'):   # kurze Videos (z. B. Einstieg) werden unverändert übernommen
    shutil.copytree('content/video', f'{D}/video')
lcss = rd('src/vendor/leaflet.css')
lcss = re.sub(r'url\(images/[^)]*\)', 'none', lcss)   # Standard-Marker werden nicht benutzt
wr(f'{D}/assets/leaflet.css', lcss)
shutil.copy('src/vendor/leaflet.js', f'{D}/assets/leaflet.js')

env = Environment(loader=FileSystemLoader('src/templates'), autoescape=True, undefined=StrictUndefined, trim_blocks=True, lstrip_blocks=True)
env.globals.update(brandcss=BRANDCSS, FLG=FLG, css_file=f'{BASE}assets/site.{hc}.css', js_file=f'{BASE}assets/site.{hj}.js')
env.filters['tojson_safe'] = lambda o: Markup(json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/'))


# ---------- 5 Schema-Daten ----------
def org_ld(lang):
    a = site.get('geo') or {}
    return {'@type': 'RealEstateAgent', '@id': ORIGIN + BASE + '#org', 'name': site['brandFull'], 'url': ORIGIN + BASE + path('home', lang),
            'image': f'{ORIGIN}{BASE}img/{ik(HERO)}.webp', 'telephone': site['phone'], 'email': site['email'],
            'address': {'@type': 'PostalAddress', 'streetAddress': site['address'].split('·')[0].strip(), 'addressLocality': site.get('city', ''),
                        'addressRegion': site.get('state', ''), 'addressCountry': 'BR'},
            'geo': {'@type': 'GeoCoordinates', 'latitude': a.get('lat'), 'longitude': a.get('lng')},
            'openingHours': site.get('openingHours', ''), 'areaServed': [x['name'] for x in locs], 'knowsLanguage': ['pt-BR', 'en', 'es', 'de'],
            'priceRange': 'R$', **({'sameAs': [u for u in (site.get(k) for k in ('instagram','facebook','youtube','tiktok')) if u]})}


def crumbs_ld(items):
    return {'@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': u} for i, (n, u) in enumerate(items)]}


def listing_ld(l, lang, c):
    kind = {'casa': 'SingleFamilyResidence', 'apartamento': 'Apartment'}.get(l['type'], 'Place')
    ent = {'@type': kind, 'name': l['name'], 'address': {'@type': 'PostalAddress', 'addressLocality': l.get('loc', ''), 'addressRegion': site.get('state', ''), 'addressCountry': 'BR'}}
    if l.get('lat'):
        ent['geo'] = {'@type': 'GeoCoordinates', 'latitude': l['lat'], 'longitude': l['lng']}
    if l['beds']:
        ent['numberOfBedrooms'] = l['beds']
    if l['baths']:
        ent['numberOfBathroomsTotal'] = l['baths']
    if l['area']:
        ent['floorSize'] = {'@type': 'QuantitativeValue', 'value': l['area'], 'unitCode': 'MTK'}
    if l['year']:
        ent['yearBuilt'] = l['year']
    return {'@type': 'RealEstateListing', 'name': f"{l['name']} – {l['title'][lang]}", 'description': l['desc'][lang].split('\n')[0],
            'url': c['abs']('imovel-' + l['slug']), 'datePosted': l['date'], 'identifier': l['ref'], 'inLanguage': HL[lang],
            'image': [c['imgabs'](k) for k in l['imgs']],
            'offers': {'@type': 'Offer', **({'price': int(l['price']), 'priceCurrency': 'BRL'} if not l['por'] else {}),
                       'availability': 'https://schema.org/' + ('LimitedAvailability' if l['status'] == 'reservado' else 'InStock'),
                       'businessFunction': 'http://purl.org/goodrelations/v1#' + ('LeaseOut' if l['deal'] == 'aluguel' else 'Sell'),
                       'seller': {'@id': ORIGIN + BASE + '#org'}},
            'mainEntity': ent}


def clip(s, n=155):
    """Kürzt am Satzende, sonst am Wortende."""
    if len(s) <= n:
        return s
    cut = s[:n]
    i = cut.rfind('. ')
    return cut[:i + 1] if i > 60 else cut[:cut.rfind(' ')] + '…'


def ld(graph):
    return json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')


# ---------- 6 Seiten ----------
CATS = {'imoveis': None, 'imoveis-venda': 'venda', 'imoveis-aluguel': 'aluguel', 'imoveis-terrenos': 'terrenos'}
routes = ['home', 'imoveis', 'imoveis-venda', 'imoveis-aluguel', 'imoveis-terrenos', 'sobre', 'blog', 'contato', 'privacidade'] + list(pages) \
    + ['imovel-' + l['slug'] for l in listings] + ['artigo-' + p['slug'] for p in posts]
urls = []


def pins(ls, c):
    return [{'slug': l['slug'], 'name': l['name'], 'loc': l.get('loc', ''), 'lat': l['lat'], 'lng': l['lng'], 'price': int(l['price']), 'por': l['por'],
             'rent': l['deal'] == 'aluguel', 'img': c['img'](l['imgs'][0], '-xs'), 'url': c['url']('imovel-' + l['slug'])} for l in ls if l.get('lat')]


for lang in LANGS:
    for route in routes:
        c = make_ctx(lang, route)
        t = c['t']
        brand = site['brandFull']
        home = (t['navHome'], c['abs']('home'))
        graph = [org_ld(lang)]
        if route == 'home':
            tpl = 'home.html'
            title, desc = f"{brand} · {t['metaHomeTitle']}", t['metaHome']
            feat = [l for l in listings if l['cat'] != 'terrenos'][:6]
            c.update(featured=feat, pins=pins(listings, c), calc_price=int(next((l['price'] for l in listings if l['deal'] == 'venda' and l['price']), 1000000)))
            graph += [{'@type': 'WebSite', 'name': brand, 'url': c['abs']('home'), 'inLanguage': HL[lang]},
                      {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': t[f'fq{i}'], 'acceptedAnswer': {'@type': 'Answer', 'text': t[f'fq{i}a']}} for i in range(1, 6)]}]
        elif route in CATS:
            tpl = 'lista.html'
            cat = CATS[route]
            ls = [l for l in listings if (cat is None or l['cat'] == cat or (cat == 'venda' and l['cat'] == 'terrenos'))]
            key = {'venda': 'Venda', 'aluguel': 'Aluguel', 'terrenos': 'Terrenos', None: 'All'}[cat]
            title, desc = f"{t['list' + key + 'H']} · {brand}", t['list' + key + 'D']
            c.update(cat=cat, items=ls, h1=t['list' + key + 'H'], lead=t['list' + key + 'D'], pins=pins(ls, c),
                     maxopts=[3000, 5000, 10000, 20000] if cat == 'aluguel' else [500000, 1000000, 2000000, 3000000, 5000000])
            graph += [crumbs_ld([home, (t['navAll'], c['abs']('imoveis'))] + ([(t['list' + key + 'H'], c['abs'](route))] if cat else [])),
                      {'@type': 'ItemList', 'numberOfItems': len(ls), 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'url': c['abs']('imovel-' + l['slug']), 'name': l['name']} for i, l in enumerate(ls)]}]
        elif route.startswith('imovel-'):
            tpl = 'imovel.html'
            l = next(x for x in listings if x['slug'] == route[7:])
            sim = [x for x in listings if x['slug'] != l['slug'] and x['cat'] == l['cat'] and (not l['price'] or not x['price'] or 0.4 <= x['price'] / l['price'] <= 2.5)]
            sim = sorted(sim, key=lambda x: (x.get('type') != l.get('type'), abs(x['price'] - l['price']) if l['price'] and x['price'] else 0))[:3]
            catroute = 'imoveis-' + ('venda' if l['cat'] == 'terrenos' else l['cat'])
            catname = t[{'venda': 'navBuy', 'aluguel': 'navRent', 'terrenos': 'navBuy'}[l['cat']]]
            title = f"{l['name']}, {l['loc']} · {brand}"
            desc = clip(l['title'][lang] + '. ' + l['desc'][lang].split('\n')[0])
            c.update(msg=f"{t['waInterest']} {l['name']} ({l['ref']}).", l=l, similar=sim, catroute=catroute, catname=catname, pins=pins([l], c), calc_price=int(l['price'] or 1000000))
            graph += [crumbs_ld([home, (catname, c['abs'](catroute)), (l['name'], c['abs'](route))]), listing_ld(l, lang, c)]
        elif route in pages:
            tpl = 'guia.html'
            pg = pages[route]
            title, desc = f"{pg['h1'][lang]} · {brand}", pg['meta'][lang]
            c.update(pg=pg)
            graph += [crumbs_ld([home, (pg['nav'][lang], c['abs'](route))])]
            fq = [b for b in pg['blocks'] if b['t'] == 'faq']
            if fq:
                graph += [{'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': i['q'][lang], 'acceptedAnswer': {'@type': 'Answer', 'text': i['a'][lang]}} for i in fq[0]['x']]}]
        elif route == 'sobre':
            tpl, title, desc = 'sobre.html', f"{t['aboutTitle']} · {brand}", t['aboutMeta']
            graph += [crumbs_ld([home, (t['navAbout'], c['abs'](route))])]
        elif route == 'blog':
            tpl, title, desc = 'blog.html', f"{t['blogH']} · {brand}", t['blogLead']
            graph += [crumbs_ld([home, (t['navGuide'], c['abs'](route))]),
                      {'@type': 'Blog', 'name': t['blogH'], 'url': c['abs'](route), 'blogPost': [{'@type': 'BlogPosting', 'headline': p['title'][lang], 'url': c['abs']('artigo-' + p['slug']), 'datePublished': p['date']} for p in posts]}]
        elif route.startswith('artigo-'):
            tpl = 'artigo.html'
            p = next(x for x in posts if x['slug'] == route[7:])
            title, desc = f"{p['title'][lang]} · {brand}", p['excerpt'][lang]
            rel = [l for l in listings if l['status'] != 'reservado'][:3]
            c.update(p=p, others=[x for x in posts if x['slug'] != p['slug']][:3], rel=rel)
            graph += [crumbs_ld([home, (t['navGuide'], c['abs']('blog')), (p['title'][lang], c['abs'](route))]),
                      {'@type': 'BlogPosting', 'headline': p['title'][lang], 'description': p['excerpt'][lang], 'image': c['imgabs'](p['img']), 'datePublished': p['date'],
                       'dateModified': p.get('updated') or p['date'], 'inLanguage': HL[lang], 'mainEntityOfPage': c['abs'](route),
                       'author': {'@type': 'Person', 'name': p['author']}, 'publisher': {'@id': ORIGIN + BASE + '#org'}}]
        elif route == 'contato':
            tpl, title, desc = 'contato.html', f"{t['contactH']} · {brand}", t['contactMeta']
            graph += [crumbs_ld([home, (t['navContact'], c['abs'](route))])]
        else:
            tpl, title, desc = 'privacidade.html', f"{t['privH']} · {brand}", t['privMeta']
        og = c['imgabs'](c['l']['imgs'][0] if 'l' in c else (c['p']['img'] if 'p' in c else HERO))
        c.update(oglocale={'pt': 'pt_BR', 'en': 'en_US', 'es': 'es_ES', 'de': 'de_DE'}[lang], title=title, desc=desc, canonical=c['abs'](route), ogimg=og, ld=Markup(ld(graph)), noindex=False,
                 alts=[(HL[x], ORIGIN + BASE + path(route, x)) for x in LANGS], xdef=ORIGIN + BASE + path(route, 'pt'))
        out = typo(env.get_template(tpl).render(**c))
        wr(f'{D}/{path(route, lang)}index.html', out)
        urls.append((route, lang))


# ---------- 6b Exposé-Seiten (Druckvorlage für das PDF, nicht indexiert) ----------
FICHA_CSS = rd('src/ficha.css')
for lang in LANGS:
    for l in listings:
        c = make_ctx(lang, 'imovel-' + l['slug'])
        c.update(l=l, ficha_css=FICHA_CSS, today_str=datetime.date.today().strftime('%d.%m.%Y'))
        wr(f'{D}/ficha/{lang}/{l["slug"]}/index.html', env.get_template('ficha.html').render(**c))

c = make_ctx('pt', 'home')
c.update(oglocale='pt_BR', title=site['brandFull'], desc='', canonical='', ogimg='', ld=Markup('{}'), noindex=True, alts=[], xdef='')
wr(f'{D}/404.html', typo(env.get_template('404.html').render(**c)))

# ---------- 7 sitemap, robots, llms.txt, IndexNow ----------
today = datetime.date.today().isoformat()
U = lambda r, l: ORIGIN + BASE + path(r, l)
sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
for r, l in urls:
    lm = next((p.get('updated') or p.get('date') for p in posts if r == 'artigo-' + p['slug']), None) \
        or next((x['date'] for x in listings if r == 'imovel-' + x['slug']), today)
    sm += f' <url><loc>{U(r, l)}</loc><lastmod>{lm}</lastmod>' + ''.join(f'<xhtml:link rel="alternate" hreflang="{HL[x]}" href="{U(r, x)}"/>' for x in LANGS) + '</url>\n'
wr(f'{D}/sitemap.xml', sm + '</urlset>\n')
bots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Bingbot', 'Applebot-Extended', 'CCBot']
wr(f'{D}/robots.txt', 'User-agent: *\nAllow: /\n\n' + ''.join(f'User-agent: {x}\nAllow: /\n\n' for x in bots) + f'Sitemap: {ORIGIN}{BASE}sitemap.xml\n')

te = {k: (v.get('en') or v.get('pt')) if isinstance(v, dict) else v for k, v in T.items()}
deal = {'venda': 'for sale', 'aluguel': 'for rent'}
x = f"# {site['brandFull']}\n\n> Real estate agency in Pipa and Tibau do Sul (Rio Grande do Norte, Brazil): houses, apartments and land to buy or rent. Service in Portuguese, English and German. Prices in Brazilian reais (BRL).\n\n"
x += f"- Phone / WhatsApp: {site['phone']}\n- Email: {site['email']}\n- Licence: {site['agent']['creci']}\n- Address: {site['address']}\n- Opening hours: {site['hours']['en']}\n- Languages: [Português]({U('home', 'pt')}), [English]({U('home', 'en')}), [Español]({U('home', 'es')}), [Deutsch]({U('home', 'de')})\n\n## Properties\n\n"
for l in listings:
    f = [deal.get(l.get('deal'), ''), l.get('loc', ''), f"BRL {int(l['price']):,}" + (' per month' if l['deal'] == 'aluguel' else ''), 'ref ' + l['ref']]
    if l['beds']:
        f.append(f"{l['beds']} bedroom" + ('s' if l['beds'] != 1 else ''))
    if l['baths']:
        f.append(f"{l['baths']} bathroom" + ('s' if l['baths'] != 1 else ''))
    if l['area']:
        f.append(f"{l['area']:,} m² built")
    if l['lot']:
        f.append(f"{l['lot']:,} m² plot")
    if l['status'] == 'reservado':
        f.append('reserved')
    x += f"- [{l['name']}]({U('imovel-' + l['slug'], 'en')}): {', '.join(v for v in f if v)}. {l['desc']['en'].split(chr(10))[0]} ([Português]({U('imovel-' + l['slug'], 'pt')}), [Español]({U('imovel-' + l['slug'], 'es')}), [Deutsch]({U('imovel-' + l['slug'], 'de')}))\n"
x += "\n## Guides\n\n" + ''.join(f"- [{p['title']['en']}]({U('artigo-' + p['slug'], 'en')}): {p['excerpt']['en']}\n" for p in posts)
x += '\n## Frequently asked questions\n\n' + ''.join(f"- **{te['fq' + str(i)]}** {te['fq' + str(i) + 'a']}\n" for i in range(1, 6))
x += f"\n## Pages\n\n- [All properties]({U('imoveis', 'en')})\n- [For sale]({U('imoveis-venda', 'en')})\n- [Rentals]({U('imoveis-aluguel', 'en')})\n- [Land]({U('imoveis-terrenos', 'en')})\n- [Buying guide]({U('comprar', 'en')})\n- [Buying from abroad]({U('comprar-do-exterior', 'en')})\n- [Avoiding scams]({U('golpes', 'en')})\n- [Sell]({U('vender', 'en')})\n- [About the agency]({U('sobre', 'en')})\n- [Contact]({U('contato', 'en')})\n- [Sitemap]({ORIGIN}{BASE}sitemap.xml)\n"
wr(f'{D}/llms.txt', x)
wr(f'{D}/{INDEXNOW_KEY}.txt', INDEXNOW_KEY)
wr(f'{D}/indexnow.json', json.dumps({'host': ORIGIN.split('//')[1], 'key': INDEXNOW_KEY, 'keyLocation': f'{ORIGIN}{BASE}{INDEXNOW_KEY}.txt', 'urlList': [U(r, l) for r, l in urls]}))
wr(f'{D}/.nojekyll', '')
print('Seiten:', len(urls), '· CSS', len(css) // 1024, 'KB · JS', len(js) // 1024, 'KB')
