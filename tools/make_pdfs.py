"""Erzeugt aus den Druckseiten dist/ficha/<sprache>/<objekt>/ die PDF-Exposés dist/pdf/<sprache>/<objekt>.pdf.
Braucht: pip install playwright && playwright install chromium. Aufruf nach build.py (gleiche SITE_BASE)."""
import os, sys, threading, tempfile, http.server, functools, glob, re
from playwright.sync_api import sync_playwright
BASE = os.environ.get('SITE_BASE', '/')
D = 'dist'
root = tempfile.mkdtemp()
if BASE != '/':
    os.makedirs(os.path.join(root, BASE.strip('/')).rsplit('/', 1)[0] or root, exist_ok=True)
    os.symlink(os.path.abspath(D), os.path.join(root, BASE.strip('/')))
else:
    root = os.path.abspath(D)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a, **k): pass
H = functools.partial(Q, directory=root)
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
port = srv.server_address[1]
pages = sorted(glob.glob(f'{D}/ficha/*/*/index.html'))
n = 0
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    for f in pages:
        _, _, lang, slug, _ = f.split('/')
        pg.goto(f'http://127.0.0.1:{port}{BASE}ficha/{lang}/{slug}/'); pg.wait_for_load_state('networkidle')
        out = f'{D}/pdf/{lang}/{slug}.pdf'; os.makedirs(os.path.dirname(out), exist_ok=True)
        pg.pdf(path=out, format='A4', print_background=True, prefer_css_page_size=True); n += 1
    b.close()
import shutil
shutil.rmtree(f'{D}/img/pdf', ignore_errors=True); shutil.rmtree(f'{D}/ficha', ignore_errors=True)
print('PDFs:', n)
