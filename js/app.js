/* TriLog · App: Navigation, Kopfzeile, Import, Onboarding, Wetter, Sicherungs-Erinnerung */
(function (TL) {
  'use strict';
  var U = TL.u, M = TL.model, V = TL.views, S = TL.settings;
  var el = U.el, esc = U.esc;
  var A = TL.app = {};
  var st = { view: null, period: 365, triKey: null, plan: {}, moreSection: null, skyMode: null };
  try { var saved = JSON.parse(sessionStorage.getItem('trilog.view') || 'null'); if (saved) { st.view = saved.view || null; st.period = saved.period || 365; st.triKey = saved.triKey || null; } } catch (e) {}
  var R = null, TOC = [];
  var ICON = { tri: 'tri', multi: 'tri', swim: 'swim', bike: 'bike', run: 'run', mehr: 'gear' };

  /* Module: frei kombinierbar. Alle drei → Triathlon, zwei → Gesamt, eins → nur diese Seite */
  A.modules = function () { var m = (TL.store.profile().modules) || { swim: true, bike: true, run: true }; var on = ['swim', 'bike', 'run'].filter(function (k) { return m[k] !== false; }); return on.length ? on : ['run']; };
  function tabs() {
    var on = A.modules(), t = [];
    if (on.length === 3) t.push(['tri', 'Triathlon']); else if (on.length === 2) t.push(['multi', 'Gesamt']);
    on.forEach(function (k) { t.push([k, V.NAME[k]]); });
    t.push(['mehr', 'Mehr']);
    return t;
  }
  function validView(v) { return tabs().some(function (t) { return t[0] === v; }); }

  A.reload = function (view, keep) { if (view) st.view = view; compute(); A.render(keep); };
  function compute() {
    st.plan = TL.store.plan();
    R = M.compute(TL.store.units(), TL.store.profile(), TL.store.races(), st.plan, { gear: TL.store.gear(), assign: TL.store.assign() });
  }

  /* ---------- Kopfzeile ---------- */
  A.renderHeader = function () {
    var h = U.$('top'); U.clear(h);
    h.appendChild(el('div', { cls: 'brand' }, '<span class="mark" aria-hidden="true"><i class="s-swim"></i><i class="s-bike"></i><i class="s-run"></i></span><span class="wm">Tri<b>Log</b></span>'));
    var T = tabs(), right = el('div', { cls: 'hright' });
    if (st.view !== 'mehr' && R && !R.empty) right.appendChild(V.chips([[91, '3M'], [182, '6M'], [365, '12M']], st.period, function (p) { st.period = p; persist(); A.render(true); }, 'period'));
    var b = S.backupState(), bk = el('button', { cls: 'bkbtn press ' + b.cls, type: 'button', 'aria-label': 'Sicherung: ' + b.title, title: b.title + ' · ' + b.text }, '<span class="bdot ' + b.cls + '"></span>' + U.ico('save', 18));
    bk.onclick = function () { if (b.cls === 'none') { A.openMore('daten'); return; } S.saveBackup(); };
    right.appendChild(bk);
    var nav = el('nav', { cls: 'dtabs', 'aria-label': 'Ansichten' });
    T.forEach(function (t) { var a = el('button', { cls: 'press t-' + t[0] + (st.view === t[0] ? ' on' : ''), type: 'button', 'aria-current': st.view === t[0] ? 'page' : null }, U.ico(ICON[t[0]], 17) + '<span>' + t[1] + '</span>'); a.onclick = function () { A.show(t[0]); }; nav.appendChild(a); });
    h.appendChild(nav); h.appendChild(right);
    var tb = U.$('tabbar'); U.clear(tb);
    T.forEach(function (t) { var a = el('button', { cls: 'press t-' + t[0] + (st.view === t[0] ? ' on' : ''), type: 'button', 'aria-current': st.view === t[0] ? 'page' : null }, U.ico(ICON[t[0]], 22) + '<span>' + t[1] + '</span>'); a.onclick = function () { A.show(t[0]); }; tb.appendChild(a); });
  };
  function persist() { try { sessionStorage.setItem('trilog.view', JSON.stringify({ view: st.view, period: st.period, triKey: st.triKey })); } catch (e) {} }
  A.show = function (v) { st.view = v; st.skyDrawn = false; persist(); A.render(); window.scrollTo(0, 0); };

  /* ---------- Inhaltsverzeichnis und Kapitel-Leiste ---------- */
  function renderToc() {
    var toc = U.$('toc'), chap = U.$('chap'); U.clear(toc); U.clear(chap);
    U.$('shell').classList.toggle('notoc', !TOC.length);
    chap.hidden = !TOC.length;
    if (!TOC.length) return;
    toc.appendChild(el('p', { cls: 'tt', text: 'Inhalt' }));
    TOC.forEach(function (t) {
      [toc, chap].forEach(function (box) { var a = el('a', { href: '#' + t.id, 'data-id': t.id, text: t.title }); a.onclick = function (e) { e.preventDefault(); var x = U.$(t.id); if (x) x.scrollIntoView({ behavior: U.MOTION ? 'smooth' : 'auto', block: 'start' }); }; box.appendChild(a); });
    });
    spy();
  }
  var lastOn = null;
  function spy() {
    if (!TOC.length) return;
    var y = innerHeight * 0.3, cur = TOC[0].id;
    TOC.forEach(function (t) { var x = U.$(t.id); if (x && x.getBoundingClientRect().top < y) cur = t.id; });
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) cur = TOC[TOC.length - 1].id;
    if (cur === lastOn) return; lastOn = cur;
    [U.$('toc'), U.$('chap')].forEach(function (box) { [].forEach.call(box.querySelectorAll('a'), function (a) { var on = a.getAttribute('data-id') === cur; a.classList.toggle('on', on); if (on && box.id === 'chap') { var l = a.offsetLeft - box.clientWidth / 2 + a.clientWidth / 2; box.scrollTo({ left: l, behavior: U.MOTION ? 'smooth' : 'auto' }); } }); });
  }
  window.addEventListener('scroll', function () { requestAnimationFrame(spy); }, { passive: true });

  /* ---------- Hauptinhalt ---------- */
  A.render = function (keepScroll) {
    var y = window.scrollY;
    if (!validView(st.view)) st.view = tabs()[0][0];
    document.documentElement.setAttribute('data-sport', st.view === 'mehr' ? 'tri' : st.view);
    A.renderHeader();
    var root = U.$('view'); U.clear(root); lastOn = null;
    var wrap = U.$('main'); wrap.classList.remove('enter'); void wrap.offsetWidth; if (!keepScroll && U.MOTION) wrap.classList.add('enter');
    TOC = [];
    try {
      if (st.view === 'mehr') TOC = S.render(root, R, st) || [];
      else if (!R || R.empty) empty(root);
      else if (st.view === 'tri') TOC = V.tri(root, R, st);
      else if (st.view === 'multi') TOC = V.multi(root, R, st, A.modules());
      else TOC = V[st.view](root, R, st);
    } catch (e) { console.error(e); root.appendChild(el('div', { cls: 'card' }, '<h3>Etwas ist schiefgelaufen</h3><p class="muted">' + esc(e.message) + '</p>')); }
    renderToc();
    reveal();
    reminder();
    if (keepScroll) window.scrollTo(0, y);
  };
  /* Kapitel erscheinen beim Hineinscrollen; ohne Bewegung oder bei Problemen stehen sie sofort da */
  function reveal() {
    var secs = document.querySelectorAll('#view .sec:not(.herosec)');
    if (!U.MOTION || !window.IntersectionObserver) return;
    document.documentElement.classList.add('anim');
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
    [].forEach.call(secs, function (s) { s.classList.add('rv'); var r = s.getBoundingClientRect(); if (r.top < innerHeight) s.classList.add('in'); else io.observe(s); });
    setTimeout(function () { [].forEach.call(secs, function (s) { s.classList.add('in'); }); }, 4000);
  }
  function empty(root) {
    root.appendChild(el('div', { cls: 'mhead' }, '<p class="kick">Willkommen</p><h1>Dein Logbuch ist noch leer.</h1>'));
    var c = el('section', { cls: 'card emptyc' });
    c.innerHTML = '<div class="mark big" aria-hidden="true"><i class="s-swim"></i><i class="s-bike"></i><i class="s-run"></i></div><p>Importiere deinen Garmin-Export, dann rechnet TriLog Form, Prognosen und Zonen für Schwimmen, Rad und Laufen.</p>';
    c.appendChild(V.btn('Garmin-CSV importieren', 'upload', pick, 'primary'));
    c.appendChild(V.btn('Sicherung laden', 'save', function () { A.openMore('daten'); }));
    root.appendChild(c);
  }
  function pick() { var fi = el('input', { type: 'file', accept: '.csv,text/csv' }); fi.onchange = function () { if (fi.files[0]) A.importFile(fi.files[0]); }; fi.click(); }
  A.pick = pick;

  /* ---------- Navigation aus Insights ---------- */
  A.go = function (target) {
    if (['swim', 'bike', 'run'].indexOf(target) >= 0) { if (validView(target)) A.show(target); return; }
    var alias = { eff: ['perf', 'tech'], formcard: ['form'], dyn: ['dyn', 'perf'], tech: ['tech'], material: ['material'] };
    var t = U.$(target); if (!t) (alias[target] || []).some(function (a) { t = U.$(a); return !!t; }); if (!t) return;
    t.scrollIntoView({ behavior: U.MOTION ? 'smooth' : 'auto', block: 'start' });
    t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash');
  };
  A.openMore = function (section) { st.moreSection = section; A.show('mehr'); };
  A.state = st;

  /* ---------- Erklärung als Blatt ---------- */
  A.explain = function (key) {
    var g = TL.GLOSSAR[key]; if (!g) return;
    var ov = U.$('sheet'); U.clear(ov);
    var s = el('div', { cls: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': g[0] });
    s.innerHTML = '<div class="grab"></div><h3>' + esc(g[0]) + '</h3><p><b>Was wird gemessen?</b><br>' + esc(g[1]) + '</p><p><b>Wozu dient es?</b><br>' + esc(g[2]) + '</p>';
    var x = el('button', { cls: 'tbtn press primary', type: 'button', text: 'Verstanden' }); x.onclick = close; s.appendChild(x);
    ov.appendChild(s); ov.classList.add('on'); setTimeout(function () { x.focus(); }, 30);
    ov.onclick = function (e) { if (e.target === ov) close(); };
    function close() { ov.classList.remove('on'); }
  };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var o = U.$('sheet'); if (o) o.classList.remove('on'); } });

  /* ---------- Import ---------- */
  A.importFile = function (file) {
    file.text().then(function (t) {
      var res;
      try { res = TL.importCSV(t); } catch (e) { U.toast(e.message); return; }
      var m = TL.store.merge(res.units);
      if (!m.saved) { U.toast('Speichern im Browser nicht möglich. Ist privates Surfen aktiv?'); return; }
      var meta = TL.store.meta(); meta.onboarded = true; TL.store.setMeta(meta);
      quietUntil = Date.now() + 8000; compute(); if (st.view === 'mehr' && !U.$('ob')) st.view = null; A.render();
      U.toast(m.added + ' neue Einheiten importiert, ' + m.total + ' insgesamt.', ['Jetzt sichern', S.saveBackup]);
      closeOnboarding();
    });
  };

  /* ---------- Erinnerung an die Sicherung ---------- */
  var quietUntil = 0;
  function reminder() {
    if (Date.now() < quietUntil) { U.$('remind').classList.remove('on'); return; }
    var bar = U.$('remind'), m = TL.store.meta(), b = S.backupState();
    var dismissed = false; try { dismissed = sessionStorage.getItem('trilog.remind') === '1'; } catch (e) {}
    var stale = b.cls === 'due' && m.lastChange && (Date.now() - m.lastChange > 3 * 864e5 || !m.lastBackup);
    if (!stale || dismissed || st.view === 'mehr') { bar.classList.remove('on'); return; }
    U.clear(bar);
    bar.appendChild(el('span', null, U.ico('save', 17) + '<span>' + esc(b.text.replace(/^./, function (c) { return c.toUpperCase(); })) + '. Jetzt sichern?</span>'));
    var y = el('button', { cls: 'tbtn primary press small', type: 'button', text: 'Sichern' }); y.onclick = function () { S.saveBackup(); bar.classList.remove('on'); };
    var n = el('button', { cls: 'ibtn press', type: 'button', 'aria-label': 'Später' }, U.ico('x', 15)); n.onclick = function () { try { sessionStorage.setItem('trilog.remind', '1'); } catch (e) {} bar.classList.remove('on'); };
    bar.appendChild(y); bar.appendChild(n); bar.classList.add('on');
  }

  /* ---------- Onboarding ---------- */
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
  A.onboarding = function (force) {
    var meta = TL.store.meta();
    if (!force && meta.onboarded) return;
    var ov = el('div', { cls: 'ob', id: 'ob', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Willkommen bei TriLog' });
    var steps = [
      { t: 'Willkommen bei TriLog', b: '<div class="mark big"><i class="s-swim"></i><i class="s-bike"></i><i class="s-run"></i></div><p>Das Logbuch für Schwimmen, Rad und Laufen. TriLog liest deinen Garmin-Export, rechnet Form, Zonen und Prognosen und zeigt dir, welche Disziplin dich gerade am meisten Zeit kostet.</p><p class="muted">Alles bleibt auf diesem Gerät. Es gibt kein Konto und keinen Server mit deinen Daten.</p>' },
      { t: 'Wichtig: Speicherort', b: '<p>Deine Daten liegen im Browser dieses Geräts.</p>' + (isIOS && !standalone ? '<div class="warnbox">' + U.ico('warn', 18) + '<p><b>Am iPhone:</b> Safari löscht gespeicherte Daten einer Webseite, wenn du sie sieben Tage nicht öffnest. Leg TriLog auf den Home-Bildschirm, dann bleibt alles erhalten:<br>Teilen-Symbol → „Zum Home-Bildschirm“.</p></div>' : '<div class="infobox">' + U.ico('info', 18) + '<p>Wenn du den Browserverlauf löschst, sind auch deine TriLog-Daten weg. Am iPhone löscht Safari sie außerdem nach sieben Tagen ohne Besuch, außer TriLog liegt auf dem Home-Bildschirm.</p></div>') + '<p>Der Punkt neben dem Speichersymbol oben zeigt, ob deine letzten Änderungen gesichert sind: grün gesichert, gelb offen.</p>' },
      { t: 'Deine Daten', b: '<p>Exportiere deine Aktivitäten aus Garmin Connect am Rechner: Aktivitäten → Alle Aktivitäten → nach unten scrollen bis 12 Monate geladen sind → „CSV exportieren“.</p><p class="muted">Deutsche und englische Exporte funktionieren. Welche Uhr du nutzt, ist egal.</p>', import: true },
      { t: 'Kurz zu dir', b: '<p>Drei Angaben machen die Rechnung genauer. Alles ist optional und später unter „Mehr → Profil“ änderbar.</p>', profile: true }
    ];
    var i = 0, card = el('div', { cls: 'obc' }); ov.appendChild(card); document.body.appendChild(ov);
    function draw() {
      var s = steps[i]; U.clear(card);
      card.appendChild(el('div', { cls: 'obdots' }, steps.map(function (_, k) { return '<i class="' + (k === i ? 'on' : '') + '"></i>'; }).join('')));
      card.appendChild(el('h2', { text: s.t }));
      card.appendChild(el('div', { cls: 'obb' }, s.b));
      if (s.import) { card.appendChild(V.btn('Garmin-CSV auswählen', 'upload', pick, 'primary')); if (TL.store.units().length) card.appendChild(el('p', { cls: 'foot', text: TL.store.units().length + ' Einheiten sind bereits geladen.' })); }
      if (s.profile) {
        var p = TL.store.profile(), g = el('div', { cls: 'fgrid' });
        g.innerHTML = '<label class="field"><span class="fl">Vorname</span><input id="ob-name" type="text" autocomplete="given-name" value="' + esc(p.name || '') + '"></label><label class="field"><span class="fl">Gewicht in kg</span><input id="ob-weight" type="number" inputmode="decimal" value="' + esc(p.weight || '') + '"></label><label class="field"><span class="fl">Ruhepuls</span><input id="ob-rest" type="number" inputmode="numeric" placeholder="50" value="' + esc(p.rest || '') + '"></label>';
        card.appendChild(g);
      }
      var nav = el('div', { cls: 'obnav' });
      if (i > 0) { var bk = el('button', { cls: 'tbtn press', type: 'button', text: 'Zurück' }); bk.onclick = function () { i--; draw(); }; nav.appendChild(bk); }
      var nx = el('button', { cls: 'tbtn primary press', type: 'button', text: i < steps.length - 1 ? 'Weiter' : 'Los geht’s' });
      nx.onclick = function () {
        if (steps[i].profile) { var p = TL.store.profile(); p.name = U.$('ob-name').value.trim(); p.weight = parseFloat(U.$('ob-weight').value) || p.weight || null; p.rest = parseFloat(U.$('ob-rest').value) || p.rest || null; TL.store.setProfile(p); }
        if (i < steps.length - 1) { i++; draw(); } else { var m = TL.store.meta(); m.onboarded = true; TL.store.setMeta(m); closeOnboarding(); A.reload(); }
      };
      nav.appendChild(nx); card.appendChild(nav);
      var sk = el('button', { cls: 'skip press', type: 'button', text: 'Überspringen' }); sk.onclick = function () { var m = TL.store.meta(); m.onboarded = true; TL.store.setMeta(m); closeOnboarding(); A.reload(); }; card.appendChild(sk);
    }
    draw();
  };
  function closeOnboarding() { var o = U.$('ob'); if (o) o.remove(); }

  /* ---------- Ort suchen und Rennwetter holen (Open-Meteo, ohne Schlüssel) ---------- */
  var online = /^(https?:|file:)$/.test(location.protocol) && window.fetch;
  function timeoutFetch(url, ms) { var c = window.AbortController ? new AbortController() : null, t = setTimeout(function () { c && c.abort(); }, ms || 8000); return fetch(url, c ? { signal: c.signal } : {}).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error(r.status); return r.json(); }); }
  A.geocode = function (race) {
    if (!online) { A.reload('mehr'); return; }
    timeoutFetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=de&name=' + encodeURIComponent(race.ort)).then(function (j) {
      var g = j && j.results && j.results[0]; if (!g) { U.toast('Ort „' + race.ort + '“ nicht gefunden. Das Rennen rechnet ohne Wetter.'); return; }
      var list = TL.store.races(); list.forEach(function (r) { if (r.id === race.id) { r.lat = Math.round(g.latitude * 100) / 100; r.lon = Math.round(g.longitude * 100) / 100; delete r.wx; } }); TL.store.setRaces(list);
    }).catch(function () {}).then(function () { A.reload('mehr'); weather(); });
  };
  function weather() {
    if (!online) return;
    var today = U.todayLocal();
    TL.store.races().filter(function (r) { return r.lat && U.dn(r.date) >= today && U.dn(r.date) - today <= 366; }).forEach(function (r) {
      var ahead = U.dn(r.date) - today, fc = ahead <= 14;
      if (r.wx && r.wx.at === U.ds(today) && (r.wx.src === 'Vorhersage') === fc) return;
      var y = new Date().getFullYear(), url = fc ? 'https://api.open-meteo.com/v1/forecast?latitude=' + r.lat + '&longitude=' + r.lon + '&daily=temperature_2m_max,dew_point_2m_mean&timezone=auto&forecast_days=16'
        : 'https://archive-api.open-meteo.com/v1/archive?latitude=' + r.lat + '&longitude=' + r.lon + '&start_date=' + (y - 20) + '-01-01&end_date=' + (y - 1) + '-12-31&daily=temperature_2m_max,dew_point_2m_mean&timezone=auto';
      timeoutFetch(url).then(function (j) {
        var d = j && j.daily; if (!d || !d.time) return; var tm, td, src;
        if (fc) { var i = d.time.indexOf(r.date); if (i < 0 || d.temperature_2m_max[i] == null) return; tm = d.temperature_2m_max[i]; td = d.dew_point_2m_mean[i]; src = 'Vorhersage'; }
        else { var mm = +r.date.slice(5, 7) - 1, dd = +r.date.slice(8, 10), a = 0, b = 0, n = 0; d.time.forEach(function (t, k) { var yy = +t.slice(0, 4); if (Math.abs(U.dn(t) - Date.UTC(yy, mm, dd) / 864e5) <= 3 && d.temperature_2m_max[k] != null && d.dew_point_2m_mean[k] != null) { a += d.temperature_2m_max[k]; b += d.dew_point_2m_mean[k]; n++; } }); if (!n) return; tm = a / n; td = b / n; src = 'Mittel ' + (y - 20) + '–' + (y - 1); }
        var list = TL.store.races(); list.forEach(function (x) { if (x.id === r.id) x.wx = { tmax: Math.round(tm * 10) / 10, td: Math.round(td * 10) / 10, src: src, at: U.ds(today) }; });
        try { localStorage.setItem('trilog.v1.races', JSON.stringify(list)); } catch (e) {}
        compute(); A.render(true);
      }).catch(function () {});
    });
  }

  /* ---------- Start ---------- */
  var rT, lastW = innerWidth; window.addEventListener('resize', function () { if (Math.abs(innerWidth - lastW) < 2) return; lastW = innerWidth; clearTimeout(rT); rT = setTimeout(function () { V.redraw(); }, 150); });
  document.addEventListener('scroll', U.hideTip, { passive: true });
  A.start = function () {
    if (!TL.store.ok) { U.$('view').appendChild(el('div', { cls: 'card' }, '<h3>Speichern nicht möglich</h3><p class="muted">Dieser Browser erlaubt TriLog keinen lokalen Speicher, zum Beispiel im privaten Modus. Öffne TriLog in einem normalen Fenster.</p>')); return; }
    compute(); A.render(); A.onboarding(false); setTimeout(weather, 800);
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
  };
})(window.TL = window.TL || {});
