(function () {
  'use strict';
  var S = window.SITE || {}, T = S.t || {};
  var $ = function (q, r) { return (r || document).querySelector(q); }, $$ = function (q, r) { return Array.prototype.slice.call((r || document).querySelectorAll(q)); };
  var nf = function (n, d) { return Number(n).toLocaleString(S.lang === 'en' ? 'en-US' : (S.lang === 'es' ? 'es-AR' : (S.lang === 'de' ? 'de-DE' : 'pt-BR')), { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  /* ---------- Rechner und Checklisten der Guide-Seiten ---------- */
  var num = function (v) { v = String(v || '').replace(/[^\d,.-]/g, ''); if (S.lang === 'en') return parseFloat(v.replace(/,/g, '')) || 0; if (/,\d{1,2}$/.test(v)) v = v.replace(/\./g, '').replace(',', '.'); else v = v.replace(/[.,]/g, ''); return parseFloat(v) || 0; };
  var rs = function (v) { return 'R$\u00a0' + nf(Math.round(v)); };
  var TX = S.taxes || {};
  $$('[data-w=buycosts]').forEach(function (w) {
    var g = function (k) { return $('[data-i=' + k + ']', w); }, o = function (k, v) { $('[data-o=' + k + ']', w).textContent = v; };
    function run() {
      var p = num(g('price').value), itiv = p * num(g('itiv').value) / 100, lo = p * ((TX.iof || {}).min || 0) / 100, hi = p * ((TX.iof || {}).max || 0.38) / 100;
      var tr = Math.max(0, num(g('docs').value)) * (TX.docPrice || 129), reg = num(g('reg').value), law = num(g('law').value);
      var nt = TX.notar || {}, nok = p === nt.example_price;
      o('itiv', rs(itiv)); o('iof', rs(lo) + ' – ' + rs(hi)); o('tr', rs(tr));
      o('not', nok ? rs(nt.value) + ' (' + T.cbNotEx + ')' : T.cbNotOpen);
      var base = itiv + tr + reg + law + (nok ? nt.value : 0);
      o('total', rs(base + lo) + ' – ' + rs(base + hi));
    }
    $$('input', w).forEach(function (i) { i.addEventListener('input', run); }); run();
  });
  $$('[data-w=gains]').forEach(function (w) {
    var g = function (k) { return $('[data-i=' + k + ']', w); }, o = function (k, v) { $('[data-o=' + k + ']', w).textContent = v; };
    function run() {
      var gain = Math.max(0, num(g('sale').value) - num(g('buy').value)), tax = 0, G = (TX.gains || {});
      if (g('who').value === 'non') tax = gain * (G.nonresident || 0.15);
      else { var prev = 0; (G.resident || []).forEach(function (b) { var top = b[0] === null ? Infinity : b[0]; if (gain > prev) tax += (Math.min(gain, top) - prev) * b[1]; prev = top; }); }
      o('gain', rs(gain)); o('tax', rs(tax)); o('net', rs(num(g('sale').value) - tax));
    }
    $$('input,select', w).forEach(function (i) { i.addEventListener('input', run); i.addEventListener('change', run); }); run();
  });
  $$('[data-chk]').forEach(function (box) {
    var boxes = $$('input[type=checkbox]', box), n = $('[data-chk-n]', box);
    var cnt = function () { n.textContent = boxes.filter(function (x) { return x.checked; }).length; }; boxes.forEach(function (b) { b.addEventListener('change', cnt); }); cnt(); addEventListener('pageshow', cnt);
    $('[data-chk-wa]', box).addEventListener('click', function () {
      var l = [box.dataset.title, ''];
      boxes.forEach(function (b) { l.push((b.checked ? '[x] ' : '[ ] ') + b.nextElementSibling.textContent); });
      window.open('https://wa.me/' + S.wa + '?text=' + encodeURIComponent(l.join('\n')), '_blank', 'noopener');
    });
  });

  /* ---------- gemeinsame Helfer ---------- */
  var V = S.v || {};
  var waLink = function (txt) { return 'https://wa.me/' + S.wa + '?text=' + encodeURIComponent(txt); };
  var LOCALE = { pt: 'pt-BR', en: 'en', es: 'es', de: 'de' }[S.lang] || 'pt-BR';
  var countries = function () {
    var dn = null; try { dn = new Intl.DisplayNames([LOCALE], { type: 'region' }); } catch (e) {}
    var top = ['AR', 'BR', 'US', 'DE', 'UY', 'CL', 'PT', 'ES', 'IT', 'FR', 'GB', 'CH'], all = (S.cc || []);
    var nm = function (c) { return dn ? (dn.of(c) || c) : c; };
    var rest = all.filter(function (c) { return top.indexOf(c) < 0; }).map(function (c) { return [c, nm(c)]; }).sort(function (a, b) { return a[1].localeCompare(b[1], LOCALE); });
    return top.filter(function (c) { return all.indexOf(c) > -1; }).map(function (c) { return [c, nm(c)]; }).concat(rest);
  };
  var fillCountries = function (sel) { countries().forEach(function (c) { var o = document.createElement('option'); o.value = c[0]; o.textContent = c[1]; sel.appendChild(o); }); };

  /* ---------- Wunsch-Knopf ---------- */
  $$('[data-wish]').forEach(function (w) {
    var st = { deal: 'buy', where: '', price: '', beds: '' }, from = $('[data-wish-from]', w);
    if (from) fillCountries(from);
    var upd = function () {
      $$('[data-wp]', w).forEach(function (g) { g.hidden = g.dataset.wp !== st.deal; });
      var lines = [V.wMsg, '', V.wMsgDeal + ': ' + (st.deal === 'buy' ? V.wBuy : V.wRent)];
      if (st.where) lines.push(V.wMsgWhere + ': ' + st.where);
      if (st.price) lines.push(V.wMsgPrice + ': R$ ' + nf(st.price));
      if (st.beds) lines.push(V.wMsgBeds + ': ' + st.beds + '+');
      if (from && from.value) lines.push(V.wMsgFrom + ': ' + from.options[from.selectedIndex].textContent);
      lines.push('', V.wMsgEnd);
      $('[data-wish-wa]', w).href = waLink(lines.join('\n'));
    };
    $$('[data-wg]', w).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.wg; if (k === 'price' && b.getAttribute('aria-pressed') === 'true' && false) return;
        $$('[data-wg="' + k + '"]', w).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        st[k] = b.dataset.v; if (k === 'deal') { st.price = ''; $$('[data-wg=price]', w).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); } upd();
      });
    });
    $$('select[data-wg]', w).forEach(function (sel) {
      sel.addEventListener('change', function () {
        var k = sel.dataset.wg; st[k] = sel.value;
        if (k === 'deal') { st.price = ''; $$('select[data-wg=price]', w).forEach(function (x) { x.value = ''; }); }
        upd();
      });
    });
    if (from) from.addEventListener('change', upd);
    upd();
  });

  /* ---------- Länderauswahl ---------- */
  var UF = ['Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal', 'Espírito Santo', 'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Pará', 'Paraíba', 'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia', 'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'];
  $$('[data-cp]').forEach(function (cp) {
    var sel = $('[data-cp-sel]', cp), br = $('[data-cp-br]', cp), stt = $('[data-cp-state]', cp), city = $('[data-cp-city]', cp), out = $('[data-cp-out]', cp), wa = $('[data-cp-wa]', cp);
    fillCountries(sel);
    UF.forEach(function (u) { var o = document.createElement('option'); o.value = u; o.textContent = u; stt.appendChild(o); });
    stt.value = 'Rio Grande do Norte';
    var li = function (arr) { return '<ul class="cp-ul">' + arr.map(function (x) { return '<li><svg class="ico" viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg><span>' + x + '</span></li>'; }).join('') + '</ul>'; };
    var run = function () {
      var c = sel.value; br.hidden = c !== 'BR';
      if (!c) { out.innerHTML = ''; wa.hidden = true; return; }
      var name = sel.options[sel.selectedIndex].textContent, h = '', where = name;
      if (c === 'BR') {
        h = '<p class="cp-lead">' + V.cpBr + '</p>' + li([V.cpBr1, V.cpBr2, V.cpBr3, V.cpBr4]);
        where = name + ' (' + (city.value ? city.value + ', ' : '') + stt.value + ')';
      } else {
        var ap = (S.ap || []).indexOf(c) > -1;
        h = '<p class="cp-lead ' + (ap ? 'ok' : 'warn') + '">' + (ap ? V.cpAp : V.cpNoAp) + '</p>' + li([V.cpL1, V.cpL2, ap ? V.cpL3 : V.cpL3n, ap ? V.cpL4 : V.cpL4n, V.cpL5, V.cpL6]);
        if (c === 'AR') h += '<p class="g-unclear"><svg class="ico" viewBox="0 0 24 24"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.500h.010"/></svg><span>' + V.cpAR + '</span></p>';
        else h += '<p class="g-unclear"><svg class="ico" viewBox="0 0 24 24"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.500h.010"/></svg><span>' + V.cpUn + '</span></p>';
        h += '<p class="g-p">' + V.cpTr + '</p>';
      }
      out.innerHTML = h; wa.hidden = false;
      wa.href = waLink(V.cpMsg + ' ' + where + '. ' + V.cpMsgEnd);
    };
    [sel, stt].forEach(function (x) { x.addEventListener('change', run); }); city.addEventListener('input', run);
  });

  /* ---------- Verkauf: Upload ---------- */
  $$('[data-sellup]').forEach(function (f) {
    var msg = $('.form-msg', f);
    $$('[data-up]', f).forEach(function (i) { i.addEventListener('change', function () { var n = i.parentNode.querySelector('[data-up-n]'); n.textContent = i.files.length ? i.files.length + ' ' + V.suFiles : ''; }); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = f.elements.name.value.trim(), ph = f.elements.phone.value.trim();
      if (!name || !/^\+?[\d\s().-]{8,}$/.test(ph)) { msg.textContent = T.required || '*'; msg.className = 'form-msg err'; return; }
      var files = $$('[data-up]', f).reduce(function (a, i) { return a.concat(Array.prototype.slice.call(i.files)); }, []);
      if (files.length > 20 || files.some(function (x) { return x.size > 10 * 1024 * 1024; })) { msg.textContent = V.suMax; msg.className = 'form-msg err'; return; }
      if (!S.uploadUrl) { var wm = [V.suWaT || 'Venda', f.elements.name.value, f.elements.phone.value, f.elements.where.value, f.elements.size.value, f.elements.price.value].filter(Boolean).join('\n'); window.open('https://wa.me/' + S.wa + '?text=' + encodeURIComponent(wm), '_blank', 'noopener'); msg.textContent = V.suWaGo; msg.className = 'form-msg ok'; return; }
      var fd = new FormData(); ['name', 'phone', 'where', 'size', 'price'].forEach(function (k) { fd.append(k, f.elements[k].value); });
      fd.append('lang', S.lang); fd.append('page', location.href);
      files.forEach(function (x, i) { fd.append('file' + i, x, x.name); });
      msg.textContent = '…'; msg.className = 'form-msg';
      fetch(S.uploadUrl, { method: 'POST', body: fd }).then(function (r) { if (!r.ok) throw 0; msg.textContent = V.suOk; msg.className = 'form-msg ok'; f.reset(); $$('[data-up-n]', f).forEach(function (n) { n.textContent = ''; }); })
        .catch(function () { msg.textContent = V.suErr; msg.className = 'form-msg err'; });
    });
  });

  /* ---------- Merkliste (nur im Browser, ohne Anmeldung) ---------- */
  var FK = 'enseada_fav', favs = [];
  try { favs = JSON.parse(localStorage.getItem(FK) || '[]'); } catch (e) { favs = []; }
  var saveF = function () { try { localStorage.setItem(FK, JSON.stringify(favs)); } catch (e) {} };
  var favUrl = function (sl) { return S.base + (S.lang === 'pt' ? '' : S.lang + '/') + 'imovel/' + sl + '/'; };
  var pill = $('[data-fav-open]'), sheet = $('[data-fav-sheet]');
  var renderF = function () {
    $$('[data-fav]').forEach(function (b) { var on = favs.some(function (x) { return x.slug === b.dataset.slug; }); b.setAttribute('aria-pressed', String(on)); var tt = $('[data-fav-t]', b); if (tt) tt.textContent = on ? tt.dataset.b : tt.dataset.a; });
    if (pill) { pill.hidden = !favs.length; $('[data-fav-n]', pill).textContent = favs.length; }
    var list = $('[data-fav-list]', sheet || document);
    if (list) {
      list.innerHTML = favs.length ? favs.map(function (x) { return '<div class="fav-r"><a href="' + x.url + '">' + x.name.replace(/</g, '&lt;') + '</a><span data-brl="' + x.price + '">R$ ' + nf(x.price) + '</span><button type="button" data-fav-rm="' + x.slug + '" aria-label="×">×</button></div>'; }).join('') : '<p>' + V.mlEmpty + '</p>';
      if (window.__applyCur) window.__applyCur(); var wl = [V.mlMsg, ''].concat(favs.map(function (x) { return x.name + ' – R$ ' + nf(x.price) + '\n' + location.origin + favUrl(x.slug); }));
      var a = $('[data-fav-wa]', sheet); if (a) { a.href = waLink(wl.join('\n')); a.hidden = !favs.length; }
    }
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-fav]');
    if (b) { e.preventDefault(); var s = b.dataset.slug, i = favs.findIndex(function (x) { return x.slug === s; }); if (i > -1) favs.splice(i, 1); else favs.push({ slug: s, name: b.dataset.name, url: b.dataset.url, price: +b.dataset.price }); saveF(); renderF(); return; }
    var r = e.target.closest('[data-fav-rm]'); if (r) { favs = favs.filter(function (x) { return x.slug !== r.dataset.favRm; }); saveF(); renderF(); return; }
    if (e.target.closest('[data-fav-open]')) { sheet.hidden = false; return; }
    if (e.target.closest('[data-fav-close]') || e.target === sheet) { sheet.hidden = true; }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sheet && !sheet.hidden) sheet.hidden = true; });
  renderF();


  /* up22: Daumen gleitet sofort, dann weicher Seitenwechsel; Sprache bleibt auf gleicher Seite */
  (function () {
    var VT = !!document.startViewTransition && window.innerWidth > 1180 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches, reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches, DELAY = reduce ? 0 : 190;
    var BASE = S.base || '/', KEY = 'langScroll';
    /* Seitenwechsel ohne weißes Blitzen: kopfzeile bleibt stehen, nur Inhalt blendet kurz ab (nie ganz leer) */
    var DIM = '.4', FZ = function () { return [$('main'), $('.foot')].filter(Boolean); };
    var rel = function () { var p = location.pathname; if (p.indexOf(BASE) === 0) p = p.slice(BASE.length); return p.replace(/^(en|es|de)\//, ''); };
    /* Schalter (Sprache / Währung): Daumen unter der aktiven Taste */
    var segs = $$('.seg');
    var place = function (s) { var a = $('[aria-current=true],[aria-pressed=true]', s); if (!a || !a.offsetWidth) return; s.style.setProperty('--x', a.offsetLeft + 'px'); s.style.setProperty('--w', a.offsetWidth + 'px'); if (!s.classList.contains('rdy')) { s.classList.add('rdy'); requestAnimationFrame(function () { requestAnimationFrame(function () { s.classList.add('anim'); }); }); } };
    segs.forEach(function (s) {
      place(s);
      if ('ResizeObserver' in window) new ResizeObserver(function () { s.classList.remove('anim'); place(s); requestAnimationFrame(function () { requestAnimationFrame(function () { if (s.classList.contains('rdy')) s.classList.add('anim'); }); }); }).observe(s);
      if ('MutationObserver' in window) new MutationObserver(function () { place(s); }).observe(s, { attributes: true, subtree: true, attributeFilter: ['aria-pressed', 'aria-current'] });
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { segs.forEach(function (s) { s.classList.remove('anim'); place(s); requestAnimationFrame(function () { requestAnimationFrame(function () { s.classList.add('anim'); }); }); }); });
    /* Weicher Seitenwechsel ohne Neuladen: Seite holen, Inhalt tauschen, Scrollposition behalten */
    var HEADSEL = 'link[rel=alternate],link[rel=canonical],meta[name=description],meta[property^="og:"],meta[name^="twitter:"],script[type="application/ld+json"]';
    var swap = function (url, pr, top, pop) {
      var doc = pr.doc, y = top ? 0 : (pop && pop.y != null ? pop.y : window.scrollY), anc = null;
      /* Anker: Position über stabile Struktur halten (Tabs bzw. Abschnitt + Anteil), nicht über Textlänge */
      if (!top && !pop) { try {
        var tb = $('[data-slide]'), mk = $('main');
        if (tb && doc.querySelector('[data-slide]')) anc = { k: 't', t: tb.getBoundingClientRect().top };
        else if (mk) {
          var path = [], el = mk, fin = null;
          for (var dpt = 0; dpt < 10; dpt++) {
            var ch = Array.prototype.slice.call(el.children), hit = -1;
            for (var k = 0; k < ch.length; k++) { var rc = ch[k].getBoundingClientRect(); if (rc.bottom > 8 && rc.height > 0) { hit = k; break; } }
            if (hit < 0) break;
            path.push(hit); el = ch[hit]; fin = el;
            if (el.getBoundingClientRect().height < 220 || !el.children.length) break;
          }
          if (fin) { var fr = fin.getBoundingClientRect(); anc = { k: 's', p: path, f: Math.max(0, -fr.top) / fr.height, t: fr.top }; }
        }
      } catch (x) {} }
      var barEl = $('[data-bar]'), barWas = !!(barEl && barEl.classList.contains('on'));
      var run = function () {
        try { history.replaceState({ soft: 1, y: window.scrollY }, ''); } catch (x) {} if (!pop) { history.pushState({ soft: 1, y: top ? 0 : y }, '', url); window.__lastP = location.pathname + location.search; }
        document.title = doc.title; document.documentElement.lang = doc.documentElement.lang;
        $$(HEADSEL, document.head).forEach(function (n) { n.remove(); });
        $$(HEADSEL, doc.head).forEach(function (n) { document.head.appendChild(document.importNode(n, true)); });
        if (window.__ac) window.__ac.abort();
        window.__soft = true; document.documentElement.style.overflow = '';
        var bd = document.body; bd.className = doc.body.className; bd.removeAttribute('style'); document.documentElement.style.removeProperty('overflow');
        bd.textContent = '';
        bd.appendChild(pr.frag);
        var fb = bd.querySelector('.wa-fab'); if (fb && y > window.innerHeight * 0.6) { fb.style.transition = 'none'; fb.classList.add('on'); }
        var br = bd.querySelector('[data-bar]'); if (br && barWas && !top) { br.style.transition = 'none'; br.classList.add('on'); setTimeout(function () { br.style.removeProperty('transition'); }, 400); }
        var loads = pr.loads;
        var hs = top && !pop && location.hash ? $(location.hash) : null, goY = function () {
          if (hs) { hs.scrollIntoView({ behavior: 'instant' }); return; }
          var ny = null;
          if (anc && anc.k === 't') { var t2 = $('[data-slide]'); if (t2) ny = t2.getBoundingClientRect().top + window.scrollY - anc.t; }
          else if (anc && anc.k === 's') { var c2 = $('main'); for (var q = 0; c2 && q < anc.p.length; q++) c2 = c2.children[anc.p[q]]; if (c2) { var r2 = c2.getBoundingClientRect(); ny = r2.top + window.scrollY + (anc.t >= 0 ? -anc.t : anc.f * r2.height); } }
          window.scrollTo({ top: Math.max(0, ny == null ? y : ny), behavior: 'instant' });
        };
        goY();
        if (pop) { setTimeout(goY, 120); setTimeout(goY, 400); }
        return Promise.all(loads).then(function () { if (loads.failed) { location.reload(); return; } goY(); window.dispatchEvent(new Event('scroll')); });
      };
      if (VT) { var vt = document.startViewTransition(run); vt.ready.catch(function () {}); return vt.finished.catch(function () {}); }
      /* Safari ohne View Transitions: sanft ausblenden, tauschen, einblenden */
      if (reduce) return Promise.resolve(run());
      var p = run(), fz = FZ(); fz.forEach(function (e) { e.style.transition = 'none'; e.style.opacity = DIM; });
      return Promise.resolve(p).then(function () {
        requestAnimationFrame(function () { requestAnimationFrame(function () { fz.forEach(function (e) { e.style.transition = 'opacity .2s ease'; e.style.opacity = '1'; }); setTimeout(function () { fz.forEach(function (e) { e.style.removeProperty('transition'); e.style.removeProperty('opacity'); }); }, 300); }); });
      });
    };
    var cache = window.__cache = window.__cache || {}, fetchPage = function (url) {
      var tm = (window.__cacheT = window.__cacheT || {}), nw = Date.now();
      if (cache[url] && nw - tm[url] > 300000) delete cache[url];
      if (!cache[url]) { tm[url] = nw; cache[url] = fetch(url, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }); }
      cache[url].catch(function () { delete cache[url]; });
      return cache[url];
    };
    /* Seite vorab zerlegen (Parsen, Knoten, Skripte), damit der Tausch selbst nur noch einhängt */
    var prepPage = function (url) {
      var P = window.__prep = window.__prep || {};
      if (!P[url]) P[url] = fetchPage(url).then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html'), frag = document.createDocumentFragment(), loads = [];
        Array.prototype.slice.call(doc.body.childNodes).forEach(function (n) { frag.appendChild(document.importNode(n, true)); });
        $$('script', frag).forEach(function (o) {
          if (o.type && !/javascript/.test(o.type)) return;
          var sc = document.createElement('script');
          Array.prototype.slice.call(o.attributes).forEach(function (at) { if (at.name !== 'defer') sc.setAttribute(at.name, at.value); });
          sc.async = false; sc.text = o.text;
          if (o.src) loads.push(new Promise(function (r) { sc.onload = r; sc.onerror = function () { loads.failed = true; r(); }; }));
          o.parentNode.replaceChild(sc, o);
        });
        return { doc: doc, frag: frag, loads: loads };
      });
      P[url].catch(function () { delete P[url]; });
      return P[url];
    };
    var softGo = function (url, top, wait0, pop) {
      var my = window.__navId = (window.__navId | 0) + 1, fb = !VT && !reduce;
      var got = prepPage(url).then(function (r) { delete window.__prep[url]; return r; });
      var wait = new Promise(function (r) { setTimeout(r, wait0 === 0 ? 0 : (wait0 || DELAY)); });
      /* Safari/Handy: erst ausblenden, wenn die Seite da ist (kein leerer Bildschirm bei langsamem Netz) */
      var faded = fb ? got.then(function () { if (my !== window.__navId) return; FZ().forEach(function (e) { e.style.transition = 'opacity .1s ease'; e.style.opacity = DIM; }); return new Promise(function (r) { setTimeout(r, 100); }); }, function () {}) : Promise.resolve();
      return Promise.all([got, wait, faded]).then(function (v) { if (my !== window.__navId) return; return swap(url, v[0], top, pop); }).catch(function () { if (my !== window.__navId) return; FZ().forEach(function (e) { e.style.removeProperty('opacity'); e.style.removeProperty('transition'); }); location.href = url; });
    };
    try { history.scrollRestoration = 'manual'; } catch (x) {}
    if (!window.__pop && window.__orig) {
      window.__pop = 1;
      var st = 0; window.__orig.w.call(window, 'scroll', function () { if (st) return; st = setTimeout(function () { (window.requestIdleCallback || function (f) { f(); })(function () { st = 0; try { history.replaceState({ soft: 1, y: window.scrollY }, ''); } catch (x) {} }); }, 250); }, { passive: true });
      window.__lastP = location.pathname + location.search;
      window.__orig.w.call(window, 'popstate', function (e) {
        var np = location.pathname + location.search; if (np === window.__lastP) return; window.__lastP = np;
        var y = e.state && e.state.y != null ? e.state.y : 0;
        softGo(location.pathname + location.search, false, 0, { y: y });
      });
    }
    /* beim Antippen schon vorladen (spart die Wartezeit), im Leerlauf die anderen Sprachen */
    var warm = function (a, prep) { try { var u = new URL(a.href, location.href); if (u.origin === location.origin && !/\/ficha\/|\.(pdf|xml|json|txt|jpe?g|png|webp|mp4|zip)$/i.test(u.pathname)) (prep ? prepPage : fetchPage)(u.pathname + u.search); } catch (x) {} };
    document.addEventListener('pointerdown', function (e) { var a = e.target.closest && e.target.closest('a[href]'); if (a && !a.target) warm(a, true); }, { passive: true, capture: true });
    $$('[data-open=menu]').forEach(function (bt) { bt.addEventListener('pointerdown', function () { $$('[data-lang]').forEach(function (a) { if (!a.getAttribute('aria-current')) warm(a); }); }, { passive: true }); });
    var cn = navigator.connection || {}; if (!cn.saveData && (!cn.effectiveType || cn.effectiveType === '4g')) setTimeout(function () { $$('[data-lang]').forEach(function (a) { if (!a.getAttribute('aria-current')) warm(a); }); }, 700);
    /* Sprachlinks */
    $$('[data-lang]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
        e.preventDefault();
        var target = a.getAttribute('href') + location.search + location.hash;
        if (new URL(a.href, location.href).pathname === location.pathname) {
          window.__navId = (window.__navId | 0) + 1; document.body.style.removeProperty('opacity'); document.body.style.removeProperty('transition');
          $$('[data-lang]').forEach(function (x) { if (x.dataset.lang === a.dataset.lang) x.setAttribute('aria-current', 'true'); else x.removeAttribute('aria-current'); });
          var cl = document.querySelector('#menu [data-close=menu]'); if (cl) cl.click();
          return;
        }
        $$('[data-lang]').forEach(function (x) { if (x.dataset.lang === a.dataset.lang) x.setAttribute('aria-current', 'true'); else x.removeAttribute('aria-current'); });
        softGo(target, undefined, a.closest('.sheet') ? 110 : undefined);
      });
    });
    /* Alle internen Seitenwechsel weich (Menü, Logo, Karten, Links) */
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.target || a.hasAttribute('download') || a.hasAttribute('data-lang') || a.closest('[data-slide]')) return;
      var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
      if (u.origin !== location.origin || u.pathname.indexOf(BASE) !== 0) return;
      if (/\/ficha\/|\.(pdf|xml|json|txt|jpe?g|png|webp|mp4|zip)$/i.test(u.pathname)) return;
      if (u.pathname === location.pathname && u.search === location.search) {
        if (u.hash && u.hash.length > 1) { var tg = document.getElementById(decodeURIComponent(u.hash.slice(1))); if (tg) { e.preventDefault(); tg.scrollIntoView({ behavior: 'smooth' }); try { history.replaceState(history.state, '', u.pathname + u.search + u.hash); } catch (x) {} } }
        return;
      }
      e.preventDefault();
      softGo(u.pathname + u.search + u.hash, true, 0);
    });
    /* Tabs Alle / Kaufen / Mieten */
    var nav = $('[data-slide]');
    if (nav) {
      var links = $$('a', nav), cur = links.findIndex(function (a) { return a.getAttribute('aria-current') === 'true'; }); if (cur < 0) cur = 0;
      links.forEach(function (a, i) {
        a.addEventListener('click', function (e) {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button || i === cur) return;
          e.preventDefault();
          nav.style.setProperty('--i', i);
          links.forEach(function (x, n) { if (n === i) x.setAttribute('aria-current', 'true'); else x.removeAttribute('aria-current'); });
          softGo(a.getAttribute('href'));
        });
      });
    }
  })();

  /* Fallback ohne pagereveal (z. B. ältere Browser): Scrollposition nach Sprachwechsel */
  if (!('onpagereveal' in window)) {
    try { var sv = JSON.parse(sessionStorage.getItem('langScroll') || 'null'), pp = location.pathname; if (pp.indexOf(S.base || '/') === 0) pp = pp.slice((S.base || '/').length); pp = pp.replace(/^(en|es|de)\//, '');
      if (sv) { sessionStorage.removeItem('langScroll'); if (sv.p === pp && !location.hash) window.scrollTo({ top: sv.y, behavior: 'instant' }); } } catch (e) {}
  }
})();

