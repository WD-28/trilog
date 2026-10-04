/* TriLog · Ansichten: Triathlon, Schwimmen, Rad, Laufen */
(function (TL) {
  'use strict';
  var U = TL.u, M = TL.model, C = TL.chart, I = TL.insights, V = TL.views = {};
  var el = U.el, esc = U.esc, num = U.num;
  var NAME = { swim: 'Schwimmen', bike: 'Rad', run: 'Laufen', tri: 'Triathlon' };

  /* ---------- Bausteine ---------- */
  function info(key) {
    var b = el('button', { cls: 'ibtn press', type: 'button', 'aria-label': 'Erklärung: ' + (TL.GLOSSAR[key] ? TL.GLOSSAR[key][0] : key) }, U.ico('info', 16));
    b.onclick = function (e) { e.stopPropagation(); TL.app.explain(key); };
    return b;
  }
  V.info = info;
  function card(o) {
    var c = el('section', { cls: 'card ' + (o.cls || ''), id: o.id || null });
    if (o.title) {
      var h = el('header', { cls: 'ch' });
      var t = el('div', { cls: 'cht' }); t.appendChild(el('h3', { text: o.title }));
      if (o.info) t.appendChild(info(o.info));
      var w = el('div', { cls: 'chw' }); w.appendChild(t); if (o.sub) w.appendChild(el('p', { cls: 'sub', text: o.sub }));
      h.appendChild(w);
      if (o.right) { var r = el('div', { cls: 'chr' }); if (typeof o.right === 'string') r.innerHTML = o.right; else r.appendChild(o.right); h.appendChild(r); }
      c.appendChild(h);
    }
    return c;
  }
  function tiles(list, cls) {
    var g = el('div', { cls: 'tiles ' + (cls || '') });
    list.forEach(function (x) { var t = el('div', { cls: 'tile' + (x[3] ? ' warn' : '') }); t.innerHTML = '<span class="l">' + esc(x[1]) + '</span><span class="v num">' + U.big(x[0]) + '</span>' + (x[2] ? '<span class="n">' + esc(x[2]) + '</span>' : ''); if (x[4]) t.querySelector('.l').appendChild(info(x[4])); g.appendChild(t); });
    return g;
  }
  function need(text, have, want) {
    var d = el('div', { cls: 'need' });
    d.innerHTML = '<div class="needh">' + U.ico('info', 18) + '<b>Noch nicht genug Daten</b></div><p>' + esc(text) + '</p>' + (want ? '<div class="prog"><i style="width:' + Math.min(100, have / want * 100) + '%"></i></div><span class="n">' + have + ' von ' + want + '</span>' : '');
    return d;
  }
  function chips(opts, val, onPick, cls) {
    var g = el('div', { cls: 'seg ' + (cls || ''), role: 'tablist' });
    opts.forEach(function (o) { var b = el('button', { cls: 'press' + (o[0] === val ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': o[0] === val ? 'true' : 'false', text: o[1] }); b.onclick = function () { onPick(o[0]); }; g.appendChild(b); });
    return g;
  }
  V.chips = chips;
  function host(parent, cls) { var h = el('div', { cls: 'chost ' + (cls || '') }); parent.appendChild(h); return h; }
  var REDRAW = [];
  V.redraw = function () { REDRAW.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); };
  function later(f) { REDRAW.push(f); requestAnimationFrame(f); }
  function periodUnits(R, st, sport) { return R.units.filter(function (u) { return u.d > R.today - st.period && (!sport || u.sport === sport); }); }
  function swimM(km) { return num(km * 1000, 0) + ' m'; }

  /* ---------- Kopf jeder Ansicht ---------- */
  function hello(R, st) {
    var p = R.profile || {}, hr = new Date().getHours(), g = hr < 11 ? 'Guten Morgen' : hr < 18 ? 'Hallo' : 'Guten Abend';
    var d = el('div', { cls: 'hello' });
    d.innerHTML = '<p class="kick">' + esc(U.WDL[U.wday(R.realToday)]) + ', ' + U.de(R.realToday) + ' · Daten bis ' + U.de(R.today) + '</p><h1>' + esc(g) + (p.name ? ', ' + esc(p.name) : '') + '<span class="dot">.</span></h1>';
    return d;
  }

  /* ======================================================================
     TRIATHLON
     ====================================================================== */
  V.tri = function (root, R, st) {
    REDRAW = [];
    root.appendChild(hello(R, st));
    var race = R.nextTri || null;
    var key = st.triKey || (race ? race.dist : 'H');
    var tri = M.triRace(R, key, race && race.dist === key ? race : null, race && race.wx);
    var IN = I.tri(R, key, tri);

    /* --- Rennkarte --- */
    var rc = card({ cls: 'hero tri-hero', id: 'race' });
    var top = el('div', { cls: 'rh' });
    top.innerHTML = '<div><p class="kick">' + (race ? 'Nächster Triathlon' : 'Prognose, wenn du heute startest') + '</p><h2>' + esc(race ? race.name : M.TRI[key].name) + '</h2>' + (race ? '<p class="sub">' + U.de(race.date) + (race.ort ? ' · ' + esc(race.ort) : '') + ' · ' + esc(M.TRI[race.dist].name) + '</p>' : '<p class="sub">Lege dein Rennen unter „Mehr“ an, dann zählt TriLog die Tage.</p>') + '</div>' + (race ? '<div class="cd"><span class="num big">' + (U.dn(race.date) - R.realToday) + '</span><span>Tage</span></div>' : '');
    rc.appendChild(top);
    var ch = chips([['S', 'Sprint'], ['O', 'Olympisch'], ['H', '70.3'], ['F', '140.6']], key, function (k) { st.triKey = k; TL.app.render(); }, 'wide');
    rc.appendChild(ch);
    var T = M.TRI[key];
    rc.appendChild(el('p', { cls: 'dist', text: num(T.swim, 0) + ' m Schwimmen · ' + num(T.bike, 1) + ' km Rad · ' + num(T.run, T.run % 1 ? 1 : 0) + ' km Laufen' }));
    if (tri.total) {
      var tt = el('div', { cls: 'total' });
      tt.innerHTML = '<div><span class="l">Prognose' + '</span><span class="num big xl">' + U.time(tri.total) + '</span><span class="n">± ' + U.time(tri.sd) + ' Streuung</span></div>' + (tri.chance != null ? '<div class="ch-right"><span class="l">Chance auf ' + U.time(race.goal) + '</span><span class="num big">' + tri.chance + '<small>%</small></span></div>' : '');
      tt.querySelector('.l').appendChild(info('tri'));
      rc.appendChild(tt);
    }
    /* Split-Band */
    var parts = [['swim', 'Schwimmen'], ['t1', 'T1'], ['bike', 'Rad'], ['t2', 'T2'], ['run', 'Laufen']];
    var band = el('div', { cls: 'split' }), est = { swim: 1500 * T.swim / 1000 * 1.1, bike: T.bike / 28 * 3600, run: T.run * 330 };
    parts.forEach(function (p) { var v = tri.parts[p[0]] ? tri.parts[p[0]].t : est[p[0]]; var i = el('i', { cls: 's-' + p[0] + (tri.parts[p[0]] ? '' : ' miss') }); i.style.flexGrow = v; band.appendChild(i); });
    rc.appendChild(band);
    var rows = el('div', { cls: 'splitrows' });
    var srcTxt = {
      swim: R.swim.ready ? 'CSS ' + U.pace(R.swim.css) + ' /100 m · ' + (tri.neo ? 'mit Neo' : 'ohne Neo') + ' · Freiwasser' : null,
      bike: R.bike.ready ? (R.bike.powerMode ? num(Math.round(T.ifp * R.bike.ftp), 0) + ' W (' + num(T.ifp * 100, 0) + ' % FTP)' : num(R.bike.baseSpeed * T.spd, 1) + ' km/h aus deinen Ausfahrten') + (race && race.bikeHm ? ' · ' + race.bikeHm + ' Hm' : '') : null,
      run: R.run.vdot ? 'VDOT ' + num(R.run.vdot, 1) + ' · frisch ' + U.time(tri.parts.run ? tri.parts.run.flat : 0) + ' · +' + num((T.runf - 1) * 100, 0) + ' % nach dem Rad' + (tri.parts.run && tri.parts.run.wx ? ' · Wärme +' + U.time(tri.parts.run.wx) : '') : null,
      t1: 'Standard für ' + T.name, t2: 'Standard für ' + T.name
    };
    parts.forEach(function (p) {
      var P = tri.parts[p[0]], m = tri.missing.filter(function (x) { return x[0] === p[0]; })[0];
      var r = el('div', { cls: 'srow' });
      r.innerHTML = '<i class="s-' + p[0] + '"></i><div><b>' + p[1] + '</b><span>' + esc(P ? srcTxt[p[0]] : 'fehlt: ' + m[1]) + '</span></div><span class="num">' + (P ? U.time(P.t) : '–') + '</span>';
      rows.appendChild(r);
    });
    rc.appendChild(rows);
    if (tri.total && race && race.goal && race.dist === key) { var bh = host(rc, 'bellh'); later(function () { C.bell(bh, tri.total, tri.sd, race.goal); }); }
    root.appendChild(rc);

    /* --- Befund --- */
    var B = IN.befund, bc = card({ cls: 'befund', id: 'befund' });
    var sp = B.sport || 'tri';
    bc.innerHTML = '<div class="bmeta"><span class="spark">' + U.ico(B.icon || 'tri', 18) + '</span><span class="chip acc">Befund</span><span class="sub">aus ' + num(R.sum.units) + ' Einheiten in 12 Monaten</span></div><h2 class="bh">' + headHTML(B.title) + '</h2><p class="bs">' + esc(B.sentence) + '</p>';
    var bst = el('div', { cls: 'bst' }); B.stats.forEach(function (x) { bst.appendChild(el('div', null, '<span class="num big">' + U.big(x[0]) + '</span><span class="n">' + esc(x[1]) + '</span>')); }); bc.appendChild(bst);
    var dt = el('details', { cls: 'way' }); dt.innerHTML = '<summary>' + U.ico('sigma', 15) + 'Rechenweg</summary><ol>' + B.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>'; bc.appendChild(dt);
    root.appendChild(bc);

    /* --- Balance --- */
    var share = M.raceShare(key, tri), tot = R.h84tot || 1;
    var bl = card({ id: 'balance', title: 'Balance der Disziplinen', sub: 'Trainingszeit der letzten 12 Wochen gegen Anteil an der Rennzeit (' + share.src + ')', info: 'limiter' });
    var ratios = {}; M.SPORTS.forEach(function (s) { ratios[s] = (R.h84[s] / tot) / share[s]; });
    var limiter = M.SPORTS.slice().sort(function (a, b) { return ratios[a] - ratios[b]; })[0];
    M.SPORTS.forEach(function (s) {
      var tr = R.h84[s] / tot, r = el('div', { cls: 'bal' + (s === limiter && ratios[s] < 0.8 ? ' lim' : '') });
      r.innerHTML = '<div class="balh"><span class="sdot s-' + s + '"></span><b>' + NAME[s] + '</b><span class="n">' + num(R.h84[s], 1) + ' h</span>' + (s === limiter && ratios[s] < 0.8 ? '<span class="chip warnc">Limiter</span>' : '') + '</div>' +
        '<div class="balb"><span>Training</span><div class="track"><i class="f-' + s + '" style="width:' + (tr * 100) + '%"></i></div><b class="num">' + num(tr * 100, 0) + ' %</b></div>' +
        '<div class="balb"><span>Rennen</span><div class="track"><i class="ghost" style="width:' + (share[s] * 100) + '%"></i></div><b class="num">' + num(share[s] * 100, 0) + ' %</b></div>';
      bl.appendChild(r);
    });
    root.appendChild(bl);

    /* --- Form und Belastung --- */
    var fc = card({ id: 'formcard', title: 'Form und Belastung', sub: 'alle Sportarten · Säulen zeigen die Tageslast je Disziplin', info: 'form' });
    fc.appendChild(tiles([[num(R.form.form, 0, true), 'Form', formWord(R.form.form), false, 'form'], [num(R.form.fit, 0), 'Fitness', '42 Tage', false, 'fitness'], [num(R.form.fat, 0), 'Ermüdung', '7 Tage', false, 'fatigue']], 't3'));
    var fh = host(fc, 'fith'); later(function () { C.fitness(fh, R, 'all', st.period, { stack: ['swim', 'bike', 'run'], races: [] }); });
    fc.appendChild(legend([['swim', 'Schwimmen'], ['bike', 'Rad'], ['run', 'Laufen']]));
    var gg = el('div', { cls: 'gwrap' }), gh = el('div', { cls: 'gaugeh' }); gg.appendChild(gh); C.gauge(gh, R.form.acwr);
    var gw = el('div', { cls: 'gtext' }); gw.innerHTML = '<span class="l">Akut zu chronisch</span><span class="num big">' + (R.form.acwr ? num(R.form.acwr, 2) : '–') + '</span><span class="w">' + acwrWord(R.form.acwr) + '</span>'; gw.querySelector('.l').appendChild(info('acwr')); gg.appendChild(gw);
    fc.appendChild(gg);
    fc.appendChild(tiles([[num(R.form.ramp, 1, true), 'Rampe', 'Fitness in 7 Tagen', R.form.ramp > 6, 'ramp'], [R.form.mono ? num(R.form.mono, 2) : '–', 'Monotonie', 'letzte 7 Tage', R.form.mono > 2, 'mono'], [num(R.form.load7, 0), 'Punkte', 'letzte 7 Tage', false, 'load']], 't3'));
    root.appendChild(fc);

    /* --- Wochen --- */
    var nW = st.period === 91 ? 13 : st.period === 182 ? 26 : 52;
    var wc = card({ id: 'weeks', title: 'Ausdauerstunden pro Woche', sub: 'gestapelt nach Disziplin · Linie: Schnitt der 4 Wochen davor', info: 'load' });
    var wh = host(wc); later(function () { C.weeks(wh, R.weeks.slice(-(nW + 1)), { key: 'tri', stack: ['swim', 'bike', 'run'], val: function (W, k) { return W.h[k]; }, color: function (k) { return 'var(--c-' + k + ')'; }, unit: 'h', dec: 1, names: NAME, label: 'Ausdauerstunden je Woche', goal: planHours(st.plan) }); });
    wc.appendChild(legend([['swim', 'Schwimmen'], ['bike', 'Rad'], ['run', 'Laufen']]));
    root.appendChild(wc);

    /* --- Insights --- */
    var ig = el('section', { cls: 'insights', id: 'insights' });
    ig.appendChild(el('h2', { cls: 'sech', text: 'Sechs Beobachtungen' }));
    var grid = el('div', { cls: 'igrid' });
    IN.items.forEach(function (it) {
      var c = el('button', { cls: 'card ins press', type: 'button' });
      c.innerHTML = '<div class="it"><span class="isq' + (it.risk ? ' risk' : '') + '">' + U.ico(it.icon, 18) + '</span><span class="cat">' + esc(it.cat) + '</span><span class="chip' + (it.grade === 'belegt' ? ' acc' : '') + '">' + esc(it.grade) + '</span></div><span class="num big iv">' + U.big(it.value) + '</span><h4>' + esc(it.title) + '</h4><p>' + esc(it.sentence) + '</p><span class="bl">' + esc(it.beleg) + U.ico('chev', 14) + '</span>';
      c.onclick = function () { TL.app.go(it.target); };
      grid.appendChild(c);
    });
    ig.appendChild(grid); root.appendChild(ig);

    /* --- Plan --- */
    root.appendChild(planCard(R, st));

    /* --- Kalender --- */
    var cc = card({ id: 'cal', title: 'Dein Jahr, Tag für Tag', sub: 'Farbe: Disziplin mit der meisten Zeit am Tag · Helligkeit: Dauer' });
    var calh = host(cc, 'calh'); later(function () { C.calendar(calh, R, dayColor); });
    cc.appendChild(legend([['swim', 'Schwimmen'], ['bike', 'Rad'], ['run', 'Laufen'], ['other', 'Kraft und Sonstiges']]));
    cc.appendChild(tiles([[num(R.active.days, 0), 'aktive Tage', 'in 12 Monaten'], [num(R.active.streak, 0) + ' Tage', 'längste Serie', R.active.streakEnd ? 'bis ' + U.de(R.active.streakEnd) : ''], [num(R.bricks.length, 0), 'Koppeleinheiten', 'Lauf nach Rad', false, 'brick']], 't3'));
    root.appendChild(cc);

    /* --- Gewohnheit --- */
    var hc = card({ id: 'habit', title: 'Wann du trainierst', sub: 'Schwimmen, Rad und Laufen im gewählten Zeitraum' });
    var hh = host(hc), ht = el('div', { cls: 'htop' }); hc.insertBefore(ht, hh);
    later(function () { var r = C.punch(hh, periodUnits(R, st).filter(function (u) { return M.SPORTS.indexOf(u.sport) >= 0; })); ht.innerHTML = '<span class="num big">' + num(r.pre9, 0) + ' %</span><span class="sub">vor 9 Uhr' + (r.top ? ' · am häufigsten ' + U.WDL[r.top[0]] + ', ' + r.top[1] + ' Uhr' : '') + '</span>'; });
    root.appendChild(hc);

    /* --- Summen --- */
    var sc = card({ id: 'sums', title: 'Zwölf Monate in Zahlen', sub: 'alle Einheiten' });
    sc.appendChild(tiles([[num(R.sum.swim.km * 1000, 0) + ' m', 'Schwimmen', R.sum.swim.n + ' Einheiten · ' + num(R.sum.swim.h, 1) + ' h'], [num(R.sum.bike.km, 0) + ' km', 'Rad', R.sum.bike.n + ' Einheiten · ' + num(R.sum.bike.h, 1) + ' h'], [num(R.sum.run.km, 0) + ' km', 'Laufen', R.sum.run.n + ' Einheiten · ' + num(R.sum.run.h, 1) + ' h'], [num(R.sum.h, 0) + ' h', 'Gesamt', R.sum.units + ' Einheiten'], [num(R.sum.elev, 0) + ' m', 'Höhenmeter', 'alle Sportarten'], [num(R.sum.kcal, 0), 'Kilokalorien', 'laut Uhr']], 't3'));
    root.appendChild(sc);
  };

  function headHTML(t) { var w = t.split(' '); var last = w.splice(-2).join(' '); return esc(w.join(' ')) + ' <span class="pt">' + esc(last) + '</span>'; }
  function formWord(f) { return f < -25 ? 'sehr belastet' : f <= -10 ? 'im Aufbau' : f <= 5 ? 'ausgeglichen' : f <= 15 ? 'frisch' : 'sehr frisch'; }
  function acwrWord(a) { return a == null ? 'zu wenig Daten' : a < 0.8 ? 'unter dem Gewohnten' : a <= 1.3 ? 'im Zielkorridor' : a <= 1.5 ? 'erhöht' : 'deutlich erhöht'; }
  function legend(list) { var d = el('div', { cls: 'legend' }); list.forEach(function (x) { d.appendChild(el('span', null, '<i class="s-' + x[0] + '"></i>' + esc(x[1]))); }); return d; }
  function dayColor(list) {
    if (!list.length) return { fill: 'var(--track)' };
    var by = {}, tot = 0; list.forEach(function (u) { var k = M.SPORTS.indexOf(u.sport) >= 0 ? u.sport : 'other'; by[k] = (by[k] || 0) + u.sec; tot += u.sec; });
    var k = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; })[0];
    var op = tot < 1800 ? 0.4 : tot < 3600 ? 0.6 : tot < 5400 ? 0.8 : 1;
    return { fill: 'color-mix(in srgb, var(--c-' + k + ') ' + Math.round(op * 100) + '%, var(--card))' };
  }
  function planHours(plan) {
    var h = 0; Object.keys(plan || {}).forEach(function (d) { (plan[d] || []).forEach(function (e) { if (M.SPORTS.indexOf(e.sport) < 0) return; if (e.unit === 'min') h += e.amount / 60; else if (e.unit === 'km') h += e.amount / ({ bike: 27, run: 11 }[e.sport] || 10); else if (e.unit === 'm') h += e.amount / 2000; }); });
    return h || null;
  }

  /* ---------- Wochenplan mit Ist und Repair Guide ---------- */
  var KIND = { locker: 'locker', hart: 'hart', lang: 'lang', koppel: 'Koppel', technik: 'Technik', ruhe: 'Ruhetag' };
  function planCard(R, st, sport) {
    var plan = st.plan || {}, wk0 = R.realToday - U.wday(R.realToday);
    var has = Object.keys(plan).some(function (k) { return (plan[k] || []).length; });
    var c = card({ id: 'plan', title: 'Diese Woche', sub: has ? 'dein Plan gegen dein Ist · Woche ab ' + U.de(wk0) : 'noch kein Wochenplan', right: btn('Plan bearbeiten', 'list', function () { TL.app.openMore('plan'); }) });
    if (!has) { c.appendChild(el('p', { cls: 'muted', text: 'Trag unter „Mehr → Wochenplan“ ein, was du für jeden Tag planst. TriLog vergleicht es mit deinen Einheiten und prüft, ob die Woche zusammenpasst.' })); return c; }
    var rep = I.repair(plan, R);
    for (var i = 0; i < 7; i++) {
      var d = wk0 + i, list = (plan[i] || []).filter(function (e) { return !sport || e.sport === sport; });
      if (sport && !list.length) continue;
      var ist = R.units.filter(function (u) { return u.d === d && (!sport || u.sport === sport); });
      var row = el('div', { cls: 'prow' + (d === R.realToday ? ' today' : '') + (rep.day === i && !sport ? ' chg' : '') });
      var planTxt = list.length ? list.map(function (e) { return (e.sport === 'rest' ? 'Ruhetag' : NAME[e.sport] || 'Kraft') + (e.kind && e.sport !== 'rest' ? ' · ' + KIND[e.kind] : '') + (e.amount ? ' · ' + num(e.amount, e.amount % 1 ? 1 : 0) + ' ' + e.unit : ''); }).join(' + ') : 'nichts geplant';
      var istTxt = ist.map(function (u) { return M.SPORTNAME[u.sport] + ' ' + (u.km ? (u.sport === 'swim' ? swimM(u.km) : num(u.km, 1) + ' km') : U.hm(u.sec)); }).join(' · ');
      var psp = list.map(function (e) { return e.sport; }), done = d <= R.today && (psp[0] === 'rest' ? !ist.some(function (u) { return M.SPORTS.indexOf(u.sport) >= 0; }) : ist.some(function (u) { return psp.indexOf(u.sport) >= 0; }));
      var newTxt = rep.day === i && !sport ? (NAME[rep.entry.sport] + ' · locker' + (rep.entry.amount ? ' · ' + num(rep.entry.amount * (rep.entry.unit === 'min' ? 0.8 : 0.8), 0) + ' ' + rep.entry.unit : '')) : null;
      row.innerHTML = '<div class="pday"><b>' + U.WD[i] + '</b><span>' + U.de(d, true) + '</span></div><div class="pmain">' + (newTxt ? '<span class="old">' + esc(planTxt) + '</span><b class="new">' + esc(newTxt) + '</b>' : '<span class="pl">' + esc(planTxt) + '</span>') + (istTxt ? '<span class="ist">Ist: ' + esc(istTxt) + '</span>' : (d > R.today && d <= R.realToday ? '<span class="ist">Ist: noch nicht importiert</span>' : (d <= R.today && list.length && list[0].sport !== 'rest' ? '<span class="ist">Ist: nichts eingetragen</span>' : ''))) + '</div><span class="circ' + (done ? ' done' : '') + '">' + (done ? U.ico('check', 14) : '') + '</span>';
      c.appendChild(row);
    }
    if (!sport) { var fx = el('div', { cls: 'fix' }); fx.innerHTML = '<h4>' + U.ico(rep.day != null ? 'swap' : 'check', 17) + esc(rep.title) + '</h4><p>' + esc(rep.reason) + '</p>' + (rep.keep ? '<p class="keep">' + esc(rep.keep) + '</p>' : ''); c.appendChild(fx); }
    return c;
  }
  function btn(label, icon, fn, cls) { var b = el('button', { cls: 'tbtn press ' + (cls || ''), type: 'button' }, U.ico(icon, 15) + '<span>' + esc(label) + '</span>'); b.onclick = fn; return b; }
  V.btn = btn;

  /* ======================================================================
     DISZIPLIN
     ====================================================================== */
  V.sport = function (root, R, st, s) {
    REDRAW = [];
    root.appendChild(hello(R, st));
    var list = R.units.filter(function (u) { return u.sport === s; });
    var sum = R.sum[s], ser = R.ser[s], L = ser.fit.length - 1, sform = ser.fit[L] - ser.fat[L];

    /* --- Kopf mit Leitkennzahl --- */
    var hc = card({ cls: 'hero', id: 'hero' });
    var kv = keyMetric(R, s);
    var h = el('div', { cls: 'kh' });
    h.innerHTML = '<div class="kicon">' + U.ico(s, 26) + '</div><div><p class="kick">' + esc(kv.label) + '</p><div class="kval"><span class="num big xl">' + U.big(kv.value) + '</span><span class="unit">' + esc(kv.unit) + '</span></div><p class="sub">' + esc(kv.src) + '</p></div>';
    h.querySelector('.kick').appendChild(info(kv.info));
    hc.appendChild(h);
    if (s === 'bike') {
      var pw = el('div', { cls: 'pwrow' });
      var pl = el('span', { cls: 'l', text: 'Wattmessung' }); pl.appendChild(info('power')); pw.appendChild(pl);
      pw.appendChild(chips([['auto', 'Automatisch'], ['on', 'Mit Powermeter'], ['off', 'Ohne']], R.bike.powerSetting, function (v) { var p = TL.store.profile(); p.power = v; TL.store.setProfile(p); TL.app.render(); }));
      hc.appendChild(pw);
      hc.appendChild(el('p', { cls: 'sub', text: R.bike.powerMode ? 'TriLog rechnet mit Watt' + (R.bike.hasPowerData ? '' : ', in deinen Daten stehen aber noch keine Wattwerte.') + '.' : 'TriLog rechnet mit Puls und Tempo' + (R.bike.hasPowerData ? ', obwohl Wattwerte vorhanden sind.' : '.') }));
    }
    hc.appendChild(tiles([[s === 'swim' ? num(sum.km * 1000, 0) + ' m' : num(sum.km, 0) + ' km', 'Distanz', '12 Monate'], [num(sum.h, 1) + ' h', 'Zeit', sum.n + ' Einheiten'], [num(sform, 0, true), 'Form', formWord(sform), false, 'form']], 't3'));
    var hints = I.sport(R, s);
    if (hints.length) { var hl = el('ul', { cls: 'hints' }); hints.forEach(function (x) { hl.appendChild(el('li', { cls: x[2] ? 'warn' : '' }, U.ico(x[0], 16) + '<span>' + esc(x[1]) + '</span>')); }); hc.appendChild(hl); }
    root.appendChild(hc);
    if (!list.length) { var e = card({ title: 'Noch keine Einheiten', sub: NAME[s] }); e.appendChild(el('p', { cls: 'muted', text: 'Sobald dein Garmin-Export ' + NAME[s] + '-Einheiten enthält, erscheinen hier Leistung, Form, Umfang und Zonen.' })); root.appendChild(e); return; }

    /* --- Laufen: Rennen mit Zielzeit --- */
    if (s === 'run' && R.nextRun && R.run.vdot) root.appendChild(runRaceCard(R, st, R.nextRun));

    /* --- Prognosen --- */
    root.appendChild(predCard(R, s));

    /* --- Form der Disziplin --- */
    var fc = card({ id: 'sform', title: 'Fitness, Ermüdung, Form', sub: 'nur ' + NAME[s], info: 'fitness' });
    var fh = host(fc); later(function () { C.fitness(fh, R, s, st.period, { races: s === 'run' ? R.run.races : [] }); });
    root.appendChild(fc);

    /* --- Umfang --- */
    var nW = st.period === 91 ? 13 : st.period === 182 ? 26 : 52;
    var unit = s === 'swim' ? 'm' : 'km';
    var wc = card({ id: 'weeks', title: 'Umfang pro Woche', sub: (s === 'swim' ? 'Meter' : 'Kilometer') + ' · Linie: Schnitt der 4 Wochen davor' });
    var goal = weekGoal(st.plan, s);
    var wh = host(wc); later(function () { C.weeks(wh, R.weeks.slice(-(nW + 1)), { key: s, stack: [s], val: function (W) { return s === 'swim' ? W.swim * 1000 : W[s]; }, color: function () { return 'var(--neutral)'; }, unit: unit, dec: s === 'swim' ? 0 : 1, names: NAME, label: 'Umfang je Woche', goal: goal }); });
    var longest = list.filter(function (u) { return u.km; }).sort(function (a, b) { return b.km - a.km; })[0];
    var bigW = R.weeks.slice(0, -1).map(function (W) { return { W: W, v: W[s] }; }).sort(function (a, b) { return b.v - a.v; })[0];
    wc.appendChild(tiles([[longest ? (s === 'swim' ? swimM(longest.km) : num(longest.km, 1) + ' km') : '–', 'Längste Einheit', longest ? U.de(longest.d) : ''], [bigW && bigW.v ? (s === 'swim' ? swimM(bigW.v) : num(bigW.v, 1) + ' km') : '–', 'Größte Woche', bigW ? 'ab ' + U.de(bigW.W.start) : ''], [goal ? num(goal, 0) + ' ' + unit : '–', 'Wochenziel', goal ? 'aus deinem Plan' : 'kein Plan']], 't3'));
    root.appendChild(wc);

    /* --- Intensität --- */
    root.appendChild(zoneCard(R, st, s));

    /* --- Laufen: lockere Läufe und harte Einheiten --- */
    if (s === 'run' && R.run.zones) {
      var ec = card({ id: 'easy', title: 'Lockere Läufe, letzte zwölf Wochen', sub: 'Durchschnittspuls je Lauf · Zone 3 ab ' + R.run.zones[1], info: 'easy' });
      if (R.run.easyRuns.length) { var eh = host(ec); later(function () { C.scatter(eh, R.run.easyRuns.map(function (u) { return { d: u.d, y: u.hr, rows: [[u.hr + ' Puls', 'Durchschnitt', 'var(--acc)'], [U.pace(u.pace) + ' /km', 'Tempo'], [num(u.km, 1) + ' km', 'Distanz']] }; }), { x0: R.today - 83, x1: R.today, line: R.run.zones[1], lineLabel: 'Zone 3 · ab ' + R.run.zones[1], label: 'Lockere Läufe' }); }); }
      else ec.appendChild(el('p', { cls: 'muted', text: 'In den letzten zwölf Wochen gab es keinen Lauf, der als locker zählt.' }));
      ec.appendChild(tiles([[R.run.easyHi.length + ' von ' + R.run.easyRuns.length, 'Locker in Zone 3+', 'Ziel: keiner', R.run.easyHi.length > R.run.easyRuns.length / 3], [R.run.hardOver.length + ' von ' + R.run.hard.length, 'Harte über Schwelle', 'Ø-Puls ≥ ' + R.run.lthr, R.run.hardOver.length > 0, 'hard'], [String(R.run.b2b), 'Zwei harte Tage', 'direkt hintereinander', R.run.b2b > 0]], 't3'));
      root.appendChild(ec);
    }

    /* --- Effizienz --- */
    root.appendChild(effCard(R, s));

    /* --- Plan der Disziplin --- */
    if (st.plan && Object.keys(st.plan).some(function (k) { return (st.plan[k] || []).some(function (e) { return e.sport === s; }); })) root.appendChild(planCard(R, st, s));

    /* --- Gewohnheit --- */
    var hb = card({ id: 'habit', title: 'Wann du ' + (s === 'swim' ? 'schwimmst' : s === 'bike' ? 'fährst' : 'läufst'), sub: 'im gewählten Zeitraum' });
    var ph = host(hb), pt = el('div', { cls: 'htop' }); hb.insertBefore(pt, ph);
    later(function () { var r = C.punch(ph, periodUnits(R, st, s)); pt.innerHTML = '<span class="num big">' + num(r.pre9, 0) + ' %</span><span class="sub">vor 9 Uhr' + (r.top ? ' · am häufigsten ' + U.WDL[r.top[0]] + ', ' + r.top[1] + ' Uhr' : '') + '</span>'; });
    root.appendChild(hb);

    /* --- Rekorde --- */
    root.appendChild(recCard(R, s, list));

    /* --- Logbuch --- */
    root.appendChild(logCard(R, st, s, list));
  };

  function keyMetric(R, s) {
    if (s === 'run') return R.run.vdot ? { label: 'VDOT', value: num(R.run.vdot, 1), unit: '', src: 'aus ' + num(R.run.vdotRun.km, 1) + ' km in ' + U.time(R.run.vdotRun.sec) + ' am ' + U.de(R.run.vdotRun.d), info: 'vdot' } : { label: 'VDOT', value: '–', unit: '', src: 'braucht einen Lauf ab 3 km in den letzten 150 Tagen', info: 'vdot' };
    if (s === 'bike') {
      if (R.bike.powerMode) return R.bike.ftp ? { label: 'FTP', value: num(R.bike.ftp, 0), unit: 'W · ' + num(R.bike.wkg, 2) + ' W/kg', src: R.bike.ftpSrc + (R.assumed.weight ? ' · Gewicht angenommen' : ''), info: 'ftp' } : { label: 'FTP', value: '–', unit: 'W', src: 'Trag deine FTP unter „Mehr → Profil“ ein oder fahre 20 bis 90 Minuten mit Powermeter.', info: 'ftp' };
      return R.bike.baseSpeed ? { label: 'Dauertempo flach', value: num(R.bike.baseSpeed, 1), unit: 'km/h', src: 'aus ' + R.bike.flatRides + ' flachen Ausfahrten der letzten 90 Tage', info: 'effbike' } : { label: 'Dauertempo flach', value: '–', unit: 'km/h', src: 'braucht ' + R.bike.need, info: 'effbike' };
    }
    return R.swim.css ? { label: 'CSS', value: U.pace(R.swim.css), unit: '/100 m', src: R.swim.cssSrc, info: 'css' } : { label: 'CSS', value: '–', unit: '/100 m', src: 'Trag einen 400/200-m-Test unter „Mehr → Profil“ ein.', info: 'css' };
  }
  function weekGoal(plan, s) { var v = 0; Object.keys(plan || {}).forEach(function (d) { (plan[d] || []).forEach(function (e) { if (e.sport === s && e.amount && (e.unit === (s === 'swim' ? 'm' : 'km'))) v += +e.amount; }); }); return v || null; }

  /* ---------- Prognosen je Disziplin ---------- */
  function predCard(R, s) {
    var c = card({ id: 'pred', title: 'Prognosen', sub: s === 'run' ? 'Daniels-Gilbert, daneben Riegel' : s === 'bike' ? (R.bike.powerMode ? 'aus FTP, renntypischer Intensität und Luftwiderstand' : 'aus deinem Dauertempo, je Distanz angepasst') : 'aus der CSS, ohne Freiwasser- und Neo-Effekt', info: s === 'run' ? 'riegel' : s === 'bike' ? 'ftp' : 'css' });
    if (s === 'run') {
      if (!R.run.vdot) { c.appendChild(need('Für Laufprognosen braucht TriLog einen Lauf ab 3 km in den letzten 150 Tagen.')); return c; }
      ['5', '10', 'HM', 'M'].forEach(function (k) {
        var D = M.RUNDIST[k], pb = R.run.pb[k], t = R.run.pred[k], me = R.nextRun && R.nextRun.dist === k;
        c.appendChild(predRow(D.name, (me && R.nextRun.goal ? 'Ziel ' + U.time(R.nextRun.goal) + ' · ' : '') + (pb ? 'Bestzeit ' + U.time(pb.t) : 'noch keine Bestzeit'), U.time(t), U.pace(t / D.km) + ' /km' + (R.run.riegel[k] ? ' · Riegel ' + U.time(R.run.riegel[k]) : ''), me));
      });
      c.appendChild(el('p', { cls: 'foot', text: 'Lockeres Tempo: ' + U.pace(R.run.easy[0]) + ' bis ' + U.pace(R.run.easy[1]) + ' /km.' + (R.run.riegelSrc ? ' Riegel aus ' + R.run.riegelSrc.name + ' am ' + U.de(R.run.riegelSrc.d) + '.' : '') }));
    } else if (s === 'bike') {
      if (!R.bike.ready) { c.appendChild(need('Es fehlt noch ' + R.bike.need + '.', R.bike.powerMode ? 0 : R.bike.flatRides, R.bike.powerMode ? null : 2)); return c; }
      ['S', 'O', 'H', 'F'].forEach(function (k) { var T = M.TRI[k], t = R.bike.predFor(T.bike, T.ifp, T.spd, 0); c.appendChild(predRow(num(T.bike, T.bike % 1 ? 1 : 0) + ' km', 'Radteil ' + T.name + (R.bike.powerMode ? ' · ' + num(T.ifp * 100, 0) + ' % FTP' : ''), U.time(t), num(T.bike / (t / 3600), 1) + ' km/h' + (R.bike.powerMode ? ' · ' + Math.round(T.ifp * R.bike.ftp) + ' W' : ''), R.nextTri && R.nextTri.dist === k)); });
      c.appendChild(el('p', { cls: 'foot', text: R.bike.powerMode ? 'Flach gerechnet mit Rennrad-Sitzposition (CdA 0,32), Rollwiderstand 0,005 und ' + num(R.weight + 9, 0) + ' kg Systemgewicht.' : 'Ohne Wattmessung ist die Streuung größer. Ein Powermeter oder ein FTP-Test macht die Prognose deutlich genauer.' }));
    } else {
      if (!R.swim.ready) { c.appendChild(need('Es fehlt noch ' + R.swim.need + '.')); return c; }
      [[400, 1.0], [750, 1.0], [1500, 1.03], [1900, 1.05], [3800, 1.09]].forEach(function (x) { var t = R.swim.predFor(x[0], x[1]); c.appendChild(predRow(num(x[0], 0) + ' m', x[0] === 400 ? 'Testdistanz' : 'Triathlondistanz', U.time(t), U.pace(t / x[0] * 100) + ' /100 m', false)); });
      c.appendChild(el('p', { cls: 'foot', text: 'Im Becken gerechnet. Im Rennen kommen etwa +5 % fürs Freiwasser dazu, ein Neo spart rund 5 %.' }));
    }
    return c;
  }
  function predRow(a, b, t, p, me) { var r = el('div', { cls: 'pred' + (me ? ' me' : '') }); r.innerHTML = '<div><b>' + esc(a) + '</b><span>' + esc(b) + '</span></div><div class="pv"><span class="num big">' + esc(t) + '</span><span>' + esc(p) + '</span></div>'; return r; }

  /* ---------- Laufrennen mit Zielzeit-Regler ---------- */
  function runRaceCard(R, st, race) {
    var c = card({ id: 'runrace', cls: 'raceday' });
    var days = U.dn(race.date) - R.realToday;
    var head = el('div', { cls: 'rh' }); head.innerHTML = '<div><p class="kick">Nächstes Laufrennen</p><h2>' + esc(race.name) + '</h2><p class="sub">' + U.de(race.date) + (race.ort ? ' · ' + esc(race.ort) : '') + ' · ' + M.RUNDIST[race.dist].name + '</p></div><div class="cd"><span class="num big">' + days + '</span><span>Tage</span></div>'; c.appendChild(head);
    var goal = race.goal || R.run.pred[race.dist];
    var box = el('div', { cls: 'rbox' }); c.appendChild(box);
    var sl = el('input', { type: 'range', id: 'goalrange', min: Math.round(R.run.pred[race.dist] * 0.9 / 5) * 5, max: Math.round(R.run.pred[race.dist] * 1.1 / 5) * 5, step: 5, value: goal, 'aria-label': 'Zielzeit' });
    var bh = el('div', { cls: 'chost' });
    function upd() {
      var g = +sl.value, rr = M.runRace(R, race.dist, g, race, race.wx), D = M.RUNDIST[race.dist];
      sl.style.setProperty('--p', ((g - sl.min) / (sl.max - sl.min) * 100) + '%');
      box.innerHTML = '<div class="chance"><span class="num big xl">' + rr.chance + '<small>%</small></span><span class="sub">Chance auf <b>' + U.time(g) + '</b></span></div>' +
        '<div class="rlist">' + row('Fitness', 'VDOT ' + num(R.run.vdot, 1), U.time(rr.fit)) + row('Wetter', race.wx ? num(race.wx.tmax, 0) + ' °C max · Taupunkt ' + num(race.wx.td, 0) + ' °C · ' + race.wx.src : 'noch keine Wetterdaten', rr.wx ? '+' + U.time(rr.wx) : 'nichts') + row('Strecke', race.runHm ? race.runHm + ' Hm' : 'flach gerechnet', rr.st ? '+' + U.time(rr.st) : 'nichts') + row('Unsicherheit', rr.age > 90 ? 'Beleg älter als 90 Tage' : 'Beleg frisch', '± ' + U.time(rr.sd)) + '</div>' +
        '<div class="rtotal"><span>Am Renntag</span><span class="num big">' + U.time(rr.rt) + '</span></div>' +
        '<div class="slider"><span class="l">Zielzeit durchspielen</span><span class="num">' + U.time(g) + ' · ' + U.pace(g / D.km) + ' /km · VDOT ' + num(M.vdot(D.km, g), 1) + ' nötig</span></div>';
      box.querySelector('.chance .sub').appendChild(info('chance'));
      box.appendChild(sl); box.appendChild(bh); C.bell(bh, rr.rt, rr.sd, g);
    }
    function row(a, b, v) { return '<div class="rrow"><div><b>' + esc(a) + '</b><span>' + esc(b) + '</span></div><span class="num">' + esc(v) + '</span></div>'; }
    sl.addEventListener('input', upd); later(upd);
    return c;
  }

  /* ---------- Zonen ---------- */
  function zoneCard(R, st, s) {
    var c = card({ id: 'zones', title: 'Intensität', sub: 'Zeit je Zone im gewählten Zeitraum · jede Einheit zählt in der Zone ihres Schnitts', info: 'zones' });
    var list = periodUnits(R, st, s).filter(function (u) { return u.zone; }), mins = [0, 0, 0, 0, 0];
    list.forEach(function (u) { mins[u.zone - 1] += u.sec / 60; });
    var ranges;
    if (s === 'run' && R.run.zones) { var z = R.run.zones; ranges = ['< ' + z[0], z[0] + '–' + (z[1] - 1), z[1] + '–' + (z[2] - 1), z[2] + '–' + (z[3] - 1), '≥ ' + z[3]]; }
    else if (s === 'bike' && R.bike.powerMode && R.bike.ftp) { var f = R.bike.ftp; ranges = ['< ' + Math.round(f * 0.56) + ' W', Math.round(f * 0.56) + '–' + Math.round(f * 0.75) + ' W', Math.round(f * 0.76) + '–' + Math.round(f * 0.9) + ' W', Math.round(f * 0.91) + '–' + Math.round(f * 1.05) + ' W', '≥ ' + Math.round(f * 1.06) + ' W']; }
    else if (s === 'bike' && R.bike.zonesHr) { var b = R.bike.zonesHr; ranges = ['< ' + b[0], b[0] + '–' + (b[1] - 1), b[1] + '–' + (b[2] - 1), b[2] + '–' + (b[3] - 1), '≥ ' + b[3]]; }
    else if (s === 'swim' && R.swim.zones) { var w = R.swim.zones; ranges = ['> ' + U.pace(w[0]), U.pace(w[1]) + '–' + U.pace(w[0]), U.pace(w[2]) + '–' + U.pace(w[1]), U.pace(w[3]) + '–' + U.pace(w[2]), '< ' + U.pace(w[3])]; }
    if (!ranges || !list.length) { c.appendChild(need(s === 'swim' ? 'Zonen brauchen eine CSS.' : 'Zonen brauchen eine Schwelle und Einheiten mit Puls' + (s === 'bike' ? ' oder Watt.' : '.'))); return c; }
    var tot = mins.reduce(function (a, b) { return a + b; }, 0), easy = (mins[0] + mins[1]) / tot * 100;
    var t = el('div', { cls: 'htop' }); t.innerHTML = '<span class="num big">' + num(easy, 0) + ' %</span><span class="sub">locker (Z1 + Z2) · üblich sind rund 80 %</span>'; c.appendChild(t);
    var zh = host(c); C.zones(zh, mins, ranges);
    c.appendChild(el('p', { cls: 'foot', text: s === 'bike' ? (R.bike.powerMode ? 'Watt-Zonen nach Coggan, aus der FTP.' : 'Pulszonen aus der Rad-Schwelle ' + R.bike.lthr + ' (' + R.bike.lthrSrc + ').') : s === 'swim' ? 'Tempozonen aus der CSS, je 100 m.' : 'Pulszonen aus der Laufschwelle ' + R.run.lthr + ' (' + R.run.lthrSrc + ').' }));
    return c;
  }

  /* ---------- Effizienz ---------- */
  function effCard(R, s) {
    if (s === 'swim') {
      var c = card({ id: 'eff', title: 'Technik und Tempo', sub: 'Monatsmediane aus Beckeneinheiten', info: 'swolf' });
      var P = R.swim.paceM, S = R.swim.swolf;
      if (P.length >= 2) { c.appendChild(el('p', { cls: 'subh', text: 'Tempo pro 100 m · schneller ist oben' })); var h1 = host(c); later(function () { C.months(h1, P, { invert: true, fmt: function (v) { return U.pace(v); }, name: 'Tempo /100 m', label: 'Schwimmtempo je Monat', minPad: 3 }); }); }
      if (S.length >= 2) { c.appendChild(el('p', { cls: 'subh', text: 'SWOLF · weniger ist besser' })); var h2 = host(c); later(function () { C.months(h2, S, { invert: true, fmt: function (v) { return num(v, 0); }, name: 'SWOLF', label: 'SWOLF je Monat', minPad: 2 }); }); }
      if (P.length < 2 && S.length < 2) c.appendChild(need('Für einen Verlauf braucht TriLog mindestens zwei Monate mit je zwei Beckeneinheiten.'));
      return c;
    }
    var E = s === 'run' ? R.run.eff : (R.bike.powerMode && R.bike.effW ? R.bike.effW : R.bike.eff);
    var title = s === 'run' ? 'Tempo bei gleichem Puls' : (E.kind === 'watt' ? 'Watt bei gleichem Puls' : 'Tempo bei gleichem Puls');
    var c2 = card({ id: 'eff', title: title, sub: E.n ? 'Band ' + E.lo + '–' + E.hi + ' · ' + E.n + ' Einheiten' : 'gleichmäßige Einheiten', info: s === 'run' ? 'effrun' : 'effbike' });
    if (!E.ready) { c2.appendChild(need('Dafür braucht TriLog mindestens zwei Monate mit je drei gleichmäßigen ' + (s === 'run' ? 'Läufen' : 'Ausfahrten') + ' im selben Pulsbereich' + (E.n ? '. Bisher ' + E.n + ' im dichtesten Band.' : '.'))); return c2; }
    var fmt = E.kind === 'pace' ? function (v) { return U.pace(v); } : E.kind === 'speed' ? function (v) { return num(v, 1); } : function (v) { return num(v, 0); };
    if (E.early != null && E.late != null) {
      var d = E.kind === 'pace' ? Math.round(E.early) - Math.round(E.late) : E.late - E.early, better = d > 0;
      var t = el('div', { cls: 'htop' }); t.innerHTML = '<span class="num big">' + num(d, E.kind === 'speed' ? 1 : 0, true) + (E.kind === 'pace' ? ' s/km' : E.kind === 'speed' ? ' km/h' : ' W') + '</span><span class="sub">' + (better ? 'besser' : 'schlechter') + ': früh ' + fmt(E.early) + ', zuletzt ' + fmt(E.late) + (E.kind === 'pace' ? ' /km' : E.kind === 'speed' ? ' km/h' : ' W') + '</span>'; c2.appendChild(t);
    }
    var h = host(c2); later(function () { C.months(h, E.months, { invert: E.kind === 'pace', fmt: fmt, name: title, label: title, axisNote: E.kind === 'pace' ? 'min/km · schneller ↑' : '', minPad: E.kind === 'pace' ? 5 : 1 }); });
    c2.appendChild(el('p', { cls: 'foot', text: 'Aussortiert: ' + E.out + ' Einheiten außerhalb des Bands oder mit untypischem Tempo.' }));
    return c2;
  }

  /* ---------- Rekorde ---------- */
  function recCard(R, s, list) {
    var c = card({ id: 'rec', title: 'Rekorde', sub: 'Neu heißt: in den letzten 21 Tagen' });
    var items = [];
    function newer(d) { return d && R.today - d <= 21; }
    if (s === 'run') {
      [['5', '5 km'], ['10', '10 km'], ['HM', 'Halbmarathon'], ['M', 'Marathon']].forEach(function (x) { var p = R.run.pb[x[0]]; if (p) items.push([x[1], U.time(p.t), p.d]); });
    }
    if (s === 'bike') {
      var fast = list.filter(function (u) { return u.km >= 20 && u.speed && u.sub !== 'indoor'; }).sort(function (a, b) { return b.speed - a.speed; })[0];
      if (fast) items.push(['Schnellste ab 20 km', num(fast.speed, 1) + ' km/h', fast.d]);
      var pw = list.filter(function (u) { return u.np || u.pow; }).sort(function (a, b) { return (b.np || b.pow) - (a.np || a.pow); })[0];
      if (pw) items.push(['Höchste NP', num(pw.np || pw.pow, 0) + ' W', pw.d]);
    }
    if (s === 'swim') {
      [[0.4, '400 m'], [1, '1 000 m']].forEach(function (x) { var b = list.filter(function (u) { return u.km >= x[0] && u.p100 && u.sub === 'pool'; }).sort(function (a, b) { return a.p100 - b.p100; })[0]; if (b) items.push(['Bestes Tempo ab ' + x[1], U.pace(b.p100) + ' /100 m', b.d]); });
      var sw = list.filter(function (u) { return u.swolf; }).sort(function (a, b) { return a.swolf - b.swolf; })[0]; if (sw) items.push(['Bester SWOLF', num(sw.swolf, 0), sw.d]);
    }
    var lo = list.filter(function (u) { return u.km; }).sort(function (a, b) { return b.km - a.km; })[0]; if (lo) items.push(['Längste Einheit', s === 'swim' ? swimM(lo.km) : num(lo.km, 1) + ' km', lo.d]);
    var ld = list.slice().sort(function (a, b) { return b.sec - a.sec; })[0]; if (ld) items.push(['Längste Dauer', U.time(ld.sec), ld.d]);
    var he = list.filter(function (u) { return u.elev; }).sort(function (a, b) { return b.elev - a.elev; })[0]; if (he && s !== 'swim') items.push(['Meiste Höhenmeter', num(he.elev, 0) + ' m', he.d]);
    var ea = list.slice().sort(function (a, b) { return a.ts.slice(11) < b.ts.slice(11) ? -1 : 1; })[0]; if (ea) items.push(['Früheste Einheit', ea.ts.slice(11, 16) + ' Uhr', ea.d]);
    var g = el('div', { cls: 'recs' });
    items.forEach(function (x) { var t = el('div', { cls: 'tile' }); t.innerHTML = '<span class="l">' + esc(x[0]) + '</span><span class="v num">' + U.big(x[1]) + '</span><span class="n">' + U.de(x[2]) + '</span>' + (newer(x[2]) ? '<span class="chip acc new">Neu</span>' : ''); g.appendChild(t); });
    c.appendChild(g);
    return c;
  }

  /* ---------- Logbuch ---------- */
  var LOG = { k: 'ts', dir: -1, all: false };
  function logCard(R, st, s, list) {
    var c = card({ id: 'log', title: 'Logbuch', sub: list.length + ' Einheiten' });
    var wrap = el('div', { cls: 'lwrap' }); c.appendChild(wrap);
    var cols = [['ts', 'Datum', 0], ['name', 'Einheit', 0], ['km', s === 'swim' ? 'Meter' : 'km', 1], ['sec', 'Zeit', 1]];
    if (s === 'run') cols.push(['pace', 'Tempo', 1]); if (s === 'bike') cols.push(['speed', 'km/h', 1]); if (s === 'bike' && R.bike.hasPowerData) cols.push(['np', 'NP', 1]); if (s === 'swim') cols.push(['p100', '/100 m', 1], ['swolf', 'SWOLF', 1]);
    cols.push(['hr', 'Puls', 1], ['load', 'Last', 1]);
    function draw() {
      U.clear(wrap);
      var L = list.slice().sort(function (a, b) { var x = a[LOG.k], y = b[LOG.k]; if (x == null) return 1; if (y == null) return -1; return (x < y ? -1 : x > y ? 1 : 0) * LOG.dir; });
      var n = L.length; if (!LOG.all) L = L.slice(0, 10);
      var t = el('table', { cls: 'log' }), tr = el('tr');
      cols.forEach(function (cc) { var th = el('th', { cls: cc[2] ? 'num' : '', tabindex: '0', scope: 'col', 'aria-sort': LOG.k === cc[0] ? (LOG.dir > 0 ? 'ascending' : 'descending') : 'none', text: cc[1] + (LOG.k === cc[0] ? (LOG.dir > 0 ? ' ↑' : ' ↓') : '') }); th.onclick = th.onkeydown = function (e) { if (e.type === 'keydown' && e.key !== 'Enter') return; if (LOG.k === cc[0]) LOG.dir *= -1; else { LOG.k = cc[0]; LOG.dir = cc[2] ? -1 : 1; } draw(); }; tr.appendChild(th); });
      var th0 = el('thead'); th0.appendChild(tr); t.appendChild(th0); var tb = el('tbody');
      L.forEach(function (u) {
        var r = el('tr');
        var v = { ts: U.de(u.d, true) + ' ' + u.ts.slice(11, 16), name: u.name, km: u.km ? (s === 'swim' ? num(u.km * 1000, 0) : num(u.km, 2)) : '–', sec: U.time(u.sec), pace: u.pace ? U.pace(u.pace) : '–', speed: u.speed ? num(u.speed, 1) : '–', np: u.np || u.pow ? num(u.np || u.pow, 0) : '–', p100: u.p100 ? U.pace(u.p100) : '–', swolf: u.swolf ? num(u.swolf, 0) : '–', hr: u.hr ? String(u.hr) : '–', load: num(u.load, 0) };
        cols.forEach(function (cc) { r.appendChild(el('td', { cls: (cc[2] ? 'num' : '') + (cc[0] === 'name' ? ' nm' : ''), text: v[cc[0]], title: cc[0] === 'name' ? u.name : null })); });
        tb.appendChild(r);
      });
      t.appendChild(tb); wrap.appendChild(t);
      if (n > 10) { var b = el('button', { cls: 'tbtn press more', type: 'button', text: LOG.all ? 'Weniger anzeigen' : 'Alle ' + n + ' anzeigen' }); b.onclick = function () { LOG.all = !LOG.all; draw(); }; wrap.appendChild(b); }
    }
    draw();
    return c;
  }
})(window.TL = window.TL || {});
