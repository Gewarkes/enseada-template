/* Enseada – ein kleines Skript für: Menü, Währung, Suche, Filter, Fotos, Rechner, Karte, Formulare. Keine Bibliothek außer der Karte (Leaflet, erst bei Bedarf geladen). */
(function () {
  try { var nav0 = (performance.getEntriesByType('navigation')[0] || {}).type; if (nav0 !== 'back_forward' && !location.hash && !window.__soft) scrollTo(0, 0); } catch (e) {}
  'use strict';
  var S = window.SITE || {}, T = S.t || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var LOC = { pt: 'pt-BR', en: 'en-US', es: 'es-AR', de: 'de-DE' }[S.lang] || 'pt-BR';
  var nf = function (n, d) { return Number(n).toLocaleString(LOC, { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  if (!LS.get('lang')) LS.set('lang', S.lang);
  $$('[data-lang]').forEach(function (a) { a.addEventListener('click', function () { LS.set('lang', a.dataset.lang); }); });

  /* ---------- Währung ---------- */
  var NB = '\u00a0', SYM = { BRL: 'R$' + NB, USD: 'US$' + NB, EUR: '€' + NB };
  var fx = { USD: (S.fx || {}).USD || 0.178, EUR: (S.fx || {}).EUR || 0.16 };
  try { var fx0 = JSON.parse(sessionStorage.getItem('fx') || 'null'); if (fx0 && fx0.USD && fx0.EUR) fx = fx0; } catch (e) {}
  var cur = ['USD', 'EUR'].indexOf(LS.get('cur')) > -1 ? LS.get('cur') : 'BRL';
  function conv(v, c) { return c === 'BRL' ? v : v * fx[c]; }
  function fmt(v, c) {
    c = c || cur; v = conv(v, c);
    if (c !== 'BRL') { var st = v >= 100000 ? 1000 : v >= 1000 ? 10 : 1; v = Math.round(v / st) * st; }
    return SYM[c] + nf(Math.round(v));
  }
  function fmtShort(v, c) {
    c = c || cur; v = conv(v, c);
    if (v >= 1e6) return SYM[c] + nf(v / 1e6, v >= 1e7 ? 1 : 2).replace(/([.,]\d)0$/, '$1') + NB + T.mi;
    if (v >= 1e3) return SYM[c] + nf(v / 1e3, v < 1e5 && v % 1000 ? 1 : 0) + NB + T.mil;
    return SYM[c] + nf(v);
  }
  var curHooks = [];
  window.__applyCur = function () { applyCur(); };
  function applyCur() {
    $$('[data-cur]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.cur === cur)); });
    $$('[data-brl]').forEach(function (el) {
      if (el.hasAttribute('data-fxline')) {
        var v = +el.dataset.brl;
        el.textContent = '≈ ' + (cur === 'BRL' ? fmt(v, 'USD') + ' · ' + fmt(v, 'EUR') : fmt(v, 'BRL'));
      } else el.textContent = fmt(+el.dataset.brl);
    });
    curHooks.forEach(function (f) { f(); });
  }
  var fxAsked = false;
  function liveFx() {
    if (fxAsked) return; fxAsked = true;
    try {
      var c = JSON.parse(sessionStorage.getItem('fx') || 'null');
      if (c && c.USD) { fx = c; applyCur(); return; }
    } catch (e) {}
    fetch('https://api.frankfurter.dev/v1/latest?base=BRL&symbols=USD,EUR').then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.rates && d.rates.USD) { fx = { USD: d.rates.USD, EUR: d.rates.EUR }; try { sessionStorage.setItem('fx', JSON.stringify(fx)); } catch (e) {} applyCur(); }
    }).catch(function () {});
  }
  $$('[data-cur]').forEach(function (b) {
    b.addEventListener('click', function () { cur = b.dataset.cur; LS.set('cur', cur); $$('[data-cur]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.cur === cur)); }); setTimeout(function () { applyCur(); if (cur !== 'BRL') liveFx(); }, 280); });
  });

  /* ---------- Video im Einstieg: erst nach dem Laden der Seite, nicht bei Datensparen oder reduzierter Bewegung ---------- */
  var hv = $('.hero-video');
  if (hv && !matchMedia('(prefers-reduced-motion:reduce)').matches && !((navigator.connection || {}).saveData)) {
    var startVideo = function () {
      hv.src = innerWidth < 800 ? hv.dataset.videoM : hv.dataset.video;
      hv.addEventListener('playing', function () { hv.classList.add('on'); }, { once: true });
      var pr = hv.play(); if (pr && pr.catch) pr.catch(function () {});
    };
    if (document.readyState === 'complete') setTimeout(startVideo, 300); else addEventListener('load', function () { setTimeout(startVideo, 300); });
  }

  /* ---------- Menü ---------- */
  var menu = $('#menu');
  function setMenu(on) {
    if (!menu) return;
    menu.classList.toggle('on', on);
    document.documentElement.style.overflow = on ? 'hidden' : '';
    Array.prototype.forEach.call(document.body.children, function (el) { if (el !== menu && el.tagName !== 'SCRIPT') { if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert'); } });
    $$('[data-open=menu]').forEach(function (b) { b.setAttribute('aria-expanded', String(on)); });
    if (on) { var x = $('[data-close=menu]', menu); if (x) x.focus(); } else { var o = $('[data-open=menu]'); if (o) o.focus(); }
  }
  $$('[data-open=menu]').forEach(function (b) { b.addEventListener('click', function () { setMenu(true); }); });
  $$('[data-close=menu]').forEach(function (b) { b.addEventListener('click', function () { setMenu(false); }); });

  /* ---------- Suche auf der Startseite ---------- */
  var search = $('[data-search]');
  if (search) {
    var maxSel = $('[data-max]', search), first = maxSel.options[0].textContent;
    var setCat = function () {
      var cat = (new FormData(search)).get('cat');
      $$('[data-hide-for]', search).forEach(function (el) { var h = el.dataset.hideFor === cat; el.hidden = h; el.style.display = h ? 'none' : ''; });
      var vals = (cat === 'aluguel' ? maxSel.dataset.rent : maxSel.dataset.sale).split(',');
      maxSel.innerHTML = '<option value="">' + first + '</option>' + vals.map(function (v) { return '<option value="' + v + '">' + fmt(+v, 'BRL') + (cat === 'aluguel' ? T.perMonth : '') + '</option>'; }).join('');
    };
    $$('input[name=cat]', search).forEach(function (r) { r.addEventListener('change', setCat); });
    curHooks.push(setCat);
    search.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var fd = new FormData(search), q = new URLSearchParams();
      ['loc', 'type', 'max'].forEach(function (k) { var v = fd.get(k); if (v && !(k === 'type' && fd.get('cat') === 'terrenos')) q.set(k, v); });
      var s = q.toString();
      location.href = search.dataset[fd.get('cat')] + (s ? '?' + s : '');
    });
  }

  /* ---------- Karten in der Liste: Fotos wischen ---------- */
  $$('[data-swipe]').forEach(function (tr) {
    var media = tr.parentNode, n = tr.children.length, out = $('[data-count]', media), tick;
    if (n < 2) return;
    var wake = function () { $$('img[data-src]', tr).forEach(function (im) { im.srcset = im.dataset.srcset; im.src = im.dataset.src; im.removeAttribute('data-src'); }); };
    ['touchstart', 'mouseenter', 'focusin'].forEach(function (ev) { media.addEventListener(ev, wake, { once: true, passive: true }); });
    tr.addEventListener('scroll', function () {
      clearTimeout(tick);
      tick = setTimeout(function () { var i = Math.round(tr.scrollLeft / tr.clientWidth) + 1; if (out) out.textContent = i + ' / ' + n; }, 60);
    }, { passive: true });
    $$('[data-step]', media).forEach(function (b) {
      b.addEventListener('click', function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        var i = Math.round(tr.scrollLeft / tr.clientWidth) + (+b.dataset.step);
        if (i < 0) i = n - 1; if (i >= n) i = 0;
        tr.scrollTo({ left: i * tr.clientWidth, behavior: 'smooth' });
      });
    });
  });

  /* ---------- Karte (Leaflet wird erst geladen, wenn eine Karte sichtbar wird) ---------- */
  var leaflet;
  function loadLeaflet() {
    if (leaflet) return leaflet;
    if (window.L && window.L.map) return (leaflet = Promise.resolve(window.L));
    leaflet = new Promise(function (ok, fail) {
      if (document.querySelector('script[src$="leaflet.js"]')) { var t = setInterval(function () { if (window.L && window.L.map) { clearInterval(t); ok(window.L); } }, 30); return; }
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = S.base + 'assets/leaflet.css'; document.head.appendChild(l);
      var s = document.createElement('script'); s.src = S.base + 'assets/leaflet.js'; s.onload = function () { ok(window.L); }; s.onerror = fail; document.head.appendChild(s);
    });
    return leaflet;
  }
  function initMap(el) {
    if (el._started) return el._ready; el._started = true;
    el._ready = loadLeaflet().then(function (L) {
      var touch = matchMedia('(hover:none)').matches;
      var ph0 = $('.map-ph', el); if (ph0) ph0.remove();
      var map = L.map(el, { scrollWheelZoom: false, dragging: !touch, zoomControl: true, attributionControl: true });
      map.attributionControl.setPrefix(false);
      el._map = map;
      var BB = L.latLngBounds([-6.3371, -35.1343], [-6.1187, -34.9805]);
      var WB = L.latLngBounds([-6.4463, -35.332], [-6.0532, -34.8926]);
      var live = true;
      if (live) {
        /* OpenStreetMap-Kacheln (Nutzungsrichtlinie erlaubt das mit Quellenangabe); detectRetina lädt auf Retina-Displays die doppelte Auflösung. Google-Kacheln direkt einzubinden ist laut Google nicht erlaubt. */
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, detectRetina: true, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors' }).addTo(map);
      } else {
        L.imageOverlay(S.base + 'assets/map-pipa-wide.jpg', WB).addTo(map);
        L.imageOverlay(S.base + 'assets/map-pipa.jpg', BB, { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(map);
      }
      map.setMaxBounds(WB.pad(0.4)); map.options.maxZoom = live ? (window.devicePixelRatio > 1 ? 18 : 19) : 15; el._fitMin = function () { map.invalidateSize(); map.setMinZoom(Math.max(9, map.getBoundsZoom(WB, true))); };
      map.on('click', function () { map.scrollWheelZoom.enable(); map.dragging.enable(); });
      var zc = function () { el.classList.toggle('zoomed', map.getZoom() >= 14); }; map.on('zoomend', zc);
      var kind = el.dataset.map;
      if (kind === 'pins') {
        var holder = el.parentNode, data = JSON.parse(($('[data-pins]', holder) || $('[data-pins]')).textContent || '[]');
        el._marks = {};
        data.forEach(function (p) {
          var mk = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', html: '<div class="pin" data-pin="' + p.slug + '"></div>', iconSize: [0, 0] }), keyboard: true, title: p.name });
          mk.bindPopup('<a class="pop" href="' + p.url + '"><img src="' + p.img + '" alt="" loading="lazy"><div><b>' + p.name + '</b><span>' + p.loc + '</span><strong data-pp></strong></div></a>', { closeButton: false, offset: [0, -10], autoPanPaddingTopLeft: [24, 70], autoPanPaddingBottomRight: [24, 24] });
          mk.on('popupopen', function (e) { var s = $('[data-pp]', e.popup.getElement()); if (s) s.textContent = p.por ? T.onReq : fmt(p.price) + (p.rent ? T.perMonth : ''); });
          mk._p = p; el._marks[p.slug] = mk;
        });
        el._show = function (slugs) {
          var pts = [];
          Object.keys(el._marks).forEach(function (k) {
            var mk = el._marks[k], on = !slugs || slugs.indexOf(k) > -1;
            if (on) { mk.addTo(map); pts.push(mk.getLatLng()); } else mk.remove();
          });
          el._label();
          if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 15 }); else map.setView([S.geo.lat, S.geo.lng], 12);
          zc();
        };
        el._label = function () { $$('[data-pin]', el).forEach(function (d) { var p = el._marks[d.dataset.pin]._p; d.textContent = p.por ? '…' : fmtShort(p.price) + (p.rent ? T.perMonth : ''); }); };
        curHooks.push(el._label);
        el._show(el._want || null);
      } else {
        var ll = [+el.dataset.lat, +el.dataset.lng];
        map.setView(ll, kind === 'area' ? 15 : 16);
        if (kind === 'area') L.circle(ll, { radius: 320, color: '#0F3B37', weight: 2, fillColor: '#0F3B37', fillOpacity: 0.16 }).addTo(map);
        else L.marker(ll, { icon: L.divIcon({ className: '', html: '<div class="pin on">' + T.office + '</div>', iconSize: [0, 0] }) }).addTo(map);
      }
      setTimeout(function () { map.invalidateSize(); if (el._fitMin) el._fitMin(); if (el._show) el._show(el._want || null); }, 60);
      return el;
    }).catch(function () { var ph = $('.map-ph', el); if (ph) ph.textContent = '–'; });
    return el._ready;
  }
  var maps = $$('[data-map]');
  if (maps.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { io.unobserve(x.target); (function (tg) { (window.requestIdleCallback || function (f) { setTimeout(f, 200); })(function () { initMap(tg); }, { timeout: 1500 }); })(x.target); } }); }, { rootMargin: '300px' });
    maps.forEach(function (el) { if (!el.hasAttribute('data-lazy')) io.observe(el); });
  }

  /* ---------- Liste: Filter, Sortierung, Kartenansicht ---------- */
  var fbar = $('[data-filters]');
  if (fbar) {
    var grid = $('[data-grid]'), cards = $$('[data-card]', grid), res = $('[data-results]'), lmap = $('[data-map]', res);
    var sels = {}; $$('[data-f]', fbar).forEach(function (s) { sels[s.dataset.f] = s; });
    var xs = $$('[data-x]', fbar);
    var xq = (new URLSearchParams(location.search).get('x') || '').split(',');
    xs.forEach(function (x) { x.checked = xq.indexOf(x.dataset.x) > -1; });
    var q = new URLSearchParams(location.search);
    Object.keys(sels).forEach(function (k) { var v = q.get(k); if (v && $('option[value="' + v + '"]', sels[k])) sels[k].value = v; });
    var mapOn = q.get('mapa') === '1' || false;
    var apply = function () {
      var f = {}; Object.keys(sels).forEach(function (k) { f[k] = sels[k].value; sels[k].parentNode.classList.toggle('on', !!sels[k].value && k !== 'sort'); });
      var shown = [];
      cards.forEach(function (c) {
        var d = c.dataset, fs = ' ' + (d.feats || '') + ' ';
        var ok = (!f.loc || d.loc === f.loc) && (!f.type || d.type === f.type) && (!f.beds || +d.beds >= +f.beds) && (!f.max || +d.price <= +f.max)
          && (!f.baths || +d.baths >= +f.baths) && (!f.area || +d.area >= +f.area) && (!f.lot || +d.lot >= +f.lot) && (!f.beachd || (+d.beach > 0 && +d.beach <= +f.beachd));
        xs.forEach(function (x) {
          if (!x.checked) return; var k = x.dataset.x;
          if (k === 'seaview' || k === 'pool' || k === 'furnished') ok = ok && fs.indexOf(' ' + k + ' ') > -1;
          else if (k === 'parking') ok = ok && +d.parking > 0;
          else ok = ok && d[k] === '1';
        });
        c.hidden = !ok; if (ok) shown.push(c);
      });
      var key = { 'new': function (a, b) { return b.dataset.date.localeCompare(a.dataset.date); }, asc: function (a, b) { return a.dataset.price - b.dataset.price; }, desc: function (a, b) { return b.dataset.price - a.dataset.price; } }[f.sort] || function (a, b) { return a.dataset.order - b.dataset.order; };
      cards.slice().sort(key).forEach(function (c) { grid.appendChild(c); });
      $('[data-n]').textContent = shown.length;
      var w = $('[data-nword]'); w.textContent = shown.length === 1 ? w.dataset.one : w.dataset.many;
      $('[data-empty]').classList.toggle('on', !shown.length);
      var nx = xs.filter(function (x) { return x.checked; }).length, nm = (f.baths ? 1 : 0) + (f.beachd ? 1 : 0) + (f.area ? 1 : 0) + (f.lot ? 1 : 0) + nx;
      var any = !!(f.loc || f.type || f.beds || f.max || nm);
      var mn = $('[data-more-n]'); if (mn) { mn.hidden = !nm; mn.textContent = nm; }
      $$('[data-reset]').forEach(function (b) { if (b.classList.contains('link')) b.hidden = !any; });
      var p = new URLSearchParams(); Object.keys(f).forEach(function (k) { if (f[k]) p.set(k, f[k]); });
      if (nx) p.set('x', xs.filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.x; }).join(','));
      if (mapOn && innerWidth < 1100) p.set('mapa', '1');
      var s = p.toString(); history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
      var keep = new URLSearchParams(); ['loc', 'type', 'beds'].forEach(function (k) { if (f[k]) keep.set(k, f[k]); });
      $$('[data-keepq]', fbar).forEach(function (a) { var u = a.getAttribute('href').split('?')[0], k = keep.toString(); a.setAttribute('href', u + (k ? '?' + k : '')); });
      var slugs = shown.map(function (c) { return c.dataset.slug; });
      lmap._want = slugs;
      if (lmap._show) lmap._show(slugs);
    };
    var setMap = function (on) {
      mapOn = on; res.classList.toggle('map-on', on);
      $$('[data-view]').forEach(function (b) { b.setAttribute('aria-pressed', String((b.dataset.view === 'map') === on)); });
      if (on) initMap(lmap).then(function () { if (lmap._map) { lmap._map.invalidateSize(); lmap._show(lmap._want || null); } });
    };
    Object.keys(sels).forEach(function (k) { sels[k].addEventListener('change', apply); });
    xs.forEach(function (x) { x.addEventListener('change', apply); });
    var mb = $('[data-morebtn]'), mp = $('[data-more]');
    if (mb) { var openMore = function (o) { mp.hidden = !o; mb.setAttribute('aria-expanded', String(o)); var tt = $('[data-more-t]', mb); tt.textContent = o ? tt.dataset.b : tt.dataset.a; }; mb.addEventListener('click', function () { openMore(mp.hidden); }); if (xs.some(function (x) { return x.checked; }) || q.get('baths') || q.get('beachd')) openMore(true); }
    $$('[data-reset]').forEach(function (b) { b.addEventListener('click', function () { Object.keys(sels).forEach(function (k) { if (k !== 'sort') sels[k].value = ''; }); xs.forEach(function (x) { x.checked = false; }); apply(); }); });
    $$('[data-view]').forEach(function (b) { b.addEventListener('click', function () { setMap(b.dataset.view === 'map'); apply(); if (mapOn && innerWidth < 1100) res.scrollIntoView({ block: 'start' }); }); });
    apply(); setMap(mapOn);
    cards.forEach(function (c) {
      c.addEventListener('mouseenter', function () { var d = $('[data-pin="' + c.dataset.slug + '"]', lmap); if (d) d.classList.add('on'); });
      c.addEventListener('mouseleave', function () { var d = $('[data-pin="' + c.dataset.slug + '"]', lmap); if (d) d.classList.remove('on'); });
    });
  }

  /* ---------- Objektseite: Galerie und Vollbild ---------- */
  var gal = $('[data-gallery]'), lb = $('[data-lightbox]');
  if (gal && lb) {
    var track = $('[data-track]', gal), pos = $('[data-pos]', gal), lt = $('[data-lbtrack]', lb), lpos = $('[data-lbpos]', lb), total = lt.children.length;
    track.addEventListener('scroll', function () { pos.textContent = Math.min(total, Math.round(track.scrollLeft / track.clientWidth) + 1); }, { passive: true });
    var go = function (i, smooth) { i = (i + total) % total; lt.scrollTo({ left: i * lt.clientWidth, behavior: smooth ? 'smooth' : 'auto' }); };
    var open = function (i) { lb.classList.add('on'); document.documentElement.style.overflow = 'hidden'; go(i, false); lpos.textContent = i + 1; $('[data-lbclose]', lb).focus(); };
    var shut = function () { lb.classList.remove('on'); document.documentElement.style.overflow = ''; };
    $$('[data-photo]', gal).forEach(function (b) { b.addEventListener('click', function () { open(+b.dataset.photo); }); });
    lt.addEventListener('scroll', function () { lpos.textContent = Math.round(lt.scrollLeft / lt.clientWidth) + 1; }, { passive: true });
    $('[data-lbclose]', lb).addEventListener('click', shut);
    $$('[data-lbstep]', lb).forEach(function (b) { b.addEventListener('click', function () { go(Math.round(lt.scrollLeft / lt.clientWidth) + (+b.dataset.lbstep), true); }); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('on')) return;
      if (e.key === 'Escape') shut();
      if (e.key === 'ArrowRight') go(Math.round(lt.scrollLeft / lt.clientWidth) + 1, true);
      if (e.key === 'ArrowLeft') go(Math.round(lt.scrollLeft / lt.clientWidth) - 1, true);
    });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Teilen ---------- */
  $$('[data-share]').forEach(function (b) {
    b.addEventListener('click', function () {
      var d = { title: b.dataset.title || document.title, url: location.href.split('#')[0] };
      if (navigator.share) { navigator.share(d).catch(function () {}); return; }
      var done = function () { var h = b.innerHTML; b.textContent = T.copied; setTimeout(function () { b.innerHTML = h; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(d.url).then(done, done); else done();
    });
  });

  /* ---------- Finanzierungsrechner ---------- */
  $$('[data-calc]').forEach(function (box) {
    var k = function (n) { return $('[data-k=' + n + ']', box); }, o = function (n) { return $('[data-o=' + n + ']', box); };
    var run = function () {
      var price = Math.min(1e12, Math.max(0, +k('price').value || 0)), down = +k('down').value, years = +k('years').value, rate = Math.min(100, Math.max(0, +String(k('rate').value).replace(',', '.') || 0));
      var sys = ($('[data-k=sys]:checked', box) || {}).value || 'sac';
      var loan = price * (1 - down / 100), n = years * 12, i = Math.pow(1 + rate / 100, 1 / 12) - 1, first, last, interest;
      if (sys === 'sac') { var am = loan / n; first = am + loan * i; last = am + am * i; interest = i * loan * (n + 1) / 2; }
      else { first = last = i ? loan * i / (1 - Math.pow(1 + i, -n)) : loan / n; interest = first * n - loan; }
      o('down').textContent = down + NB + '% · ' + fmt(price * down / 100);
      o('years').textContent = years + NB + T.years;
      o('first').textContent = fmt(first);
      o('firstfx').textContent = '≈ ' + (cur === 'BRL' ? fmt(first, 'USD') + ' · ' + fmt(first, 'EUR') : fmt(first, 'BRL'));
      o('last').textContent = fmt(last); o('loan').textContent = fmt(loan); o('interest').textContent = fmt(interest);
      o('costs').textContent = fmt(price * (S.buyCosts || 0.045));
      var sn = o('sysnote'); sn.textContent = sn.dataset[sys];
    };
    box.addEventListener('input', run); box.addEventListener('change', run);
    curHooks.push(run);
  });

  /* ---------- Formulare ---------- */
  function say(form, text, err) { var m = $('.form-msg', form); m.textContent = text; m.classList.add('on'); m.classList.toggle('err', !!err); }
  $$('[data-form=contact]').forEach(function (form) {
    var sub = $('[name=subject]', form), want = new URLSearchParams(location.search).get('assunto');
    if (sub && want) $$('option', sub).forEach(function (op) { if (op.dataset.v === want) sub.value = op.value; });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var fd = new FormData(form), name = (fd.get('name') || '').trim(), phone = (fd.get('phone') || '').trim();
      if (!name || !/^\+?[\d\s().-]{8,}$/.test(phone)) { say(form, T.required, true); return; }
      var em = $('[name=email]', form);
      if (em && em.value && !em.checkValidity()) { say(form, T.emailBad, true); em.focus(); return; }
      var subject = fd.get('subject') || form.dataset.subject || '';
      if (S.contactUrl) {
        fd.set('subject', subject); fd.set('page', location.href);
        fetch(S.contactUrl, { method: 'POST', body: fd, headers: { Accept: 'application/json' } }).then(function (r) {
          if (!r.ok) throw 0; form.reset(); say(form, T.sent);
        }).catch(function () { say(form, T.sendErr, true); });
        return;
      }
      var lines = ['*' + T.waForm + '*', T.fName + ': ' + name, T.fPhone + ': ' + phone];
      if (fd.get('email')) lines.push(T.fEmail + ': ' + fd.get('email'));
      if (subject) lines.push(T.fSubject + ': ' + subject);
      if (fd.get('message')) lines.push('', fd.get('message'));
      window.open('https://wa.me/' + S.wa + '?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
      say(form, T.waOpen);
    });
  });
  $$('[data-form=news]').forEach(function (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var mail = $('[name=email]', form);
      if (!mail.value || !mail.checkValidity()) { say(form, T.emailBad, true); mail.focus(); return; }
      if (!S.newsletterUrl) { say(form, T.newsDemo); return; }
      fetch(S.newsletterUrl, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } }).then(function (r) {
        if (!r.ok) throw 0; form.reset(); say(form, T.newsOk);
      }).catch(function () { say(form, T.sendErr, true); });
    });
  });

  /* ---------- Besuchsstatistik nur mit Zustimmung ---------- */
  if (S.gaId) {
    var ga = function () {
      var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + S.gaId; document.head.appendChild(s);
      window.dataLayer = window.dataLayer || []; window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date()); window.gtag('config', S.gaId, { anonymize_ip: true });
    };
    var c = LS.get('consent'), box = $('#consent');
    if (c === 'yes') ga(); else if (!c && box) {
      box.classList.add('on');
      $$('[data-consent]', box).forEach(function (b) { b.addEventListener('click', function () { LS.set('consent', b.dataset.consent); box.classList.remove('on'); if (b.dataset.consent === 'yes') ga(); }); });
    }
  }

  /* ---------- WhatsApp-Knopf und feste Leiste erst nach dem ersten Bildschirm ---------- */
  var fab = $('.wa-fab'), bar = $('[data-bar]'), acts = $('[data-actions]');
  var onScroll = function () {
    if (fab) fab.classList.toggle('on', scrollY > innerHeight * 0.6);
    if (bar && acts) bar.classList.toggle('on', acts.getBoundingClientRect().bottom < 0);
  };
  if (fab) fab.style.transition = 'none';
  if (bar) bar.style.transition = 'none';
  onScroll();
  setTimeout(function () { if (fab) fab.style.transition = ''; if (bar) bar.style.transition = ''; }, 120);
  addEventListener('scroll', onScroll, { passive: true });

  applyCur();
  if (cur !== 'BRL' || $('[data-fxline]')) setTimeout(liveFx, 1200);
})();