/* up31: Kopfzeile weich beim Scrollen + sanftes Einblenden (einmalig, gestaffelt) */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var head = $('.head'), ticking = false, pending = [];
  var show = function (el) {
    var i = pending.indexOf(el); if (i < 0) return; pending.splice(i, 1);
    el.classList.add('rv-in');
    setTimeout(function () { el.classList.remove('rv', 'rv-in'); el.style.removeProperty('--rv-i'); }, 1400);
  };
  var sync = function () {
    ticking = false;
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    if (head) { var on = head.classList.contains('sc'); if (!on && y > 12) head.classList.add('sc'); else if (on && y < 4) head.classList.remove('sc'); }
    /* Ganz unten angekommen: alles Übrige zeigen (nichts bleibt versteckt) */
    if (pending.length && y + window.innerHeight >= document.documentElement.scrollHeight - 4) pending.slice().forEach(show);
  };
  sync();
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(sync); } }, { passive: true });
  if (reduce || !('IntersectionObserver' in window)) return;
  var main = $('main'); if (!main) return;
  var H = window.innerHeight, GRID = '.grid,.tr-grid,.tiles,.faq,.points,.gcards,.stats,.steps,.tl', SKIP = '[data-map],[data-gallery],[data-lightbox],[data-slide],form,.det,.filters';
  var items = [];
  $$('.sec, .sec-tight', main).forEach(function (sec) {
    var wr = $('.wrap', sec) || sec;
    Array.prototype.slice.call(wr.children).forEach(function (u) {
      if (u.matches(SKIP) || u.querySelector(SKIP)) return;
      var group = u.matches(GRID) ? Array.prototype.slice.call(u.children, 0, 12) : [u];
      group.forEach(function (el, i) { items.push([el, i]); });
    });
  });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (x) { if (x.isIntersecting) { io.unobserve(x.target); show(x.target); } });
  }, { rootMargin: '0px 0px -48px 0px', threshold: 0 });
  items.forEach(function (it) {
    var el = it[0], r = el.getBoundingClientRect();
    if (r.top < H * 0.92 || !r.height) return;
    el.style.setProperty('--rv-i', Math.min(it[1], 5));
    el.classList.add('rv'); pending.push(el); io.observe(el);
  });
  sync();
})();

/* up33: fest verbundene Wortpaare (.tj) und Zusammengehöriges (.nb) wieder lösen, wenn sie nicht in die Spalte bzw. auf den Bildschirm passen (kein seitliches Überlaufen) */
(function () {
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var timer, fit = function () {
    var els = $$('.tj, .nb'), vw = document.documentElement.clientWidth;
    els.forEach(function (e) { e.classList.remove('off'); });
    els.forEach(function (e) {
      var r = e.getBoundingClientRect(); if (!r.width) return;
      var b = e.parentElement;
      while (b && /^inline/.test(getComputedStyle(b).display) && b.parentElement) b = b.parentElement;
      var sc = e.closest('.rail,.card-photos,.chips,.filter-row,.lb-track');
      if ((b && b.scrollWidth > b.clientWidth + 1) || (!sc && r.right > vw - 16)) e.classList.add('off');
    });
  };
  fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(fit, 150); }, { passive: true });
})();
