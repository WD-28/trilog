/* TriLog · Bausteine der Ansichten: Kapitel, Kopfzone, Insights, Race Day, gemeinsame Abschnitte */
(function (TL) {
  'use strict';
  var U = TL.u, M = TL.model, C = TL.chart, I = TL.insights, V = TL.views = {};
  var el = U.el, esc = U.esc, num = U.num;
  var NAME = { swim: 'Schwimmen', bike: 'Rad', run: 'Laufen', tri: 'Triathlon', multi: 'Gesamt' };
  V.NAME = NAME;

  /* ---------- kleine Bausteine ---------- */
  function info(key) { var b = el('button', { cls: 'ibtn press', type: 'button', 'aria-label': 'Erklärung: ' + (TL.GLOSSAR[key] ? TL.GLOSSAR[key][0] : key) }, U.ico('info', 16)); b.onclick = function (e) { e.stopPropagation(); TL.app.explain(key); }; return b; }
  V.info = info;
  function card(o) {
    o = o || {};
    var c = el('div', { cls: 'card ' + (o.cls || ''), id: o.id || null });
    if (o.title) {
      var h = el('header', { cls: 'ch' }), t = el('div', { cls: 'cht' }); t.appendChild(el('h3', { text: o.title })); if (o.info) t.appendChild(info(o.info));
      var w = el('div', { cls: 'chw' }); w.appendChild(t); if (o.sub) w.appendChild(el('p', { cls: 'sub', text: o.sub })); h.appendChild(w);
      if (o.right) { var r = el('div', { cls: 'chr' }); if (typeof o.right === 'string') r.innerHTML = o.right; else r.appendChild(o.right); h.appendChild(r); }
      c.appendChild(h);
    }
    return c;
  }
  V.card = card;
  function tiles(list, cls) {
    var g = el('div', { cls: 'tiles ' + (cls || '') });
    list.forEach(function (x) { if (!x) return; var t = el('div', { cls: 'tile' + (x[3] ? ' warn' : '') }); t.innerHTML = '<span class="l">' + esc(x[1]) + '</span><span class="v num">' + U.big(x[0]) + '</span>' + (x[2] ? '<span class="n">' + esc(x[2]) + '</span>' : ''); if (x[4]) t.querySelector('.l').appendChild(info(x[4])); g.appendChild(t); });
    return g;
  }
  V.tiles = tiles;
  function need(text, have, want) {
    var d = el('div', { cls: 'need' });
    d.innerHTML = '<div class="needh">' + U.ico('info', 18) + '<b>Noch nicht genug Daten</b></div><p>' + esc(text) + '</p>' + (want ? '<div class="prog"><i style="width:' + Math.min(100, have / want * 100) + '%"></i></div><span class="n">' + have + ' von ' + want + '</span>' : '');
    return d;
  }
  V.need = need;
  function chips(opts, val, onPick, cls) {
    var g = el('div', { cls: 'seg ' + (cls || ''), role: 'tablist' });
    opts.forEach(function (o) { var b = el('button', { cls: 'press' + (o[0] === val ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': o[0] === val ? 'true' : 'false', text: o[1] }); b.onclick = function () { [].forEach.call(g.children, function (x) { x.classList.remove('on'); x.setAttribute('aria-selected', 'false'); }); b.classList.add('on'); b.setAttribute('aria-selected', 'true'); onPick(o[0]); }; g.appendChild(b); });
    return g;
  }
  V.chips = chips;
  function btn(label, icon, fn, cls) { var b = el('button', { cls: 'tbtn press ' + (cls || ''), type: 'button' }, U.ico(icon, 15) + '<span>' + esc(label) + '</span>'); b.onclick = fn; return b; }
  V.btn = btn;
  function host(parent, cls) { var h = el('div', { cls: 'chost ' + (cls || '') }); parent.appendChild(h); return h; }
  V.host = host;
  var REDRAW = [];
  V.later = function (f) { REDRAW.push(f); requestAnimationFrame(function () { try { f(); } catch (e) { console.error(e); } }); };
  V.redraw = function () { REDRAW.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); };
  V.reset = function () { REDRAW = []; };
  V.legend = function (list) { var d = el('div', { cls: 'legend' }); list.forEach(function (x) { d.appendChild(el('span', null, '<i class="s-' + x[0] + '"></i>' + esc(x[1]))); }); return d; };
  V.formWord = function (f) { return f < -25 ? 'sehr belastet' : f <= -10 ? 'im Aufbau' : f <= 5 ? 'ausgeglichen' : f <= 15 ? 'frisch' : 'sehr frisch'; };
  V.acwrWord = function (a) { return a == null ? 'zu wenig Daten' : a < 0.8 ? 'unter dem Gewohnten' : a <= 1.3 ? 'im Zielkorridor' : a <= 1.5 ? 'erhöht' : 'deutlich erhöht'; };
  V.swimM = function (km) { return num(km * 1000, 0) + ' m'; };
  V.periodUnits = function (R, st, sport) { return R.units.filter(function (u) { return u.d > R.today - st.period && (!sport || u.sport === sport); }); };
  function headHTML(t) { var w = t.split(' '); var last = w.splice(-2).join(' '); return esc(w.join(' ')) + ' <span class="pt">' + esc(last) + '</span>'; }

  /* ---------- Seite aus Kapiteln ---------- */
  V.page = function (root, defs) {
    var toc = [];
    defs.forEach(function (d) {
      if (!d) return;
      var s = el('section', { cls: 'sec' + (d.hero ? ' herosec' : ''), id: d.id });
      if (d.hero) s.style.paddingTop = '8px';
      if (!d.hero) { var h = el('div', { cls: 'sech' }); h.innerHTML = '<div><h2>' + esc(d.title) + '</h2>' + (d.intro ? '<p>' + esc(d.intro) + '</p>' : '') + '</div>'; if (d.right) h.appendChild(d.right); s.appendChild(h); }
      var body = el('div', { cls: 'secb' }); s.appendChild(body);
      root.appendChild(s);
      try { d.build(body); } catch (e) { console.error(e); body.appendChild(el('div', { cls: 'card' }, '<p class="muted">Dieser Abschnitt konnte nicht berechnet werden: ' + esc(e.message) + '</p>')); }
      toc.push({ id: d.id, title: d.toc || d.title });
    });
    return toc;
  };

  /* ---------- Kopfzone mit 3D-Jahr ---------- */
  V.hero = function (body, R, st, o) {
    var hz = el('div', { cls: 'hero' });
    var p = R.profile || {}, hr = new Date().getHours(), g = hr < 11 ? 'Guten Morgen' : hr < 18 ? 'Hallo' : 'Guten Abend';
    var grid = el('div', { cls: 'hgrid' }), L = el('div'), Rt = el('div');
    L.innerHTML = '<div class="hk">' + U.ico(o.icon, 16, '#fff') + '<span>' + esc(o.kicker) + '</span></div><h1>' + esc(o.title || (g + (p.name ? ', ' + p.name : ''))) + '<span class="dot">.</span></h1>' + (o.lead ? '<p class="hlead">' + esc(o.lead) + '</p>' : '');
    if (o.main) { var mm = el('div', { cls: 'hstats hmain' }); mm.innerHTML = '<div><span class="big num">' + U.big(o.main[0]) + (o.main[1] ? '<small>' + esc(o.main[1]) + '</small>' : '') + '</span><span class="l">' + esc(o.main[2]) + '</span></div>'; L.appendChild(mm); }
    var hs = el('div', { cls: 'hstats' }); (o.stats || []).forEach(function (s) { hs.appendChild(el('div', null, '<span class="big num">' + U.big(s[0]) + (s[1] ? '<small>' + esc(s[1]) + '</small>' : '') + '</span><span class="l">' + esc(s[2]) + '</span>')); }); L.appendChild(hs);
    if (o.chips && o.chips.length) { var hc = el('div', { cls: 'hchips' }); o.chips.forEach(function (c) { hc.appendChild(el('span', { cls: 'hchip' + (c[2] ? ' warnh' : '') }, U.ico(c[0], 14, c[2] ? null : '#fff') + esc(c[1]))); }); L.appendChild(hc); }
    var ctl = el('div', { cls: 'hctl' }), note = el('p', { cls: 'skynote' });
    var sky = U.sv('svg', { class: 'sky', role: 'img', 'aria-label': 'Dein Jahr als 3D-Landschaft' });
    var modes = o.modes || [['vol', 'Umfang'], ['load', 'Belastung'], ['perf', 'Leistung']];
    var mode = st.skyMode && modes.some(function (m) { return m[0] === st.skyMode; }) ? st.skyMode : modes[0][0];
    function draw(anim) {
      var r = C.skyline(sky, R, { sports: o.sports, mode: mode, animate: anim, dark: o.dark });
      note.textContent = mode === 'perf' ? (o.perfNote || 'Höhe: Leistung je Tag') + ', skaliert von ' + o.perfFmt(r.base) + ' bis ' + o.perfFmt(r.max) : mode === 'load' ? 'Höhe: Belastungspunkte je Tag · eine Säule pro Tag, Wochen von alt nach neu' : 'Höhe: ' + (o.volNote || 'Umfang je Tag') + ' · eine Säule pro Tag, Wochen von alt nach neu';
    }
    ctl.appendChild(el('span', { cls: 'lab', text: '12 Monate' }));
    ctl.appendChild(chips(modes, mode, function (m) { mode = m; st.skyMode = m; draw(true); }, 'light'));
    Rt.appendChild(ctl); Rt.appendChild(sky); Rt.appendChild(note);
    grid.appendChild(L); grid.appendChild(Rt); hz.appendChild(grid);
    body.appendChild(hz);
    draw(!st.skyDrawn); st.skyDrawn = true;
    REDRAW.push(function () { draw(false); });
  };

  /* ---------- Insights: Befund und Beobachtungen ---------- */
  V.insights = function (body, R, st, IN, sport) {
    var B = IN.befund, c = card({ cls: 'reveal', id: 'befund-' + sport });
    var L = el('div', { style: 'min-width:0;position:relative' });
    L.innerHTML = '<div class="bmeta"><span class="spark' + (B.risk ? ' risk' : '') + '">' + U.ico(B.icon || 'check', 18) + '</span><span class="chip ' + (B.risk ? 'warnc' : 'acc') + '">Befund' + (B.cat ? ' · ' + esc(B.cat) : '') + '</span></div><h3 class="bh' + (B.risk ? ' risk' : '') + '">' + headHTML(B.title) + '</h3><p class="bs">' + esc(B.sentence) + '</p>';
    var bst = el('div', { cls: 'bst' }); (B.stats || []).forEach(function (x) { bst.appendChild(el('div', null, '<span class="num big">' + U.big(x[0]) + '</span><span class="n">' + esc(x[1]) + '</span>')); }); L.appendChild(bst);
    if (B.steps) { var dt = el('details', { cls: 'way' }); dt.innerHTML = '<summary>' + U.ico('sigma', 15) + 'Rechenweg</summary><ol>' + B.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>'; L.appendChild(dt); }
    c.appendChild(L);
    var ch = B.chart && V.befundChart(R, st, B, sport);
    if (ch) c.appendChild(ch); else c.style.gridTemplateColumns = 'minmax(0,1fr)';
    body.appendChild(c);
    var g = el('div', { cls: 'igrid' });
    IN.items.forEach(function (it) {
      var b = el('button', { cls: 'card ins press' + (it.risk ? ' risk' : ''), type: 'button' });
      b.innerHTML = '<div class="it"><span class="isq' + (it.risk ? ' risk' : '') + '">' + U.ico(it.icon || 'info', 17) + '</span><span class="cat">' + esc(it.cat) + '</span><span class="chip' + (it.grade === 'belegt' ? ' acc' : '') + '">' + esc(it.grade) + '</span></div><span class="num big iv">' + U.big(it.value) + '</span><h4>' + esc(it.title) + '</h4><p>' + esc(it.sentence) + '</p><span class="bl">' + esc(it.beleg) + U.ico('chev', 14) + '</span>';
      b.onclick = function () { TL.app.go(it.target); };
      g.appendChild(b);
    });
    body.appendChild(g);
  };
  V.befundChart = function (R, st, B, sport) {
    var wrap = el('div', { cls: 'rvchart' }), h = el('div', { cls: 'chost' }), k = B.chart.kind;
    if (k === 'easy' && R.run.zones && R.run.easyRuns.length) {
      wrap.appendChild(el('div', { cls: 'cap', text: 'Lockere Läufe, letzte zwölf Wochen · Puls je Lauf' })); wrap.appendChild(h);
      V.later(function () { C.scatter(h, R.run.easyRuns.map(function (u) { return { d: u.d, y: u.hr, rows: [[u.hr + ' Puls', 'Durchschnitt', 'var(--acc)'], [U.pace(u.pace) + ' /km', 'Tempo'], [num(u.km, 1) + ' km', 'Distanz']] }; }), { x0: R.today - 83, x1: R.today, line: R.run.zones[1], lineLabel: 'Zone 3 · ab ' + R.run.zones[1], label: 'Lockere Läufe' }); });
      return wrap;
    }
    if (k === 'eff') {
      var E = sport === 'run' ? (R.run.effSap && R.run.effSap.ready ? R.run.effSap : R.run.eff) : (R.bike.powerMode && R.bike.effW && R.bike.effW.ready ? R.bike.effW : R.bike.eff);
      if (!E || !E.months || E.months.length < 2) return null;
      wrap.appendChild(el('div', { cls: 'cap', text: 'Monatsmedian bei Puls ' + E.lo + '–' + E.hi })); wrap.appendChild(h);
      V.later(function () { C.months(h, E.months, V.effOpts(E)); });
      return wrap;
    }
    if (k === 'dps' && R.swim.dps.length >= 2) {
      wrap.appendChild(el('div', { cls: 'cap', text: 'Meter pro Zug, Monatsmedian' })); wrap.appendChild(h);
      V.later(function () { C.months(h, R.swim.dps, { fmt: function (v) { return num(v, 2) + ' m'; }, name: 'Zuglänge', label: 'Zuglänge', minPad: 0.05 }); });
      return wrap;
    }
    if (k === 'long') {
      var lr = R.bike.rides.slice().sort(function (a, b) { return b.sec - a.sec; }).slice(0, 5);
      wrap.appendChild(el('div', { cls: 'cap', text: 'Deine längsten Fahrten gegen den Radteil im Rennen' }));
      wrap.appendChild(h); C.hbars(h, [{ label: 'Rennen', v: B.chart.need, txt: U.hm(B.chart.need), cls: 'ghost' }].concat(lr.map(function (u) { return { label: U.de(u.d, true), v: u.sec, txt: U.hm(u.sec) + (u.km ? ' · ' + num(u.km, 0) + ' km' : '') }; })), { label: 'Längste Fahrten' });
      return wrap;
    }
    if (k === 'balance') {
      var sh = B.chart.share, tt = B.chart.tot || 1;
      wrap.appendChild(el('div', { cls: 'cap', text: 'Anteil an deiner Ausdauerzeit gegen Anteil an der Rennzeit' }));
      ['swim', 'bike', 'run'].forEach(function (s) { var tr = R.h84[s] / tt, r = el('div', { cls: 'bal' + (s === B.sport ? ' lim' : ''), style: 'margin-top:8px' }); r.innerHTML = '<div class="balh"><span class="sdot s-' + s + '"></span><b>' + NAME[s] + '</b></div><div class="balb"><span>dein Training</span><div class="track"><i class="f-' + s + '" style="width:' + tr * 100 + '%"></i></div><b class="num">' + num(tr * 100, 0) + ' %</b></div><div class="balb"><span>im Rennen</span><div class="track"><i class="ghost" style="width:' + sh[s] * 100 + '%"></i></div><b class="num">' + num(sh[s] * 100, 0) + ' %</b></div>'; wrap.appendChild(r); });
      return wrap;
    }
    if (k === 'weeks') {
      var s = sport === 'tri' || sport === 'multi' ? null : sport;
      wrap.appendChild(el('div', { cls: 'cap', text: s ? NAME[s] + ' je Woche, 26 Wochen' : 'Ausdauerstunden je Woche' })); wrap.appendChild(h);
      V.later(function () { C.weeks(h, R.weeks.slice(-27), V.weekOpts(R, s, B.chart.i != null ? { i: B.chart.i - (R.weeks.length - 1 - 26) , label: B.value } : null)); });
      return wrap;
    }
    return null;
  };
  V.effOpts = function (E) {
    var f = E.kind === 'pace' ? function (v) { return U.pace(v); } : E.kind === 'speed' ? function (v) { return num(v, 1); } : function (v) { return num(v, 0); };
    var unit = E.kind === 'pace' ? ' /km' : E.kind === 'speed' ? ' km/h' : ' W';
    return { invert: E.kind === 'pace', fmt: f, name: E.kind === 'pace' ? 'Tempo' : E.kind === 'speed' ? 'Tempo' : 'Leistung', label: 'Verlauf bei gleichem Puls', axisNote: E.kind === 'pace' ? 'min/km · schneller ↑' : unit.trim(), minPad: E.kind === 'pace' ? 5 : 1 };
  };
  V.weekOpts = function (R, s, mark) {
    if (!s) return { key: 'tri', stack: ['swim', 'bike', 'run'], val: function (W, k) { return W.h[k]; }, color: function (k) { return 'var(--c-' + k + ')'; }, unit: 'h', dec: 1, names: NAME, label: 'Ausdauerstunden je Woche', mark: mark };
    return { key: s, stack: [s], val: function (W) { return s === 'swim' ? W.swim * 1000 : W[s]; }, color: function (k, W, i) { return mark && mark.i === i ? 'var(--acc)' : 'var(--neutral)'; }, unit: s === 'swim' ? 'm' : 'km', dec: s === 'swim' ? 0 : 1, names: NAME, label: NAME[s] + ' je Woche', mark: mark };
  };

  /* ---------- Regler, der beim Ziehen nicht hängt ---------- */
  V.slider = function (o) {
    var sl = el('input', { type: 'range', min: o.min, max: o.max, step: o.step || 5, value: o.value, 'aria-label': o.label || 'Zielzeit', id: o.id || null });
    var raf = 0, cur = +o.value;
    function paint() { sl.style.setProperty('--p', ((cur - sl.min) / (sl.max - sl.min) * 100) + '%'); }
    sl.addEventListener('input', function () { cur = +sl.value; paint(); if (!raf) raf = requestAnimationFrame(function () { raf = 0; o.onInput(cur); }); });
    paint();
    sl.setValue = function (v) { cur = v; sl.value = v; paint(); };
    return sl;
  };
  function r5(x, s) { s = s || 5; return Math.round(x / s) * s; }
  function hrow(icon, cls, n, s, v) { var r = el('div', { cls: 'hrow' }); r.innerHTML = '<span class="hi ' + (cls || '') + '">' + U.ico(icon, 17) + '</span><span class="hn"><b>' + esc(n) + '</b><span></span></span><span class="hv num"></span>'; r.querySelector('.hn span').textContent = s; r.querySelector('.hv').textContent = v; return r; }
  V.hrow = hrow;
  function setRow(r, s, v) { r.querySelector('.hn span').textContent = s; r.querySelector('.hv').textContent = v; }
  function wxText(wx) { return wx ? num(wx.tmax, 0) + ' °C max · Taupunkt ' + num(wx.td, 0) + ' °C · ' + wx.src : 'noch keine Wetterdaten für den Ort'; }
  function header(race, R, fallback) {
    var h = el('div', { cls: 'rh' });
    h.innerHTML = '<div><p class="kick">' + U.ico('flag', 14) + (race ? 'Nächstes Rennen' : 'Prognose, wenn du heute startest') + '</p><h3>' + esc(race ? race.name : fallback) + '</h3><p class="sub">' + (race ? U.de(race.date) + (race.ort ? ' · ' + esc(race.ort) : '') : 'Lege unter „Mehr → Rennen“ dein Rennen an, dann rechnet TriLog mit Wetter und Strecke.') + '</p></div>' + (race ? '<div class="cd"><span class="num big">' + Math.max(0, U.dn(race.date) - R.realToday) + '</span><span>Tage</span></div>' : '');
    return h;
  }

  /* ---------- Race Day Laufen ---------- */
  V.runRace = function (body, R, st) {
    var race = R.nextRun && !R.nextRun.goalBad ? R.nextRun : (R.nextRun || null);
    var c = card({ id: 'race' }); body.appendChild(c);
    if (!R.run.vdot) { c.appendChild(need('Für eine Prognose braucht TriLog einen Lauf ab 3 km in den letzten 150 Tagen.')); return; }
    var dk = race ? race.dist : (st.runDist || 'HM');
    function build() {
      U.clear(c);
      c.appendChild(header(race, R, M.RUNDIST[dk].name));
      if (!race) c.appendChild(chips([['5', '5 km'], ['10', '10 km'], ['HM', 'HM'], ['M', 'M']], dk, function (k) { dk = k; st.runDist = k; build(); }, 'wide'));
      if (race && race.goalBad) c.appendChild(el('div', { cls: 'warnbox', style: 'margin-top:10px' }, U.ico('warn', 18) + '<p>Die eingetragene Zielzeit ' + esc(U.time(race.goalBad)) + ' passt nicht zu ' + esc(M.RUNDIST[dk].name) + '. Bitte unter „Mehr → Rennen“ als h:mm:ss eintragen, z. B. 1:40:00.</p>'));
      var D = M.RUNDIST[dk], wx = race ? race.wx : null, base = M.runRace(R, dk, null, race, wx);
      var goal = race && race.goal ? race.goal : r5(base.rt, 30);
      var g = el('div', { cls: 'rd', style: 'margin-top:14px' }), A = el('div'), Bm = el('div', { style: 'min-width:0' }), H = el('div', { cls: 'how' });
      g.appendChild(A); g.appendChild(Bm); g.appendChild(H); c.appendChild(g);
      var chE = el('div', { cls: 'chance' }); chE.innerHTML = '<span class="num big"><span class="cv"></span><small>%</small></span><span class="w"></span>'; A.appendChild(chE);
      var gap = el('p', { cls: 'sub' }); A.appendChild(gap);
      var play = el('div', { cls: 'play' }); A.appendChild(play);
      var zr = el('div', { cls: 'zrow' }); zr.innerHTML = '<span>Zielzeit durchspielen</span><span class="num big zt"></span>'; play.appendChild(zr);
      var sl = V.slider({ min: r5(base.rt * 0.9, 5), max: r5(base.rt * 1.1, 5), step: 5, value: goal, onInput: upd, id: 'goal-run' }); play.appendChild(sl);
      var wf = el('div', { cls: 'wf' }); wf.innerHTML = '<div><span>nötiger VDOT</span><b class="num vd"></b></div><div><span>Tempo</span><b class="num tp"></b></div>'; play.appendChild(wf);
      Bm.appendChild(el('div', { cls: 'subh', text: 'Mögliche Zielzeiten am Renntag' }));
      var bh = el('div', { cls: 'chost' }); Bm.appendChild(bh);
      var bell = null;
      H.appendChild(el('h4', { text: 'So entsteht die Zahl' }));
      var r1 = hrow('trend', 'c-run', 'Fitness', 'VDOT ' + num(R.run.vdot, 1) + ' aus ' + num(R.run.vdotRun.km, 1) + ' km am ' + U.de(R.run.vdotRun.d, true), U.time(base.fit)); H.appendChild(r1);
      H.appendChild(hrow('cloud', '', 'Wetter', race ? wxText(wx) : 'ohne Rennen nicht berücksichtigt', base.wx ? '+' + U.time(base.wx) : race ? 'nichts' : '–'));
      H.appendChild(hrow('mountain', '', 'Strecke', race ? (race.runHm ? race.runHm + ' Höhenmeter' : 'flach gerechnet') : 'flach gerechnet', base.st ? '+' + U.time(base.st) : 'nichts'));
      H.appendChild(hrow('sigma', '', 'Unsicherheit', (base.age > 90 ? 'Beleg älter als 90 Tage' : 'Beleg aus den letzten 90 Tagen') + ' · Band ' + num(D.band * 100, 1) + ' %', '± ' + U.time(base.sd)));
      var rb = el('div', { cls: 'rdbox' }); rb.innerHTML = '<span>Am Renntag</span><span class="num big">' + U.time(base.rt) + '</span>'; H.appendChild(rb);
      if (race && race.taper) H.appendChild(el('p', { cls: 'foot', text: 'Form am Renntag: ' + num(race.taper.form, 0, true) + ' (' + V.formWord(race.taper.form) + '), wenn du ab ' + U.de(race.taper.start, true) + ' auf rund 55 % der üblichen Last zurückgehst.' }));
      if (D.km > 15) { var fu = M.fuel(base.rt, wx && wx.tmax); H.appendChild(el('p', { cls: 'foot', text: 'Verpflegung als Faustregel: ' + fu.carb[0] + '–' + fu.carb[1] + ' g Kohlenhydrate und ' + fu.fluid[0] + '–' + fu.fluid[1] + ' ml Flüssigkeit pro Stunde. Kein individueller Ernährungsplan.' })); }
      function upd(v) {
        var rr = M.runRace(R, dk, v, race, wx);
        chE.querySelector('.cv').textContent = rr.chance; chE.querySelector('.w').innerHTML = 'Chance auf <b>' + esc(U.time(v)) + '</b> · ' + esc(I.chanceWord(rr.chance));
        gap.textContent = 'Deine Prognose liegt ' + I.gapTxt(rr.rt, v) + ' Ziel.';
        zr.querySelector('.zt').textContent = U.time(v); wf.querySelector('.vd').textContent = num(M.vdot(D.km, v), 1); wf.querySelector('.tp').textContent = U.pace(v / D.km) + ' /km';
        if (bell) bell.set(v);
      }
      V.later(function () { bell = C.bellLive(bh, base.rt, base.sd); upd(+sl.value); });
      upd(goal);
    }
    build();
  };

  /* ---------- Race Day Triathlon mit Teilzielen ---------- */
  V.triRace = function (body, R, st) {
    var c = card({ id: 'race' }); body.appendChild(c);
    var race = R.nextTri;
    var key = st.triKey || (race ? race.dist : 'H');
    function build() {
      U.clear(c);
      var r0 = race && race.dist === key ? race : null, wx = r0 ? r0.wx : null, tri = M.triRace(R, key, r0, wx), T = M.TRI[key];
      c.appendChild(header(r0 || (race && race.dist !== key ? null : race), R, T.name));
      c.appendChild(chips([['S', 'Sprint'], ['O', 'Olympisch'], ['H', '70.3'], ['F', '140.6']], key, function (k) { key = k; st.triKey = k; build(); }, 'wide'));
      c.appendChild(el('p', { cls: 'dist', text: num(T.swim, 0) + ' m Schwimmen · ' + num(T.bike, 1) + ' km Rad · ' + num(T.run, T.run % 1 ? 1 : 0) + ' km Laufen' + (race && race.dist !== key ? ' · dein Rennen ' + race.name + ' ist ' + M.TRI[race.dist].name : '') }));
      if (!tri.total) {
        var nb = el('div', { style: 'margin-top:12px;display:flex;flex-direction:column;gap:10px' });
        tri.missing.forEach(function (m) { nb.appendChild(need(NAME[m[0]] + ': Es fehlt noch ' + m[1] + '.')); });
        c.appendChild(nb); return;
      }
      if (r0 && r0.goalBad) c.appendChild(el('div', { cls: 'warnbox', style: 'margin-top:10px' }, U.ico('warn', 18) + '<p>Die eingetragene Zielzeit ' + esc(U.time(r0.goalBad)) + ' ist für ' + esc(T.name) + ' unrealistisch. Bitte als h:mm:ss eintragen.</p>'));
      var P = tri.parts, goal = r0 && r0.goal ? r0.goal : r5(tri.total, 30);
      var parts = { swim: P.swim.t, bike: P.bike.t, run: P.run.t }, useParts = false;
      var band = el('div', { cls: 'split' });
      [['swim'], ['t1'], ['bike'], ['t2'], ['run']].forEach(function (p) { var i = el('i', { cls: 's-' + p[0] }); i.style.flexGrow = P[p[0]].t; i.dataset.k = p[0]; band.appendChild(i); });
      var g = el('div', { cls: 'rd', style: 'margin-top:14px' }), A = el('div'), Bm = el('div', { style: 'min-width:0' }), H = el('div', { cls: 'how' });
      g.appendChild(A); g.appendChild(Bm); g.appendChild(H); c.appendChild(g);
      var chE = el('div', { cls: 'chance' }); chE.innerHTML = '<span class="num big"><span class="cv"></span><small>%</small></span><span class="w"></span>'; A.appendChild(chE);
      var gap = el('p', { cls: 'sub' }); A.appendChild(gap);
      var play = el('div', { cls: 'play' }); A.appendChild(play);
      var zr = el('div', { cls: 'zrow' }); zr.innerHTML = '<span>Zielzeit gesamt</span><span class="num big zt"></span>'; play.appendChild(zr);
      var sl = V.slider({ min: r5(tri.total * 0.9, 30), max: r5(tri.total * 1.1, 30), step: 30, value: goal, onInput: function (v) { useParts = false; upd(v); }, id: 'goal-tri' }); play.appendChild(sl);
      var dt = el('details', { cls: 'part' }); dt.innerHTML = '<summary>' + U.ico('list', 15) + 'Teilziele einstellen</summary>'; play.appendChild(dt);
      var psl = {};
      ['swim', 'bike', 'run'].forEach(function (k) {
        var row = el('div', { cls: 'prow2' }), zz = el('div', { cls: 'zrow' }); zz.innerHTML = '<span><i class="sdot s-' + k + '" style="margin-right:6px"></i>' + NAME[k] + ' <span class="pc"></span></span><b class="num pt"></b>'; row.appendChild(zz);
        var step = k === 'swim' ? 5 : 15, s2 = V.slider({ min: r5(P[k].t * 0.85, step), max: r5(P[k].t * 1.15, step), step: step, value: r5(P[k].t, step), label: 'Teilziel ' + NAME[k], onInput: function (v) { parts[k] = v; useParts = true; var tot = parts.swim + parts.bike + parts.run + P.t1.t + P.t2.t; sl.setValue(U.clamp(tot, +sl.min, +sl.max)); upd(tot); }, id: 'goal-' + k });
        row.appendChild(s2); psl[k] = { row: zz, s: s2 }; dt.appendChild(row);
      });
      Bm.appendChild(el('div', { cls: 'subh', text: 'Mögliche Zielzeiten am Renntag' }));
      var bh = el('div', { cls: 'chost' }); Bm.appendChild(bh); Bm.appendChild(band);
      Bm.appendChild(V.legend([['swim', 'Schwimmen'], ['t1', 'Wechselzonen'], ['bike', 'Rad'], ['run', 'Laufen']]));
      var bell = null;
      H.appendChild(el('h4', { text: 'So entsteht die Zahl' }));
      H.appendChild(hrow('swim', 'c-swim', 'Schwimmen', 'CSS ' + U.pace(R.swim.css) + ' /100 m · Freiwasser' + (tri.neo ? ' · mit Neo' : ' · ohne Neo'), U.time(P.swim.t)));
      H.appendChild(hrow('swap', '', 'Wechselzone 1 · Schwimmen → Rad', (r0 && r0.t1 ? 'aus deinem Rennen' : 'Richtwert für ' + T.name + ', im Rennen änderbar'), U.time(P.t1.t)));
      var bl = r0 ? M.bikeLeg(R, T.bike, T.ifp, T.spd, r0, wx) : null;
      H.appendChild(hrow('bike', 'c-bike', 'Rad', (R.bike.powerMode ? num(Math.round(T.ifp * R.bike.ftp), 0) + ' W (' + num(T.ifp * 100, 0) + ' % FTP)' : num(R.bike.baseSpeed * T.spd, 1) + ' km/h aus deinen Ausfahrten') + (r0 && r0.bikeHm ? ' · ' + r0.bikeHm + ' Hm' : ''), U.time(P.bike.t)));
      H.appendChild(hrow('swap', '', 'Wechselzone 2 · Rad → Laufen', (r0 && r0.t2 ? 'aus deinem Rennen' : 'Richtwert für ' + T.name + ', im Rennen änderbar'), U.time(P.t2.t)));
      H.appendChild(hrow('run', 'c-run', 'Laufen', 'frisch ' + U.time(P.run.flat) + ' · +' + num((T.runf - 1) * 100, 0) + ' % nach dem Rad' + (P.run.st ? ' · Höhenmeter +' + U.time(P.run.st) : ''), U.time(P.run.t)));
      H.appendChild(hrow('cloud', '', 'Wetter', r0 ? wxText(wx) : 'ohne Rennen nicht berücksichtigt', P.run.wx ? '+' + U.time(P.run.wx) + ' beim Laufen' : 'nichts'));
      H.appendChild(hrow('sigma', '', 'Unsicherheit', 'Streuung aller Teile zusammen' + (R.swim.cssSrc && R.swim.cssSrc.indexOf('geschätzt') === 0 ? ' · CSS geschätzt' : '') + (R.bike.powerMode ? '' : ' · ohne Wattmessung'), '± ' + U.time(tri.sd)));
      var rb = el('div', { cls: 'rdbox' }); rb.innerHTML = '<span>Am Renntag</span><span class="num big">' + U.time(tri.total) + '</span>'; H.appendChild(rb);
      var fu = M.fuel(P.bike.t + P.run.t, wx && wx.tmax);
      var fb = el('div'); fb.appendChild(el('div', { cls: 'subh', text: 'Verpflegung auf Rad und Laufstrecke (Faustregel)' }));
      fb.appendChild(tiles([[fu.carb[0] + '–' + fu.carb[1] + ' g', 'Kohlenhydrate/h', ''], [fu.fluid[0] + '–' + fu.fluid[1] + ' ml', 'Flüssigkeit/h', wx && wx.tmax >= 24 ? 'warm' : ''], [fu.totalCarb[0] + '–' + fu.totalCarb[1] + ' g', 'gesamt', U.hm(P.bike.t + P.run.t)]], 't3 fuel'));
      fb.appendChild(el('p', { cls: 'foot', text: 'Allgemeine Richtwerte nach Belastungsdauer. Was dein Magen verträgt, testest du im Training.' }));
      Bm.appendChild(fb);
      if (r0 && r0.taper) H.appendChild(el('p', { cls: 'foot', text: 'Form am Renntag: ' + num(r0.taper.form, 0, true) + ' (' + V.formWord(r0.taper.form) + '), Taper ab ' + U.de(r0.taper.start) + '.' }));
      function upd(v) {
        var sd = tri.sd, rt = tri.total, ch = Math.round(U.Phi((v - rt) / sd) * 100);
        chE.querySelector('.cv').textContent = ch; chE.querySelector('.w').innerHTML = 'Chance auf <b>' + esc(U.time(v)) + '</b> · ' + esc(I.chanceWord(ch));
        gap.textContent = 'Deine Prognose liegt ' + I.gapTxt(rt, v) + ' Ziel.';
        zr.querySelector('.zt').textContent = U.time(v);
        ['swim', 'bike', 'run'].forEach(function (k) {
          var pv = useParts ? parts[k] : r5(P[k].t + (v - rt) * P[k].t / (P.swim.t + P.bike.t + P.run.t), k === 'swim' ? 5 : 15);
          if (!useParts) { parts[k] = pv; psl[k].s.setValue(pv); }
          var pc = Math.round(U.Phi((pv - P[k].t) / P[k].sd) * 100);
          psl[k].row.querySelector('.pt').textContent = U.time(pv); psl[k].row.querySelector('.pc').textContent = '· ' + pc + ' %';
        });
        if (bell) bell.set(v);
      }
      V.later(function () { bell = C.bellLive(bh, tri.total, tri.sd); upd(+sl.value); });
      upd(goal);
    }
    build();
  };

  /* ---------- Race Day eines Teils (Schwimmen oder Rad) ---------- */
  V.legRace = function (body, R, st, sport) {
    var c = card({ id: 'race' }); body.appendChild(c);
    var race = R.nextTri, key = st.triKey || (race ? race.dist : 'H');
    function build() {
      U.clear(c);
      var r0 = race && race.dist === key ? race : null, T = M.TRI[key], wx = r0 ? r0.wx : null;
      var leg = sport === 'swim' ? M.swimLeg(R, T.swim, r0 || { neo: true }) : M.bikeLeg(R, T.bike, T.ifp, T.spd, r0, wx);
      c.appendChild(header(r0, R, (sport === 'swim' ? 'Schwimmteil ' : 'Radteil ') + T.name));
      c.appendChild(chips([['S', 'Sprint'], ['O', 'Olympisch'], ['H', '70.3'], ['F', '140.6']], key, function (k) { key = k; st.triKey = k; build(); }, 'wide'));
      c.appendChild(el('p', { cls: 'dist', text: sport === 'swim' ? num(T.swim, 0) + ' m im Freiwasser' : num(T.bike, 1) + ' km Rad' }));
      if (!leg) { c.appendChild(el('div', { style: 'margin-top:12px' })).appendChild(need('Es fehlt noch ' + (sport === 'swim' ? R.swim.need : R.bike.need) + '.')); return; }
      var goal = r5(leg.t, sport === 'swim' ? 5 : 30);
      var g = el('div', { cls: 'rd', style: 'margin-top:14px' }), A = el('div'), Bm = el('div', { style: 'min-width:0' }), H = el('div', { cls: 'how' });
      g.appendChild(A); g.appendChild(Bm); g.appendChild(H); c.appendChild(g);
      var chE = el('div', { cls: 'chance' }); chE.innerHTML = '<span class="num big"><span class="cv"></span><small>%</small></span><span class="w"></span>'; A.appendChild(chE);
      var play = el('div', { cls: 'play' }); A.appendChild(play);
      var zr = el('div', { cls: 'zrow' }); zr.innerHTML = '<span>Teilziel durchspielen</span><span class="num big zt"></span>'; play.appendChild(zr);
      var step = sport === 'swim' ? 5 : 30;
      var sl = V.slider({ min: r5(leg.t * 0.85, step), max: r5(leg.t * 1.15, step), step: step, value: goal, onInput: upd, id: 'goal-' + sport }); play.appendChild(sl);
      var wf = el('div', { cls: 'wf' }); wf.innerHTML = '<div><span>' + (sport === 'swim' ? 'Tempo' : 'Schnitt') + '</span><b class="num a"></b></div><div><span>' + (sport === 'swim' ? 'nötige CSS' : (R.bike.powerMode ? 'nötige Leistung' : 'gegen Prognose')) + '</span><b class="num b"></b></div>'; play.appendChild(wf);
      Bm.appendChild(el('div', { cls: 'subh', text: 'Mögliche Zeiten im Rennen' }));
      var bh = el('div', { cls: 'chost' }); Bm.appendChild(bh); var bell = null;
      H.appendChild(el('h4', { text: 'So entsteht die Zahl' }));
      if (sport === 'swim') {
        H.appendChild(hrow('drop', 'c-swim', 'CSS', R.swim.cssSrc, U.pace(R.swim.css) + ' /100 m'));
        H.appendChild(hrow('trend', '', 'Ausdauer über die Strecke', 'Aufschlag für ' + num(T.swim, 0) + ' m', '+' + num((leg.k - 1) * 100, 0) + ' %'));
        H.appendChild(hrow('cloud', '', 'Freiwasser', 'Orientierung, keine Wenden', '+5 %'));
        H.appendChild(hrow('swim', '', 'Neoprenanzug', r0 ? (leg.neo ? 'erlaubt' : 'nicht erlaubt') : 'angenommen: erlaubt', leg.neo !== false ? '−5 %' : 'nichts'));
      } else {
        H.appendChild(hrow('bike', 'c-bike', R.bike.powerMode ? 'Leistung' : 'Dauertempo', R.bike.powerMode ? num(Math.round(T.ifp * R.bike.ftp), 0) + ' W = ' + num(T.ifp * 100, 0) + ' % deiner FTP' : num(R.bike.baseSpeed * T.spd, 1) + ' km/h aus flachen Ausfahrten', U.time(leg.flat)));
        H.appendChild(hrow('mountain', '', 'Höhenmeter', r0 && r0.bikeHm ? r0.bikeHm + ' Hm laut Rennen' : 'flach gerechnet', leg.hm ? '+' + U.time(leg.hm) : 'nichts'));
        H.appendChild(hrow('cloud', '', 'Hitze', r0 ? wxText(wx) : 'ohne Rennen nicht berücksichtigt', leg.heat ? '+' + U.time(leg.heat) : 'nichts'));
        H.appendChild(el('p', { cls: 'foot', text: 'Wind ist nicht eingerechnet, weil er sich für einen Renntag nicht seriös schätzen lässt.' }));
      }
      H.appendChild(hrow('sigma', '', 'Unsicherheit', sport === 'swim' ? (leg.est ? 'CSS geschätzt' : 'CSS aus Test') : (R.bike.powerMode ? 'mit Wattmessung' : 'ohne Wattmessung'), '± ' + U.time(leg.sd)));
      var rb = el('div', { cls: 'rdbox' }); rb.innerHTML = '<span>Im Rennen</span><span class="num big">' + U.time(leg.t) + '</span>'; H.appendChild(rb);
      function upd(v) {
        var ch = Math.round(U.Phi((v - leg.t) / leg.sd) * 100);
        chE.querySelector('.cv').textContent = ch; chE.querySelector('.w').innerHTML = 'Chance auf <b>' + esc(U.time(v)) + '</b> · ' + esc(I.chanceWord(ch));
        zr.querySelector('.zt').textContent = U.time(v);
        if (sport === 'swim') { wf.querySelector('.a').textContent = U.pace(v / T.swim * 100) + ' /100 m'; wf.querySelector('.b').textContent = U.pace(R.swim.css * v / leg.t) + ' /100 m'; }
        else { wf.querySelector('.a').textContent = num(T.bike / (v / 3600), 1) + ' km/h'; wf.querySelector('.b').textContent = R.bike.powerMode ? num(T.ifp * R.bike.ftp * Math.pow(leg.t / v, 2.4), 0) + ' W' : U.time(v - leg.t) + (v < leg.t ? ' schneller' : ''); }
        if (bell) bell.set(v);
      }
      V.later(function () { bell = C.bellLive(bh, leg.t, leg.sd); upd(+sl.value); });
      upd(goal);
    }
    build();
  };

  /* ---------- Form und Belastung ---------- */
  V.form = function (body, R, st, key) {
    var S = R.ser[key], L = S.fit.length - 1, fit = S.fit[L], fat = S.fat[L], form = fit - fat;
    var a7 = U.sum(S.load.slice(-7)), c28 = U.sum(S.load.slice(-35, -7)) / 4, acwr = c28 > 0 ? a7 / c28 : null, ramp = fit - S.fit[Math.max(0, L - 7)];
    var l7 = S.load.slice(-7), mu = U.mean(l7), sd = Math.sqrt(U.mean(l7.map(function (x) { return (x - mu) * (x - mu); }))), mono = sd > 0 ? mu / sd : null;
    var g = el('div', { cls: 'grid' + (key === 'all' ? '' : ' g21') });
    var c1 = card({ title: 'Fitness, Ermüdung, Form', sub: key === 'all' ? 'alle Sportarten · Säulen: Tageslast je Disziplin' : 'nur ' + NAME[key], info: 'fitness' });
    c1.appendChild(tiles([[num(form, 0, true), 'Form', V.formWord(form), false, 'form'], [num(fit, 0), 'Fitness', '42 Tage', false, 'fitness'], [num(fat, 0), 'Ermüdung', '7 Tage', false, 'fatigue']], 't3'));
    var fh = host(c1); V.later(function () { C.fitness(fh, R, key, st.period, { stack: key === 'all' ? ['swim', 'bike', 'run'] : null, races: key === 'run' ? R.run.races : [] }); });
    if (key === 'all') c1.appendChild(V.legend([['swim', 'Schwimmen'], ['bike', 'Rad'], ['run', 'Laufen']]));
    g.appendChild(c1);
    var c2 = card({ cls: key === 'all' ? 'wideb' : '', title: 'Belastung', sub: 'letzte 7 Tage gegen die 4 Wochen davor', info: 'acwr' });
    var gw = el('div', { cls: 'gwrap' }), gh = el('div', { cls: 'gaugeh' }); gw.appendChild(gh); C.gauge(gh, acwr);
    var gt = el('div', { cls: 'gtext' }); gt.innerHTML = '<span class="l">Akut zu chronisch</span><span class="big num">' + (acwr ? num(acwr, 2) : '–') + '</span><span class="w">' + V.acwrWord(acwr) + '</span>'; gw.appendChild(gt); c2.appendChild(gw);
    c2.appendChild(tiles([[num(ramp, 1, true), 'Rampe', 'Fitness in 7 Tagen', ramp > 6, 'ramp'], [mono ? num(mono, 2) : '–', 'Monotonie', 'letzte 7 Tage', mono > 2, 'mono'], [num(a7, 0), 'Punkte', 'letzte 7 Tage', false, 'load']], 't3'));
    c2.appendChild(el('p', { cls: 'foot', text: 'Akut zu chronisch ist in der Forschung umstritten: ein Hinweis, kein Urteil.' }));
    g.appendChild(c2);
    body.appendChild(g);
  };

  /* ---------- Umfang und Konstanz ---------- */
  V.volume = function (body, R, st, s) {
    var nW = st.period === 91 ? 13 : st.period === 182 ? 26 : 52, g = el('div', { cls: 'grid g21' });
    var c1 = card({ title: s ? 'Umfang pro Woche' : 'Ausdauerstunden pro Woche', sub: (s ? (s === 'swim' ? 'Meter' : 'Kilometer') : 'gestapelt nach Disziplin') + ' · Linie: Schnitt der 4 Wochen davor' });
    var goal = s ? V.weekGoal(st.plan, s) : V.planHours(st.plan);
    var wh = host(c1); V.later(function () { var o = V.weekOpts(R, s); o.goal = goal; C.weeks(wh, R.weeks.slice(-(nW + 1)), o); });
    if (!s) c1.appendChild(V.legend([['swim', 'Schwimmen'], ['bike', 'Rad'], ['run', 'Laufen']]));
    g.appendChild(c1);
    var c2 = card({ title: 'Konstanz', sub: 'abgeschlossene Wochen' });
    var want = s === 'run' ? 3 : 2, done = R.weeks.slice(0, -1), cur = 0, best = 0, run = 0;
    var okW = function (W) { return s ? W.nd[s] >= want : (W.nd.swim + W.nd.bike + W.nd.run) >= 4; };
    for (var i = done.length - 1; i >= 0 && okW(done[i]); i--) cur++;
    done.forEach(function (W) { run = okW(W) ? run + 1 : 0; best = Math.max(best, run); });
    var hit6 = done.slice(-6).filter(okW).length;
    var list = R.units.filter(function (u) { return u.d >= R.from && (!s || u.sport === s); });
    var longest = s ? list.filter(function (u) { return u.km; }).sort(function (a, b) { return b.km - a.km; })[0] : list.slice().sort(function (a, b) { return b.sec - a.sec; })[0];
    var bigW = done.map(function (W) { return { W: W, v: s ? W[s] : W.h.swim + W.h.bike + W.h.run }; }).sort(function (a, b) { return b.v - a.v; })[0];
    c2.appendChild(el('p', { cls: 'balnote', text: s ? 'Eine Woche zählt, wenn du an mindestens ' + want + ' Tagen ' + (s === 'swim' ? 'geschwommen' : s === 'bike' ? 'Rad gefahren' : 'gelaufen') + ' bist.' : 'Eine Woche zählt ab 4 Ausdauertagen.' }));
    c2.appendChild(tiles([[hit6 + ' von 6', 'letzte 6 Wochen', 'erfüllt', hit6 === 0], [String(cur), 'aktuelle Serie', 'Wochen'], [String(best), 'längste Serie', 'Wochen']], 't3'));
    c2.appendChild(tiles([[longest ? (s === 'swim' ? V.swimM(longest.km) : s ? num(longest.km, 1) + ' km' : U.hm(longest.sec)) : '–', s ? 'Längste Einheit' : 'Längste Einheit', longest ? U.de(longest.d) : ''], [bigW && bigW.v ? (s === 'swim' ? V.swimM(bigW.v) : s ? num(bigW.v, 1) + ' km' : num(bigW.v, 1) + ' h') : '–', 'Größte Woche', bigW ? 'ab ' + U.de(bigW.W.start) : ''], [goal ? (s === 'swim' ? num(goal, 0) + ' m' : s ? num(goal, 0) + ' km' : num(goal, 1) + ' h') : '–', 'Wochenziel', goal ? 'aus deinem Plan' : 'kein Plan']], 't3'));
    g.appendChild(c2);
    var c3 = card({ cls: 'full', title: 'Dein Jahr, Tag für Tag', sub: s ? 'Farbe zeigt die Dauer ' + (s === 'swim' ? 'im Wasser' : s === 'bike' ? 'auf dem Rad' : 'beim Laufen') : 'Farbe: Disziplin mit der meisten Zeit · Helligkeit: Dauer' });
    var ch = host(c3); V.later(function () { C.calendar(ch, R, function (l) { return V.dayColor(l, s); }); });
    c3.appendChild(s ? el('div', { cls: 'legend' }, '<span><i style="background:var(--track)"></i>nichts</span><span><i style="background:var(--r2)"></i>bis 30 min</span><span><i style="background:var(--r4)"></i>bis 90 min</span><span><i style="background:var(--r5)"></i>länger</span><span><i style="background:var(--c-other);opacity:.5"></i>andere Sportart</span>') : V.legend([['swim', 'Schwimmen'], ['bike', 'Rad'], ['run', 'Laufen'], ['other', 'Kraft und Sonstiges']]));
    g.appendChild(c3);
    body.appendChild(g);
  };
  V.dayColor = function (list, s) {
    if (!list.length) return { fill: 'var(--track)' };
    if (s) {
      var mine = list.filter(function (u) { return u.sport === s; }), sec = U.sum(mine, function (u) { return u.sec; });
      if (!sec) return { fill: 'color-mix(in srgb, var(--c-other) 45%, var(--card))' };
      return { fill: sec < 1800 ? 'var(--r2)' : sec < 5400 ? 'var(--r4)' : 'var(--r5)' };
    }
    var by = {}, tot = 0; list.forEach(function (u) { var k = M.SPORTS.indexOf(u.sport) >= 0 ? u.sport : 'other'; by[k] = (by[k] || 0) + u.sec; tot += u.sec; });
    var k = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; })[0], op = tot < 1800 ? 0.4 : tot < 3600 ? 0.6 : tot < 5400 ? 0.8 : 1;
    return { fill: 'color-mix(in srgb, var(--c-' + k + ') ' + Math.round(op * 100) + '%, var(--card))' };
  };
  V.weekGoal = function (plan, s) { var v = 0; Object.keys(plan || {}).forEach(function (d) { (plan[d] || []).forEach(function (e) { if (e.sport === s && e.amount && (e.unit === (s === 'swim' ? 'm' : 'km'))) v += +e.amount; }); }); return v || null; };
  V.planHours = function (plan) { var h = 0; Object.keys(plan || {}).forEach(function (d) { (plan[d] || []).forEach(function (e) { if (M.SPORTS.indexOf(e.sport) < 0 || !e.amount) return; if (e.unit === 'min') h += e.amount / 60; else if (e.unit === 'km') h += e.amount / ({ bike: 27, run: 11 }[e.sport] || 10); else if (e.unit === 'm') h += e.amount / 2000; }); }); return h || null; };

  /* ---------- Intensität ---------- */
  V.zones = function (parent, R, st, s) {
    var c = card({ title: 'Zeit je Zone', sub: 'im gewählten Zeitraum · jede Einheit zählt in der Zone ihres Schnitts', info: 'zones' });
    var list = V.periodUnits(R, st, s).filter(function (u) { return u.zone; }), mins = [0, 0, 0, 0, 0];
    list.forEach(function (u) { mins[u.zone - 1] += u.sec / 60; });
    var ranges;
    if (s === 'run' && R.run.zones) { var z = R.run.zones; ranges = ['< ' + z[0], z[0] + '–' + (z[1] - 1), z[1] + '–' + (z[2] - 1), z[2] + '–' + (z[3] - 1), '≥ ' + z[3]]; }
    else if (s === 'bike' && R.bike.powerMode && R.bike.ftp) { var f = R.bike.ftp; ranges = ['< ' + Math.round(f * 0.56) + ' W', Math.round(f * 0.56) + '–' + Math.round(f * 0.75) + ' W', Math.round(f * 0.76) + '–' + Math.round(f * 0.9) + ' W', Math.round(f * 0.91) + '–' + Math.round(f * 1.05) + ' W', '≥ ' + Math.round(f * 1.06) + ' W']; }
    else if (s === 'bike' && R.bike.zonesHr) { var b = R.bike.zonesHr; ranges = ['< ' + b[0], b[0] + '–' + (b[1] - 1), b[1] + '–' + (b[2] - 1), b[2] + '–' + (b[3] - 1), '≥ ' + b[3]]; }
    else if (s === 'swim' && R.swim.zones) { var w = R.swim.zones; ranges = ['> ' + U.pace(w[0]), U.pace(w[1]) + '–' + U.pace(w[0]), U.pace(w[2]) + '–' + U.pace(w[1]), U.pace(w[3]) + '–' + U.pace(w[2]), '< ' + U.pace(w[3])]; }
    if (!ranges || !list.length) { c.appendChild(need(s === 'swim' ? 'Zonen brauchen eine CSS und Beckeneinheiten.' : 'Zonen brauchen eine Schwelle und Einheiten mit ' + (s === 'bike' ? 'Puls oder Watt.' : 'Puls.'))); parent.appendChild(c); return c; }
    var tot = mins.reduce(function (a, b) { return a + b; }, 0), easy = (mins[0] + mins[1]) / tot * 100;
    var t = el('div', { cls: 'htop' }); t.innerHTML = '<span class="big num">' + num(easy, 0) + ' %</span><span class="sub">locker (Z1 + Z2) · üblich sind rund 80 %</span>'; c.appendChild(t);
    C.zones(host(c), mins, ranges);
    c.appendChild(el('p', { cls: 'foot', text: s === 'bike' ? (R.bike.powerMode ? 'Wattzonen nach Coggan aus der FTP.' : 'Pulszonen aus der Radschwelle ' + R.bike.lthr + ' (' + R.bike.lthrSrc + ').') : s === 'swim' ? 'Tempozonen aus der CSS, je 100 m. Der Puls im Wasser ist am Handgelenk zu ungenau.' : 'Pulszonen aus der Laufschwelle ' + R.run.lthr + ' (' + R.run.lthrSrc + ').' }));
    parent.appendChild(c); return c;
  };

  /* ---------- Gewohnheit ---------- */
  V.habit = function (parent, R, st, s, verb) {
    var c = card({ title: 'Wann du ' + verb, sub: 'Startzeiten im gewählten Zeitraum' });
    var ht = el('div', { cls: 'htop' }); c.appendChild(ht); var ph = host(c);
    V.later(function () { var r = C.punch(ph, V.periodUnits(R, st).filter(function (u) { return s ? u.sport === s : M.SPORTS.indexOf(u.sport) >= 0; })); ht.innerHTML = '<span class="big num">' + num(r.pre9, 0) + ' %</span><span class="sub">vor 9 Uhr' + (r.top ? ' · am häufigsten ' + U.WDL[r.top[0]] + ', ' + r.top[1] + ' Uhr' : '') + '</span>'; });
    parent.appendChild(c); return c;
  };

  /* ---------- Ausrüstung ---------- */
  V.gear = function (parent, R, s) {
    var list = (R.gear || []).filter(function (x) { return !s || x.sport === s; });
    var c = card({ id: 'material', title: s === 'swim' ? 'Neoprenanzug' : s === 'bike' ? 'Rad und Verschleißteile' : s === 'run' ? 'Laufschuhe' : 'Deine Ausrüstung', sub: 'Kilometer nach Zeitraum zugeordnet · Richtwerte sind Faustregeln', right: btn('Verwalten', 'gear', function () { TL.app.openMore('ausruestung'); }, 'small') });
    if (!list.length) { c.appendChild(el('p', { cls: 'muted', text: 'Noch nichts angelegt. Unter „Mehr → Ausrüstung“ trägst du ' + (s === 'swim' ? 'deinen Neo' : s === 'bike' ? 'Rad, Kette und Reifen' : s === 'run' ? 'deine Laufschuhe' : 'Schuhe, Räder und Neo') + ' mit Startdatum ein. Garmin liefert die Ausrüstung nicht mit.' })); parent.appendChild(c); return c; }
    var TY = { shoe: 'Laufschuh', bike: 'Rad', chain: 'Kette', tire: 'Reifen', wetsuit: 'Neo' };
    list.sort(function (a, b) { return (a.end || a.retired ? 1 : 0) - (b.end || b.retired ? 1 : 0); }).forEach(function (x) {
      var r = el('div', { cls: 'gearrow' }), old = x.end || x.retired;
      var st = x.state === 'due' ? '<span class="chip warnc">' + (x.type === 'wetsuit' ? 'prüfen' : 'Austausch fällig') + '</span>' : x.state === 'warn' ? '<span class="chip" style="background:color-mix(in srgb,var(--amber) 22%,var(--card));color:var(--t-tri)">bald tauschen</span>' : old ? '<span class="chip">ausgemustert</span>' : '<span class="chip acc">in Ordnung</span>';
      var pct = x.max ? Math.min(100, x.km / x.max * 100) : null;
      r.innerHTML = '<div class="gh"><b>' + esc(x.name) + '</b><span>' + TY[x.type] + (x.def ? ' · Standard' : '') + '</span>' + st + '</div>' +
        (x.type === 'wetsuit' ? '<div class="gs"><span>seit ' + U.de(x.sd) + ' · ' + num(x.years, 1) + ' Jahre</span><span>' + x.n + ' Freiwassereinheiten</span></div>' :
        (pct != null ? '<div class="track"><i class="' + (x.state === 'due' ? 'due' : x.state === 'warn' ? 'warn' : '') + '" style="width:' + pct + '%"></i></div>' : '') +
        '<div class="gs"><span class="num">' + num(x.km, 0) + ' km' + (x.max ? ' von ' + num(x.max, 0) + ' km' : '') + '</span><span>' + (x.weeksLeft != null && x.state !== 'due' && x.weeksLeft <= 104 ? 'noch etwa ' + num(x.weeksLeft, 0) + ' Wochen' : '') + (x.first ? ' · seit ' + U.de(x.first) : '') + '</span></div>');
      c.appendChild(r);
    });
    parent.appendChild(c); return c;
  };

  /* ---------- Wochenplan mit Ist und Repair Guide ---------- */
  var KIND = { locker: 'locker', hart: 'hart', lang: 'lang', koppel: 'Koppel', technik: 'Technik', ruhe: 'Ruhetag' };
  V.plan = function (parent, R, st, sport) {
    var plan = st.plan || {}, wk0 = R.realToday - U.wday(R.realToday);
    var has = Object.keys(plan).some(function (k) { return (plan[k] || []).some(function (e) { return !sport || e.sport === sport; }); });
    var c = card({ id: 'plan', title: 'Diese Woche', sub: has ? 'dein Plan gegen dein Ist · Woche ab ' + U.de(wk0) : 'noch kein Wochenplan', right: btn('Plan bearbeiten', 'list', function () { TL.app.openMore('plan'); }, 'small') });
    if (!has) { c.appendChild(el('p', { cls: 'muted', text: 'Trag unter „Mehr → Wochenplan“ ein, was du an jedem Tag planst. TriLog vergleicht es mit deinen Einheiten und prüft, ob die Woche zusammenpasst.' })); parent.appendChild(c); return c; }
    var rep = I.repair(plan, R);
    for (var i = 0; i < 7; i++) {
      var d = wk0 + i, list = (plan[i] || []).filter(function (e) { return !sport || e.sport === sport; });
      if (sport && !list.length) continue;
      var ist = R.units.filter(function (u) { return u.d === d && (!sport || u.sport === sport); });
      var psp = list.map(function (e) { return e.sport; }), done = d <= R.today && (psp[0] === 'rest' ? !ist.some(function (u) { return M.SPORTS.indexOf(u.sport) >= 0; }) : ist.some(function (u) { return psp.indexOf(u.sport) >= 0; }));
      var row = el('div', { cls: 'prow' + (d === R.realToday ? ' today' : '') + (rep.day === i && !sport ? ' chg' : '') });
      var planTxt = list.length ? list.map(function (e) { return (e.sport === 'rest' ? 'Ruhetag' : NAME[e.sport] || 'Kraft') + (e.kind && e.sport !== 'rest' ? ' · ' + KIND[e.kind] : '') + (e.amount ? ' · ' + num(e.amount, e.amount % 1 ? 1 : 0) + ' ' + e.unit : ''); }).join(' + ') : 'nichts geplant';
      var istTxt = ist.map(function (u) { return M.SPORTNAME[u.sport] + ' ' + (u.km ? (u.sport === 'swim' ? V.swimM(u.km) : num(u.km, 1) + ' km') : U.hm(u.sec)); }).join(' · ');
      var newTxt = rep.day === i && !sport ? (NAME[rep.entry.sport] + ' · locker' + (rep.entry.amount ? ' · ' + num(rep.entry.amount * 0.8, 0) + ' ' + rep.entry.unit : '')) : null;
      row.innerHTML = '<div class="pday"><b>' + U.WD[i] + '</b><span>' + U.de(d, true) + '</span></div><div class="pmain">' + (newTxt ? '<span class="old">' + esc(planTxt) + '</span><b class="new">' + esc(newTxt) + '</b>' : '<span class="pl">' + esc(planTxt) + '</span>') + (istTxt ? '<span class="ist">Ist: ' + esc(istTxt) + '</span>' : (d > R.today && d <= R.realToday ? '<span class="ist">Ist: noch nicht importiert</span>' : (d <= R.today && list.length && list[0].sport !== 'rest' ? '<span class="ist">Ist: nichts eingetragen</span>' : ''))) + '</div><span class="circ' + (done ? ' done' : '') + '">' + (done ? U.ico('check', 14) : '') + '</span>';
      c.appendChild(row);
    }
    if (!sport) { var fx = el('div', { cls: 'fix' }); fx.innerHTML = '<h4>' + U.ico(rep.day != null ? 'swap' : 'check', 17) + esc(rep.title) + '</h4><p>' + esc(rep.reason) + '</p>' + (rep.keep ? '<p class="keep">' + esc(rep.keep) + '</p>' : ''); c.appendChild(fx); }
    parent.appendChild(c); return c;
  };

  /* ---------- Rekorde ---------- */
  V.records = function (parent, R, s) {
    var list = R.units.filter(function (u) { return u.sport === s; });
    var c = card({ id: 'rec', title: 'Bestwerte', sub: 'alle importierten Einheiten · „Neu“ heißt: in den letzten 21 Tagen' });
    var items = [];
    function newer(d) { return d && R.today - d <= 21; }
    if (s === 'run') [['5', '5 km'], ['10', '10 km'], ['HM', 'Halbmarathon'], ['M', 'Marathon']].forEach(function (x) { var p = R.run.pb[x[0]]; if (p) items.push([x[1], U.time(p.t), p.d]); });
    if (s === 'run' && R.run.cpw) items.push(['Laufwatt Schwelle', num(R.run.cpw, 0) + ' W', R.run.cpwRun.d]);
    if (s === 'bike') {
      var fast = list.filter(function (u) { return u.km >= 20 && u.speed && u.sub !== 'indoor' && (u.climb || 0) <= 10; }).sort(function (a, b) { return b.speed - a.speed; })[0]; if (fast) items.push(['Schnellste flache Fahrt ab 20 km', num(fast.speed, 1) + ' km/h', fast.d]);
      var pw = list.filter(function (u) { return u.np || u.pow; }).sort(function (a, b) { return (b.np || b.pow) - (a.np || a.pow); })[0]; if (pw) items.push(['Höchste NP', num(pw.np || pw.pow, 0) + ' W', pw.d]);
    }
    if (s === 'swim') {
      [[0.4, '400 m'], [1, '1 000 m']].forEach(function (x) { var b = list.filter(function (u) { return u.km >= x[0] && u.p100 && u.sub === 'pool'; }).sort(function (a, b) { return a.p100 - b.p100; })[0]; if (b) items.push(['Bestes Tempo ab ' + x[1], U.pace(b.p100) + ' /100 m', b.d]); });
      var sw = list.filter(function (u) { return u.swolf; }).sort(function (a, b) { return a.swolf - b.swolf; })[0]; if (sw) items.push(['Bester SWOLF', num(sw.swolf, 0), sw.d]);
      var dp = list.filter(function (u) { return u.dps && u.km >= 0.4; }).sort(function (a, b) { return b.dps - a.dps; })[0]; if (dp) items.push(['Längster Zug', num(dp.dps, 2) + ' m', dp.d]);
    }
    var lo = list.filter(function (u) { return u.km; }).sort(function (a, b) { return b.km - a.km; })[0]; if (lo) items.push(['Längste Einheit', s === 'swim' ? V.swimM(lo.km) : num(lo.km, 1) + ' km', lo.d]);
    var ld = list.slice().sort(function (a, b) { return b.sec - a.sec; })[0]; if (ld) items.push(['Längste Dauer', U.time(ld.sec), ld.d]);
    var he = list.filter(function (u) { return u.elev; }).sort(function (a, b) { return b.elev - a.elev; })[0]; if (he && s !== 'swim') items.push(['Meiste Höhenmeter', num(he.elev, 0) + ' m', he.d]);
    var ea = list.slice().sort(function (a, b) { return a.ts.slice(11) < b.ts.slice(11) ? -1 : 1; })[0]; if (ea) items.push(['Früheste Einheit', ea.ts.slice(11, 16) + ' Uhr', ea.d]);
    var g = el('div', { cls: 'recs' });
    items.forEach(function (x) { var t = el('div', { cls: 'tile' }); t.innerHTML = '<span class="l">' + esc(x[0]) + '</span><span class="v num">' + U.big(x[1]) + '</span><span class="n">' + U.de(x[2]) + '</span>' + (newer(x[2]) ? '<span class="chip acc new">Neu</span>' : ''); g.appendChild(t); });
    if (!items.length) c.appendChild(el('p', { cls: 'muted', text: 'Noch keine Einheiten.' })); else c.appendChild(g);
    parent.appendChild(c); return c;
  };

  /* ---------- Logbuch mit Ausrüstungswahl ---------- */
  var LOG = { k: 'ts', dir: -1, all: false };
  V.log = function (parent, R, st, s) {
    var list = R.units.filter(function (u) { return u.sport === s; });
    var c = card({ id: 'log', title: 'Logbuch', sub: list.length + ' Einheiten' });
    var wrap = el('div', { cls: 'lwrap' }); c.appendChild(wrap);
    var gearOpts = (TL.store.gear() || []).filter(function (x) { return (s === 'run' && x.type === 'shoe') || (s === 'bike' && x.type === 'bike'); });
    var cols = [['ts', 'Datum', 0], ['name', 'Einheit', 0], ['km', s === 'swim' ? 'Meter' : 'km', 1], ['sec', 'Zeit', 1]];
    if (s === 'run') cols.push(['pace', 'Tempo', 1], ['sap', 'SAP', 1], ['cad', 'Kadenz', 1]);
    if (s === 'bike') { cols.push(['speed', 'km/h', 1]); if (R.bike.hasPowerData) cols.push(['np', 'NP', 1], ['IF', 'IF', 1]); }
    if (s === 'swim') cols.push(['p100', '/100 m', 1], ['swolf', 'SWOLF', 1], ['dps', 'm/Zug', 1]);
    cols.push(['hr', 'Puls', 1], ['load', 'Last', 1], ['bb', 'Energie', 1]);
    if (gearOpts.length > 1) cols.push(['gear', s === 'run' ? 'Schuh' : 'Rad', 0]);
    function draw() {
      U.clear(wrap);
      var L = list.slice().sort(function (a, b) { var x = a[LOG.k], y = b[LOG.k]; if (x == null) return 1; if (y == null) return -1; return (x < y ? -1 : x > y ? 1 : 0) * LOG.dir; });
      var n = L.length; if (!LOG.all) L = L.slice(0, 10);
      var t = el('table', { cls: 'log' }), tr = el('tr');
      cols.forEach(function (cc) { var th = el('th', { cls: cc[2] ? 'num' : '', tabindex: '0', scope: 'col', 'aria-sort': LOG.k === cc[0] ? (LOG.dir > 0 ? 'ascending' : 'descending') : 'none', text: cc[1] + (LOG.k === cc[0] ? (LOG.dir > 0 ? ' ↑' : ' ↓') : '') }); th.onclick = th.onkeydown = function (e) { if (e.type === 'keydown' && e.key !== 'Enter') return; if (cc[0] === 'gear') return; if (LOG.k === cc[0]) LOG.dir *= -1; else { LOG.k = cc[0]; LOG.dir = cc[2] ? -1 : 1; } draw(); }; tr.appendChild(th); });
      var th0 = el('thead'); th0.appendChild(tr); t.appendChild(th0); var tb = el('tbody'), asg = TL.store.assign();
      L.forEach(function (u) {
        var r = el('tr');
        var v = { ts: U.de(u.d, true) + ' ' + u.ts.slice(11, 16), name: u.name, km: u.km ? (s === 'swim' ? num(u.km * 1000, 0) : num(u.km, 2)) : '–', sec: U.time(u.sec), pace: u.pace ? U.pace(u.pace) : '–', sap: u.sap ? U.pace(u.sap) : '–', cad: u.cad ? num(u.cad, 0) : '–', speed: u.speed ? num(u.speed, 1) : '–', np: u.np || u.pow ? num(u.np || u.pow, 0) : '–', IF: u.IF ? num(u.IF, 2) : '–', p100: u.p100 ? U.pace(u.p100) : '–', swolf: u.swolf ? num(u.swolf, 0) : '–', dps: u.dps ? num(u.dps, 2) : '–', hr: u.hr ? String(u.hr) : '–', load: num(u.load, 0), bb: u.bb != null ? '−' + num(u.bb, 0) : '–' };
        cols.forEach(function (cc) {
          var td = el('td', { cls: (cc[2] ? 'num' : '') + (cc[0] === 'name' ? ' nm' : ''), title: cc[0] === 'name' ? u.name : null });
          if (cc[0] === 'gear') { var sel = el('select', { 'aria-label': 'Ausrüstung für ' + u.name }); sel.appendChild(el('option', { value: '', text: 'automatisch' })); gearOpts.forEach(function (gx) { var op = el('option', { value: gx.id, text: gx.name }); if (asg[u.id] === gx.id) op.selected = true; sel.appendChild(op); }); sel.onchange = function () { var a = TL.store.assign(); if (sel.value) a[u.id] = sel.value; else delete a[u.id]; TL.store.setAssign(a); U.toast('Zuordnung gespeichert.'); TL.app.reload(null, true); }; td.appendChild(sel); }
          else td.textContent = v[cc[0]];
          r.appendChild(td);
        });
        tb.appendChild(r);
      });
      t.appendChild(tb); wrap.appendChild(t);
      if (n > 10) { var b = el('button', { cls: 'tbtn press more', type: 'button', text: LOG.all ? 'Weniger anzeigen' : 'Alle ' + n + ' anzeigen' }); b.onclick = function () { LOG.all = !LOG.all; draw(); }; wrap.appendChild(b); }
    }
    draw();
    parent.appendChild(c); return c;
  };

  /* ---------- Prognosetabelle ---------- */
  V.predRow = function (a, b, t, p, me) { var r = el('div', { cls: 'pred' + (me ? ' me' : '') }); r.innerHTML = '<div><b>' + esc(a) + '</b><span>' + esc(b) + '</span></div><div class="pv"><span class="num big">' + esc(t) + '</span><span>' + esc(p) + '</span></div>'; return r; };
})(window.TL = window.TL || {});
