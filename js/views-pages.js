/* TriLog · Seiten: Triathlon, Gesamt, Laufen, Rad, Schwimmen */
(function (TL) {
  'use strict';
  var U = TL.u, M = TL.model, C = TL.chart, I = TL.insights, V = TL.views;
  var el = U.el, esc = U.esc, num = U.num, card = V.card, tiles = V.tiles, host = V.host, need = V.need, NAME = V.NAME;

  function heroChips(R, sport) {
    var out = [], race = sport === 'run' ? R.nextRun : sport === 'tri' || sport === 'multi' ? R.mainRace : R.nextTri;
    if (race) out.push(['flag', race.name + ' in ' + Math.max(0, U.dn(race.date) - R.realToday) + ' Tagen']);
    if (R.phase && (sport === 'tri' || sport === 'multi')) out.push(['calendar', 'Phase: ' + R.phase.name]);
    var due = (R.gearActive || []).filter(function (x) { return (sport === 'tri' || sport === 'multi' || x.sport === sport) && x.state !== 'ok'; })[0];
    if (due) out.push(['warn', due.name + (due.type === 'wetsuit' ? ': prüfen' : due.state === 'due' ? ': Austausch fällig' : ': bald tauschen'), true]);
    return out;
  }
  var SKYCOMMON = { volNote: 'Kilometer je Tag' };

  /* ============================ LAUFEN ============================ */
  V.run = function (root, R, st) {
    V.reset();
    var RU = R.run, IN = I.run(R), sum = R.sum.run;
    return V.page(root, [
      { id: 'top', title: 'Übersicht', hero: true, build: function (b) {
        V.hero(b, R, st, { sports: ['run'], icon: 'run', kicker: 'Laufen · Daten bis ' + U.de(R.today), lead: IN.befund.title + '.', main: RU.vdot ? [num(RU.vdot, 1), 'VDOT', 'aus ' + num(RU.vdotRun.km, 1) + ' km in ' + U.time(RU.vdotRun.sec) + ' am ' + U.de(RU.vdotRun.d, true)] : null,
          stats: [[num(sum.km, 0), 'km', 'in 12 Monaten'], [String(sum.n), '', 'Läufe'], [num(sum.h, 0), 'h', 'Laufzeit'], [num(sum.elev, 0), 'm', 'Höhenmeter']], chips: heroChips(R, 'run'),
          volNote: 'Kilometer je Tag', perfNote: 'Höhe: VDOT des Laufs', perfFmt: function (v) { return 'VDOT ' + num(v, 1); } });
      } },
      { id: 'insights', title: 'Insights', intro: 'Die wichtigste Erkenntnis aus deinen Läufen und weitere Beobachtungen. Tippe eine Kachel an, um zum passenden Kapitel zu springen.', build: function (b) { V.insights(b, R, st, IN, 'run'); } },
      { id: 'race', title: 'Race Day', intro: R.nextRun ? 'Wie wahrscheinlich deine Zielzeit ist, mit Wetter, Strecke und Unsicherheit. Zieh am Regler.' : 'Prognose für eine Wunschdistanz. Mit eingetragenem Rennen kommen Wetter und Strecke dazu.', build: function (b) { V.runRace(b, R, st); } },
      { id: 'perf', title: 'Leistung', intro: 'Prognosen für alle Distanzen und wie sich deine Ausdauer bei gleichem Puls entwickelt.', build: function (b) {
        var g = el('div', { cls: 'grid g2' }); b.appendChild(g);
        var c = card({ title: 'Rennprognosen', sub: RU.vdot ? 'nach Daniels-Gilbert · daneben Riegel' : '', info: 'riegel' }); g.appendChild(c);
        if (!RU.vdot) c.appendChild(need('Für Prognosen braucht TriLog einen Lauf ab 3 km in den letzten 150 Tagen.'));
        else {
          ['5', '10', 'HM', 'M'].forEach(function (k) { var D = M.RUNDIST[k], pb = RU.pb[k], t = RU.pred[k], me = R.nextRun && R.nextRun.dist === k; c.appendChild(V.predRow(D.name, (me && R.nextRun.goal ? 'Ziel ' + U.time(R.nextRun.goal) + ' · ' : '') + (pb ? 'Bestzeit ' + U.time(pb.t) : 'noch keine Bestzeit'), U.time(t), U.pace(t / D.km) + ' /km' + (RU.riegel[k] ? ' · Riegel ' + U.time(RU.riegel[k]) : ''), me)); });
          c.appendChild(tiles([[U.pace(RU.easy[0]) + '–' + U.pace(RU.easy[1]), 'Lockeres Tempo', '/km'], [String(RU.lthr), 'Schwellenpuls', RU.lthrSrc, false, 'lthr'], [RU.zones ? RU.zones[1] + '' : '–', 'Zone 3 ab', 'Puls']], 't3'));
        }
        var E = RU.effSap && RU.effSap.ready ? RU.effSap : RU.eff;
        var c2 = card({ title: 'Tempo bei gleichem Puls', sub: E.n ? 'steigungsbereinigtes Tempo (SAP) · Puls ' + E.lo + '–' + E.hi + ' · ' + E.n + ' Läufe' : '', info: 'effrun' }); g.appendChild(c2);
        if (!E.ready) c2.appendChild(need('Dafür braucht TriLog mindestens zwei Monate mit je zwei gleichmäßigen Läufen im selben Pulsbereich.'));
        else {
          var m0 = E.months[0], m1 = E.months[E.months.length - 1], d = Math.round(m0.v) - Math.round(m1.v), t = el('div', { cls: 'htop' }); t.innerHTML = '<span class="big num">' + num(d, 0, true) + ' s/km</span><span class="sub">' + (d > 0 ? 'schneller' : d < 0 ? 'langsamer' : 'unverändert') + ': ' + U.monthLabel(m0.m) + ' ' + U.pace(m0.v) + ', ' + U.monthLabel(m1.m) + ' ' + U.pace(m1.v) + ' /km' + (E.months.length < 3 ? ' · erst zwei Monate, noch kein Trend' : '') + '</span>'; c2.appendChild(t);
          var h2 = host(c2); V.later(function () { C.months(h2, E.months, V.effOpts(E)); });
          c2.appendChild(el('p', { cls: 'foot', text: 'SAP rechnet Steigungen heraus, deshalb zählen auch hügelige Läufe. Aussortiert: ' + E.out + ' Läufe außerhalb des Bands.' }));
        }
        if (RU.hasPow) {
          var c3 = card({ cls: 'full', title: 'Laufleistung in Watt', sub: 'von deiner Uhr gemessen · weniger vom Gelände abhängig als das Tempo', info: 'rpow' }); g.appendChild(c3);
          var PE = RU.powEff;
          c3.appendChild(tiles([[RU.cpw ? num(RU.cpw, 0) + ' W' : '–', 'Schwellenleistung', RU.cpwRun ? 'aus ' + U.hm(RU.cpwRun.sec) + ' am ' + U.de(RU.cpwRun.d, true) : ''], [RU.cpw ? num(RU.cpw / R.weight, 2) + ' W/kg' : '–', 'pro Kilo', R.assumed.weight ? 'Gewicht angenommen' : num(R.weight, 0) + ' kg'], [PE.months.length ? num(PE.months[PE.months.length - 1].v, 0) + ' W' : PE.n ? num(U.median(PE.pts.map(function (u) { return u.rpow; })), 0) + ' W' : '–', 'bei Puls ' + (PE.lo || '–') + '–' + (PE.hi || '–'), PE.months.length >= 2 ? num(PE.months[PE.months.length - 1].v - PE.months[0].v, 0, true) + ' W seit ' + U.monthLabel(PE.months[0].m) : '']], 't3'));
          if (PE.ready) { c3.appendChild(el('p', { cls: 'subh', text: 'Watt bei gleichem Puls, Monatsmedian' })); var h3 = host(c3); V.later(function () { C.months(h3, PE.months, { fmt: function (v) { return num(v, 0) + ' W'; }, name: 'Leistung', label: 'Laufwatt bei gleichem Puls', minPad: 5 }); }); }
        }
      } },
      { id: 'form', title: 'Form und Belastung', intro: 'Nur deine Läufe: wie fit, wie müde, wie frisch.', build: function (b) { V.form(b, R, st, 'run'); } },
      { id: 'weeks', title: 'Umfang und Konstanz', intro: 'Kilometer pro Woche, deine Serien und jeder Tag des Jahres.', build: function (b) { V.volume(b, R, st, 'run'); } },
      { id: 'easy', title: 'Intensität', intro: 'Wie viel deiner Laufzeit locker war und ob locker auch locker ist.', build: function (b) {
        var g = el('div', { cls: 'grid g2' }); b.appendChild(g);
        V.zones(g, R, st, 'run');
        var c = card({ title: 'Lockere Läufe, letzte zwölf Wochen', sub: RU.zones ? 'Puls je Lauf · Zone 3 ab ' + RU.zones[1] : '', info: 'easy' }); g.appendChild(c);
        if (RU.easyRuns.length && RU.zones) { var h = host(c); V.later(function () { C.scatter(h, RU.easyRuns.map(function (u) { return { d: u.d, y: u.hr, rows: [[u.hr + ' Puls', 'Durchschnitt', 'var(--acc)'], [U.pace(u.pace) + ' /km', 'Tempo'], [num(u.km, 1) + ' km', 'Distanz']] }; }), { x0: R.today - 83, x1: R.today, line: RU.zones[1], lineLabel: 'Zone 3 · ab ' + RU.zones[1], label: 'Lockere Läufe' }); }); }
        else c.appendChild(el('p', { cls: 'muted', text: 'In den letzten zwölf Wochen gab es keinen Lauf, der als locker zählt.' }));
        c.appendChild(tiles([[RU.easyHi.length + ' von ' + RU.easyRuns.length, 'Locker in Zone 3+', 'Ziel: keiner', RU.easyHi.length > RU.easyRuns.length / 3], [RU.hardOver.length + ' von ' + RU.hard.length, 'Harte über Schwelle', 'Ø-Puls ≥ ' + RU.lthr, RU.hardOver.length > 0, 'hard'], [String(RU.b2b), 'Zwei harte Tage', 'direkt hintereinander', RU.b2b > 0]], 't3'));
      } },
      { id: 'dyn', title: 'Laufstil', intro: 'Kadenz, Schrittlänge, Bodenkontakt und Auf und Ab aus der Laufdynamik deiner Uhr, dazu der Einfluss der Temperatur.', build: function (b) {
        if (!RU.hasDyn && !RU.dyn.cad.length) { b.appendChild(card({})).appendChild(need('Deine Uhr hat keine Laufdynamik geliefert.')); return; }
        var g = el('div', { cls: 'grid g2' }); b.appendChild(g);
        var dn = RU.dynNow;
        var c0 = card({ cls: 'full', title: 'Stand der letzten sechs Wochen', sub: 'Median aller Läufe ab 3 km', info: 'dyn' }); g.appendChild(c0);
        c0.appendChild(tiles([[dn.cad ? num(dn.cad, 0) : '–', 'Kadenz', 'Schritte/min'], [dn.stride ? num(dn.stride, 2) + ' m' : '–', 'Schrittlänge', ''], [dn.gct ? num(dn.gct, 0) + ' ms' : '–', 'Bodenkontakt', 'kürzer ist ökonomischer'], [dn.vr ? num(dn.vr, 1) + ' %' : '–', 'Vertikales Verhältnis', dn.vo ? num(dn.vo, 1) + ' cm Auf und Ab' : '']], 't4'));
        [['cad', 'Kadenz', function (v) { return num(v, 0); }, false, 2], ['stride', 'Schrittlänge', function (v) { return num(v, 2) + ' m'; }, false, 0.03], ['gct', 'Bodenkontaktzeit', function (v) { return num(v, 0) + ' ms'; }, true, 5], ['vr', 'Vertikales Verhältnis', function (v) { return num(v, 1) + ' %'; }, true, 0.3]].forEach(function (x) {
          var c = card({ title: x[1], sub: 'Monatsmedian' + (x[3] ? ' · weniger ist besser' : '') }); g.appendChild(c);
          if (RU.dyn[x[0]].length < 2) { c.appendChild(el('p', { cls: 'muted', text: 'Noch zu wenige Monate mit Daten.' })); return; }
          var h = host(c); V.later(function () { C.months(h, RU.dyn[x[0]], { fmt: x[2], name: x[1], label: x[1], invert: x[3], minPad: x[4] }); });
        });
        var ct = card({ cls: 'full', title: 'Temperatur und Puls', sub: 'lockere bis mittlere Läufe nach Temperatur der Uhr', info: 'temp' }); g.appendChild(ct);
        var th = host(ct); C.hbars(th, RU.temp.filter(function (t) { return t.n; }).map(function (t) { return { label: t.label, v: t.hr, txt: Math.round(t.hr) + ' Puls · ' + U.pace(t.pace) + ' /km · ' + t.n + ' Läufe' }; }), { label: 'Puls nach Temperatur', max: 0 });
        ct.appendChild(el('p', { cls: 'foot', text: 'Die Uhr misst am Handgelenk und zeigt meist mehr als die Luft. Der Vergleich zwischen den Gruppen bleibt trotzdem aussagekräftig.' }));
      } },
      { id: 'habit', title: 'Gewohnheit', intro: 'Wann du läufst, nach Wochentag und Uhrzeit.', build: function (b) { V.habit(b, R, st, 'run', 'läufst'); } },
      { id: 'rec', title: 'Rekorde', intro: 'Deine Bestwerte aus allen importierten Läufen.', build: function (b) { V.records(b, R, 'run'); } },
      { id: 'material', title: 'Material', intro: 'Laufschuhe mit Kilometern und Hinweis, wann ein Wechsel ansteht.', build: function (b) { V.gear(b, R, 'run'); } },
      { id: 'plan', title: 'Plan', intro: 'Deine geplanten Läufe dieser Woche gegen das, was du gemacht hast.', build: function (b) { V.plan(b, R, st, 'run'); } },
      { id: 'log', title: 'Logbuch', intro: 'Jeder Lauf, sortierbar.', build: function (b) { V.log(b, R, st, 'run'); } }
    ]);
  };

  /* ============================ RAD ============================ */
  V.bike = function (root, R, st) {
    V.reset();
    var BI = R.bike, IN = I.bike(R, st), sum = R.sum.bike;
    return V.page(root, [
      { id: 'top', title: 'Übersicht', hero: true, build: function (b) {
        var main = BI.powerMode ? (BI.ftp ? [num(BI.ftp, 0), 'W FTP', num(BI.wkg, 2) + ' W/kg · ' + BI.ftpSrc] : null) : (BI.baseSpeed ? [num(BI.baseSpeed, 1), 'km/h', 'Dauertempo auf flachen Fahrten'] : null);
        V.hero(b, R, st, { sports: ['bike'], icon: 'bike', kicker: 'Rad · ' + (BI.powerMode ? 'mit Wattmessung' : 'ohne Wattmessung'), lead: IN.befund.title + '.', main: main,
          stats: [[num(sum.km, 0), 'km', 'in 12 Monaten'], [String(sum.n), '', 'Fahrten'], [num(sum.h, 1), 'h', 'Radzeit'], [num(sum.elev, 0), 'm', 'Höhenmeter']], chips: heroChips(R, 'bike'),
          volNote: 'Kilometer je Tag', perfNote: BI.powerMode ? 'Höhe: Normalized Power der Fahrt' : 'Höhe: Tempo der Fahrt', perfFmt: function (v) { return BI.powerMode ? num(v, 0) + ' W' : num(v, 1) + ' km/h'; } });
        var pr = el('div', { cls: 'pwrow', style: 'margin:12px 4px 0' }); var pl = el('span', { cls: 'l', text: 'Wattmessung' }); pl.appendChild(V.info('power')); pr.appendChild(pl);
        var ch = V.chips([['auto', 'Automatisch'], ['on', 'Mit Powermeter'], ['off', 'Ohne']], BI.powerSetting, function (v) { var p = TL.store.profile(); p.power = v; TL.store.setProfile(p); TL.app.reload(null, true); }); pr.appendChild(ch);
        pr.appendChild(el('span', { cls: 'sub', text: BI.powerMode ? (BI.hasPowerData ? 'TriLog rechnet mit Watt.' : 'Watt gewählt, aber noch keine Wattwerte in deinen Daten.') : (BI.hasPowerData ? 'Wattwerte vorhanden, TriLog rechnet trotzdem mit Puls und Tempo.' : 'TriLog rechnet mit Puls und Tempo.') }));
        b.appendChild(pr);
      } },
      { id: 'insights', title: 'Insights', intro: 'Die wichtigste Erkenntnis aus deinen Fahrten und weitere Beobachtungen.', build: function (b) { V.insights(b, R, st, IN, 'bike'); } },
      { id: 'race', title: 'Race Day', intro: 'Dein Radteil im Triathlon: Zielzeit, Chance, Höhenmeter und Hitze.', build: function (b) { V.legRace(b, R, st, 'bike'); } },
      { id: 'perf', title: 'Leistung', intro: BI.powerMode ? 'Schwellenleistung, Watt pro Kilo und Prognosen für alle Radstrecken.' : 'Dein Dauertempo und Prognosen. Mit Powermeter wird beides deutlich genauer.', build: function (b) {
        var g = el('div', { cls: 'grid g2' }); b.appendChild(g);
        var c = card({ title: 'Prognosen Radteil', sub: BI.powerMode ? 'aus FTP, renntypischer Intensität und Luftwiderstand' : 'aus deinem Dauertempo, je Distanz angepasst', info: 'ftp' }); g.appendChild(c);
        if (!BI.ready) c.appendChild(need('Es fehlt noch ' + BI.need + '.', BI.powerMode ? 0 : BI.flatRides, BI.powerMode ? null : 2));
        else ['S', 'O', 'H', 'F'].forEach(function (k) { var T = M.TRI[k], t = BI.predFor(T.bike, T.ifp, T.spd, 0); c.appendChild(V.predRow(num(T.bike, T.bike % 1 ? 1 : 0) + ' km', 'Radteil ' + T.name + (BI.powerMode ? ' · ' + num(T.ifp * 100, 0) + ' % FTP' : ''), U.time(t), num(T.bike / (t / 3600), 1) + ' km/h' + (BI.powerMode ? ' · ' + Math.round(T.ifp * BI.ftp) + ' W' : ''), R.nextTri && R.nextTri.dist === k)); });
        c.appendChild(el('p', { cls: 'foot', text: BI.powerMode ? 'Flach gerechnet mit Rennrad-Sitzposition, ' + num(R.weight + 9, 0) + ' kg Systemgewicht' + (R.assumed.weight ? ' (Gewicht angenommen)' : '') + '.' : 'Ohne Wattmessung ist die Streuung etwa doppelt so groß.' }));
        var c2 = card({ title: BI.powerMode ? 'Schwellenleistung im Verlauf' : 'Tempo im Verlauf', sub: 'Monatswerte', info: BI.powerMode ? 'ftp' : 'effbike' }); g.appendChild(c2);
        var ser = BI.powerMode ? BI.ftpTrend : BI.speedM;
        if (BI.powerMode) c2.appendChild(tiles([[BI.ftp ? num(BI.ftp, 0) + ' W' : '–', 'FTP', BI.ftpSrc || ''], [BI.wkg ? num(BI.wkg, 2) : '–', 'W/kg', R.assumed.weight ? 'Gewicht angenommen' : num(R.weight, 0) + ' kg', false, 'wkg'], [String(BI.rides.filter(function (u) { return u.np || u.pow; }).length), 'Fahrten mit Watt', '12 Monate']], 't3'));
        if (ser.length >= 2) { var h = host(c2); V.later(function () { C.months(h, ser, { fmt: BI.powerMode ? function (v) { return num(v, 0) + ' W'; } : function (v) { return num(v, 1) + ' km/h'; }, name: BI.powerMode ? 'FTP-Schätzung' : 'Tempo', label: 'Radleistung je Monat', minPad: BI.powerMode ? 5 : 0.5 }); }); }
        else c2.appendChild(el('p', { cls: 'muted', text: 'Für einen Verlauf braucht TriLog Fahrten aus mindestens zwei Monaten.' }));
        var E = BI.powerMode && BI.effW && BI.effW.ready ? BI.effW : BI.eff;
        var c3 = card({ cls: 'full', title: E.kind === 'watt' ? 'Watt bei gleichem Puls' : 'Tempo bei gleichem Puls', sub: E.n ? 'Puls ' + E.lo + '–' + E.hi + ' · ' + E.n + ' Fahrten' : 'gleichmäßige Fahrten', info: 'effbike' }); g.appendChild(c3);
        if (!E.ready) c3.appendChild(need('Dafür braucht TriLog mindestens zwei Monate mit je zwei gleichmäßigen Ausfahrten im selben Pulsbereich' + (E.n ? '. Bisher ' + E.n + ' im dichtesten Band.' : '.')));
        else { var h3 = host(c3); V.later(function () { C.months(h3, E.months, V.effOpts(E)); }); }
      } },
      { id: 'long', title: 'Ausdauer', intro: 'Deine langen Fahrten im Vergleich zu dem, was das Rennen verlangt.', build: function (b) {
        var g = el('div', { cls: 'grid g2' }); b.appendChild(g);
        var need_ = R.nextTri ? (BI.ready ? M.bikeLeg(R, M.TRI[R.nextTri.dist].bike, M.TRI[R.nextTri.dist].ifp, M.TRI[R.nextTri.dist].spd, R.nextTri, R.nextTri.wx).t : M.TRI[R.nextTri.dist].bike / 27 * 3600) : null;
        var longest = BI.rides.slice().sort(function (a, b) { return b.sec - a.sec; }).slice(0, 6);
        var c = card({ title: 'Längste Fahrten', sub: '12 Monate' + (need_ ? ' · Linie: Radteil von ' + R.nextTri.name : '') }); g.appendChild(c);
        if (!longest.length) c.appendChild(el('p', { cls: 'muted', text: 'Noch keine Fahrten.' }));
        else { var h = host(c); C.hbars(h, longest.map(function (u) { return { label: U.de(u.d, true), v: u.sec, txt: U.hm(u.sec) + (u.km ? ' · ' + num(u.km, 0) + ' km' : '') }; }), { max: need_ || 0, label: 'Längste Fahrten' }); if (need_) c.appendChild(el('p', { cls: 'foot', text: 'Der Radteil dauert voraussichtlich ' + U.hm(need_) + '. Als Richtwert sollte die längste Ausfahrt vor dem Rennen rund 80 % davon erreichen: ' + U.hm(need_ * 0.8) + '.' })); }
        var c2 = card({ title: 'Intensität langer Fahrten', sub: 'Fahrten ab 2 Stunden', info: 'np' }); g.appendChild(c2);
        if (BI.powerMode && BI.longRides.some(function (u) { return u.IF; })) c2.appendChild(tiles([[BI.longHot.length + ' von ' + BI.longRides.length, 'über 0,80 IF', 'üblich: 0,65–0,75', BI.longHot.length > BI.longRides.length / 2], [num(U.median(BI.longRides.filter(function (u) { return u.IF; }).map(function (u) { return u.IF; })), 2), 'Median IF', ''], [String(BI.indoor), 'Rolle', 'Einheiten']], 't3'));
        else c2.appendChild(tiles([[String(BI.longRides.length), 'Fahrten ab 2 h', '12 Monate'], [BI.longRides.length ? num(U.median(BI.longRides.filter(function (u) { return u.hr; }).map(function (u) { return u.hr; })) || 0, 0) : '–', 'Median-Puls', BI.lthr ? 'Schwelle ' + BI.lthr : ''], [String(BI.indoor), 'Rolle', 'Einheiten']], 't3'));
        c2.appendChild(el('p', { cls: 'foot', text: 'Lange Grundlagenfahrten bringen am meisten, wenn sie locker bleiben. Mit Powermeter misst TriLog das über den Intensitätsfaktor.' }));
      } },
      { id: 'form', title: 'Form und Belastung', intro: 'Nur deine Radeinheiten.', build: function (b) { V.form(b, R, st, 'bike'); } },
      { id: 'weeks', title: 'Umfang und Konstanz', intro: 'Kilometer pro Woche und jeder Tag des Jahres.', build: function (b) { V.volume(b, R, st, 'bike'); } },
      { id: 'zones', title: 'Intensität', intro: BI.powerMode ? 'Zeit je Wattzone.' : 'Zeit je Pulszone.', build: function (b) { var g = el('div', { cls: 'grid' }); b.appendChild(g); V.zones(g, R, st, 'bike'); } },
      { id: 'brick', title: 'Koppeln', intro: 'Läufe direkt nach dem Rad, die wichtigste Triathlon-Gewöhnung.', build: function (b) {
        var c = card({ title: 'Koppeleinheiten', sub: 'Lauf beginnt höchstens 20 Minuten nach Radende', info: 'brick' }); b.appendChild(c);
        var br = R.bricks.slice().sort(function (a, b) { return b.run.d - a.run.d; });
        c.appendChild(tiles([[String(br.filter(function (x) { return x.run.d > R.today - 84; }).length), '12 Wochen', ''], [String(br.length), 'insgesamt', ''], [br.length ? U.pace(U.median(br.map(function (x) { return x.run.pace; }))) + ' /km' : '–', 'Median-Tempo', 'Lauf nach Rad']], 't3'));
        if (!br.length) c.appendChild(el('p', { cls: 'muted', text: 'Noch keine Koppeleinheit. Schon 10 bis 15 Minuten lockeres Laufen direkt nach dem Rad gewöhnen die Beine an den Wechsel.' }));
        br.slice(0, 6).forEach(function (x) { c.appendChild(el('div', { cls: 'gearrow' }, '<div class="gh"><b>' + U.de(x.run.d) + '</b><span>' + num(x.bike.km || 0, 0) + ' km Rad → ' + num(x.run.km || 0, 1) + ' km Laufen</span></div>')); });
      } },
      { id: 'habit', title: 'Gewohnheit', intro: 'Wann du fährst.', build: function (b) { V.habit(b, R, st, 'bike', 'fährst'); } },
      { id: 'rec', title: 'Rekorde', intro: 'Bestwerte nach Leistung, Tempo und Dauer.', build: function (b) { V.records(b, R, 'bike'); } },
      { id: 'material', title: 'Material', intro: 'Rad, Kette und Reifen mit Kilometern.', build: function (b) { V.gear(b, R, 'bike'); } },
      { id: 'plan', title: 'Plan', intro: 'Deine geplanten Radeinheiten dieser Woche.', build: function (b) { V.plan(b, R, st, 'bike'); } },
      { id: 'log', title: 'Logbuch', intro: 'Jede Fahrt, sortierbar.', build: function (b) { V.log(b, R, st, 'bike'); } }
    ]);
  };

  /* ============================ SCHWIMMEN ============================ */
  V.swim = function (root, R, st) {
    V.reset();
    var SW = R.swim, IN = I.swim(R), sum = R.sum.swim;
    return V.page(root, [
      { id: 'top', title: 'Übersicht', hero: true, build: function (b) {
        V.hero(b, R, st, { sports: ['swim'], icon: 'swim', kicker: 'Schwimmen · ' + SW.nPool + ' Becken, ' + SW.nOpen + ' Freiwasser', lead: IN.befund.title + '.', main: SW.css ? [U.pace(SW.css), '/100 m CSS', SW.cssSrc] : null,
          stats: [[num(sum.km * 1000, 0), 'm', 'in 12 Monaten'], [String(sum.n), '', 'Einheiten'], [num(sum.h, 1), 'h', 'im Wasser'], [SW.dps.length ? num(SW.dps[SW.dps.length - 1].v, 2) : '–', 'm', 'pro Zug']], chips: heroChips(R, 'swim'),
          volNote: 'Meter je Tag', perfNote: 'Höhe: Tempo der Einheit', perfFmt: function (v) { return U.pace(6000 / v) + ' /100 m'; } });
      } },
      { id: 'insights', title: 'Insights', intro: 'Die wichtigste Erkenntnis aus deinem Schwimmen und weitere Beobachtungen.', build: function (b) { V.insights(b, R, st, IN, 'swim'); } },
      { id: 'race', title: 'Race Day', intro: 'Dein Schwimmteil im Triathlon: Zielzeit, Chance, Freiwasser und Neo.', build: function (b) { V.legRace(b, R, st, 'swim'); } },
      { id: 'perf', title: 'Leistung', intro: 'Deine kritische Schwimmgeschwindigkeit, ihr Verlauf und Prognosen für alle Strecken.', build: function (b) {
        var g = el('div', { cls: 'grid g2' }); b.appendChild(g);
        var c = card({ title: 'Prognosen', sub: 'im Becken, ohne Freiwasser und Neo', info: 'css' }); g.appendChild(c);
        if (!SW.ready) c.appendChild(need('Es fehlt noch ' + SW.need + '.'));
        else [[400, 1.0, 'Testdistanz'], [750, 1.0, 'Sprint'], [1500, 1.03, 'Olympisch'], [1900, 1.05, '70.3'], [3800, 1.09, '140.6']].forEach(function (x) { var t = SW.predFor(x[0], x[1]); c.appendChild(V.predRow(num(x[0], 0) + ' m', x[2], U.time(t), U.pace(t / x[0] * 100) + ' /100 m', R.nextTri && M.TRI[R.nextTri.dist].swim === x[0])); });
        var c2 = card({ title: 'CSS im Verlauf', sub: 'aus dem schnellsten Tempo je Monat geschätzt', info: 'css' }); g.appendChild(c2);
        c2.appendChild(tiles([[SW.css ? U.pace(SW.css) : '–', 'CSS', SW.cssSrc || ''], [SW.poolPace ? U.pace(SW.poolPace) : '–', 'Median Becken', '/100 m'], [SW.zones ? U.pace(SW.zones[1]) : '–', 'locker langsamer als', '/100 m']], 't3'));
        if (SW.cssTrend.length >= 2) { var h = host(c2); V.later(function () { C.months(h, SW.cssTrend, { invert: true, fmt: function (v) { return U.pace(v); }, name: 'CSS', label: 'CSS je Monat', minPad: 3 }); }); }
        c2.appendChild(el('p', { cls: 'foot', text: 'Ein Test mit 400 m und 200 m Kraul unter „Mehr → Profil“ ersetzt die Schätzung.' }));
      } },
      { id: 'tech', title: 'Technik', intro: 'Strecke pro Zug, SWOLF und Zugfrequenz zeigen, ob du ökonomischer schwimmst.', build: function (b) {
        var g = el('div', { cls: 'grid g2' }); b.appendChild(g);
        [['dps', 'Zuglänge', 'Meter pro Zug · mehr ist besser', function (v) { return num(v, 2) + ' m'; }, false, 0.05, 'swolf'], ['swolf', 'SWOLF', 'Sekunden plus Züge je Bahn · weniger ist besser', function (v) { return num(v, 0); }, true, 2, 'swolf'], ['srateM', 'Zugfrequenz', 'Züge pro Minute', function (v) { return num(v, 0); }, false, 2, null], ['paceM', 'Tempo im Becken', 'pro 100 m · schneller ist oben', function (v) { return U.pace(v); }, true, 3, 'p100']].forEach(function (x) {
          var c = card({ title: x[1], sub: x[2], info: x[6] }); g.appendChild(c);
          var ser = SW[x[0]];
          if (!ser || ser.length < 2) { c.appendChild(el('p', { cls: 'muted', text: 'Noch zu wenige Monate mit Daten.' })); return; }
          var h = host(c); V.later(function () { C.months(h, ser, { fmt: x[3], name: x[1], label: x[1], invert: x[4], minPad: x[5] }); });
        });
        b.appendChild(el('p', { cls: 'foot', text: 'Brust und Kraul zählen gemeinsam. Beim Wechsel der Lage springen Zuglänge und SWOLF, das ist kein Rückschritt.' }));
      } },
      { id: 'open', title: 'Becken und Freiwasser', intro: 'Im Rennen fehlen Wende und Leine. So viel kostet dich das Freiwasser.', build: function (b) {
        var c = card({ title: 'Tempo im Vergleich', sub: '12 Monate' }); b.appendChild(c);
        var rows = []; if (SW.poolPace) rows.push({ label: 'Becken', v: 1 / SW.poolPace, txt: U.pace(SW.poolPace) + ' /100 m · ' + SW.nPool + ' Einheiten' }); if (SW.openPace) rows.push({ label: 'Freiwasser', v: 1 / SW.openPace, txt: U.pace(SW.openPace) + ' /100 m · ' + SW.nOpen + ' Einheiten' });
        if (!rows.length) c.appendChild(el('p', { cls: 'muted', text: 'Noch keine Schwimmeinheiten.' })); else C.hbars(host(c), rows, { label: 'Becken gegen Freiwasser' });
        if (SW.poolPace && SW.openPace) c.appendChild(el('p', { cls: 'foot', text: 'Im Freiwasser bist du ' + num((SW.openPace / SW.poolPace - 1) * 100, 0) + ' % langsamer. TriLog rechnet für das Rennen mit +5 %, ein Neo spart rund 5 %.' }));
      } },
      { id: 'form', title: 'Form und Belastung', intro: 'Nur deine Schwimmeinheiten, Belastung aus dem Tempo im Verhältnis zur CSS.', build: function (b) { V.form(b, R, st, 'swim'); } },
      { id: 'weeks', title: 'Umfang und Konstanz', intro: 'Meter pro Woche. Für Technik zählt vor allem, wie oft du im Wasser bist.', build: function (b) { V.volume(b, R, st, 'swim'); } },
      { id: 'zones', title: 'Intensität', intro: 'Zeit je Tempozone.', build: function (b) {
        var g = el('div', { cls: 'grid' }); b.appendChild(g); var c = V.zones(g, R, st, 'swim');
        if (SW.zones) c.appendChild(tiles([[String(SW.easyHard.length), 'zu hart geschwommen', 'Einheiten ab 800 m in Zone 4–5 ohne Intervalle', SW.easyHard.length > 1]], ''));
      } },
      { id: 'habit', title: 'Gewohnheit', intro: 'Wann du schwimmst.', build: function (b) { V.habit(b, R, st, 'swim', 'schwimmst'); } },
      { id: 'rec', title: 'Rekorde', intro: 'Bestwerte aus allen Schwimmeinheiten.', build: function (b) { V.records(b, R, 'swim'); } },
      { id: 'material', title: 'Material', intro: 'Dein Neo und wie lange er im Einsatz ist.', build: function (b) { V.gear(b, R, 'swim'); } },
      { id: 'plan', title: 'Plan', intro: 'Deine geplanten Schwimmeinheiten dieser Woche.', build: function (b) { V.plan(b, R, st, 'swim'); } },
      { id: 'log', title: 'Logbuch', intro: 'Jede Einheit, sortierbar.', build: function (b) { V.log(b, R, st, 'swim'); } }
    ]);
  };

  /* ============================ TRIATHLON und GESAMT ============================ */
  function seasonCard(b, R) {
    var c = card({}); b.appendChild(c);
    var fut = R.races.filter(function (r) { return U.dn(r.date) >= R.realToday; });
    if (!fut.length) { c.appendChild(el('p', { cls: 'muted', text: 'Noch kein Rennen eingetragen. Unter „Mehr → Rennen“ legst du Haupt- und Nebenrennen an.' })); return; }
    var t0 = R.realToday, last = Math.max.apply(null, fut.map(function (r) { return U.dn(r.date); })), t1 = Math.max(last + 14, t0 + 120);
    function X(d) { return (d - t0) / (t1 - t0) * 100; }
    var tl = el('div', { cls: 'tl' }), bar = el('div', { cls: 'bar' }); tl.appendChild(bar);
    bar.appendChild(el('span', { cls: 'now', style: 'left:0' }));
    fut.forEach(function (r, i) { var x = X(U.dn(r.date)); bar.appendChild(el('span', { cls: 'rc ' + (r.kind === 'tri' ? 's-tri' : 's-run'), style: 'left:' + x + '%', title: r.name }, r.main ? '★' : String(i + 1))); bar.appendChild(el('span', { cls: 'rl', style: 'left:' + U.clamp(x, 8, 92) + '%;top:' + (22 + (i % 2) * 16) + 'px', text: r.name.length > 18 ? r.name.slice(0, 17) + '…' : r.name })); });
    c.appendChild(tl);
    if (R.phase) {
      var raceD = U.dn(R.phase.race.date), cuts = [[raceD - 84, 'Grundlage'], [raceD - 42, 'Aufbau'], [raceD - 14, 'Wettkampf'], [raceD, 'Taper']], ph = el('div', { cls: 'phase' }), prev = t0;
      cuts.forEach(function (x) { var w = Math.max(0, x[0] - Math.max(prev, t0)); if (w > 0 || x[1] === R.phase.name) { var i = el('i', { cls: x[1] === R.phase.name || (x[1] === 'Wettkampf' && R.phase.name === 'Wettkampfspezifisch') ? 'on' : '', text: x[1] }); i.style.flex = Math.max(w, 6) + ' 1 0'; ph.appendChild(i); } prev = Math.max(prev, x[0]); });
      c.appendChild(ph);
      c.appendChild(el('p', { cls: 'balnote', style: 'margin-top:10px', text: 'Jetzt: ' + R.phase.name + ', noch ' + num(R.phase.weeks, 0) + ' Wochen bis ' + R.phase.race.name + '. Schwerpunkt: ' + R.phase.text + '.' }));
    }
    var rl = el('div', { cls: 'racelist' });
    fut.forEach(function (r) {
      var d = U.dn(r.date) - R.realToday, row = el('div', { cls: 'r' });
      row.innerHTML = '<span class="sdot ' + (r.kind === 'tri' ? 's-tri' : 's-run') + '"></span><div><b>' + esc(r.name) + (r.main ? ' · Hauptrennen' : '') + '</b><span>' + U.de(r.date) + ' · ' + (r.kind === 'tri' ? M.TRI[r.dist].name : M.RUNDIST[r.dist].name) + ' · in ' + d + ' Tagen' + (r.taper ? ' · Form am Renntag ' + num(r.taper.form, 0, true) : '') + '</span></div>';
      rl.appendChild(row);
    });
    c.appendChild(rl);
    c.appendChild(el('p', { cls: 'foot', text: 'Form am Renntag: Fitness und Ermüdung fortgeschrieben, ab 14 Tagen vorher mit 55 % der üblichen Last.' }));
  }
  function balance(b, R, key, tri, sports) {
    var share = key ? M.raceShare(key, tri) : null, tot = U.sum(sports, function (s) { return R.h84[s]; }) || 1;
    var c = card({ title: 'Balance der Disziplinen', info: 'limiter' }); b.appendChild(c);
    c.appendChild(el('p', { cls: 'balnote', text: share ? '„Dein Training“ ist der Anteil an deiner Ausdauerzeit der letzten zwölf Wochen. „Im Rennen“ ist der Anteil, den die Disziplin an der Wettkampfzeit über ' + M.TRI[key].name + ' ausmacht (' + share.src + '). Liegt das Training deutlich darunter, ist das dein Limiter.' : 'Anteil jeder Disziplin an deiner Ausdauerzeit der letzten zwölf Wochen.' }));
    var ratios = {}; sports.forEach(function (s) { ratios[s] = share ? (R.h84[s] / tot) / share[s] : 1; });
    var lim = share ? sports.slice().sort(function (a, b) { return ratios[a] - ratios[b]; })[0] : null;
    var g = el('div', { cls: 'balg' });
    sports.forEach(function (s) {
      var tr = R.h84[s] / tot, isL = s === lim && ratios[s] < 0.8, r = el('div', { cls: 'bal' + (isL ? ' lim' : '') });
      r.innerHTML = '<div class="balh"><span class="sdot s-' + s + '"></span><b>' + NAME[s] + '</b><span class="n">' + num(R.h84[s], 1) + ' h</span>' + (isL ? '<span class="chip warnc">Limiter</span>' : '') + '</div>' +
        '<div class="balb"><span>dein Training</span><div class="track"><i class="f-' + s + '" style="width:' + (tr * 100) + '%"></i></div><b class="num">' + num(tr * 100, 0) + ' %</b></div>' +
        (share ? '<div class="balb"><span>im Rennen</span><div class="track"><i class="ghost" style="width:' + (share[s] * 100) + '%"></i></div><b class="num">' + num(share[s] * 100, 0) + ' %</b></div>' : '');
      g.appendChild(r);
    });
    c.appendChild(g);
  }
  function strength(b, R) {
    var S = R.strength, g = el('div', { cls: 'grid g2' }); b.appendChild(g);
    var c = card({ title: 'Krafttraining', sub: 'letzte 12 Wochen · zählt in Form und Belastung' }); g.appendChild(c);
    c.appendChild(tiles([[num(S.perWeek, 1), 'pro Woche', S.n84 + ' Einheiten'], [S.min ? num(S.min, 0) + ' min' : '–', 'typische Dauer', S.hr ? 'Puls ' + Math.round(S.hr) : ''], [String(S.beforeKey), 'am Vortag einer Schlüsseleinheit', 'lang, hart oder Rennen', S.beforeKey >= 3]], 't3'));
    var h = host(c); V.later(function () { C.weeks(h, S.weeks.slice(-13), { key: 'str', stack: ['n'], val: function (W) { return W.n; }, color: function () { return 'var(--c-other)'; }, unit: 'Einheiten', dec: 0, names: { n: 'Kraft' }, label: 'Krafteinheiten je Woche', min: 4 }); });
    var c2 = card({ title: 'Kraft nach Wochentag', sub: 'letzte 12 Wochen' }); g.appendChild(c2);
    C.hbars(host(c2), S.byWd.map(function (n, i) { return { label: U.WDL[i], v: n, txt: n + '×' }; }), { label: 'Kraft nach Wochentag' });
    c2.appendChild(el('p', { cls: 'foot', text: 'Schweres Beintraining am Tag vor einer langen oder harten Einheit kostet dort Qualität. Ein Tag Abstand hilft.' }));
  }
  function energy(b, R) {
    var c = card({ title: 'Energie je Einheit', sub: 'Body Battery, die eine Stunde gekostet hat · Median je Art', info: 'bb' }); b.appendChild(c);
    if (!R.bb.length) { c.appendChild(el('p', { cls: 'muted', text: 'Deine Uhr hat keine Body-Battery-Werte geliefert.' })); return; }
    C.hbars(host(c), R.bb.map(function (x) { return { label: x.k, v: x.perH, txt: '−' + num(x.perH, 0) + ' pro Stunde · ' + x.n + '×' }; }), { label: 'Energie je Einheit' });
    c.appendChild(el('p', { cls: 'foot', text: 'Body Battery ist eine Schätzung deiner Uhr. Der Vergleich zeigt, welche Einheiten dich am meisten Energie kosten.' }));
  }
  function sums(b, R) {
    var c = card({ title: 'Zwölf Monate in Zahlen', sub: 'alle Einheiten' }); b.appendChild(c);
    c.appendChild(tiles([[num(R.sum.swim.km * 1000, 0) + ' m', 'Schwimmen', R.sum.swim.n + ' Einheiten · ' + num(R.sum.swim.h, 1) + ' h'], [num(R.sum.bike.km, 0) + ' km', 'Rad', R.sum.bike.n + ' Einheiten · ' + num(R.sum.bike.h, 1) + ' h'], [num(R.sum.run.km, 0) + ' km', 'Laufen', R.sum.run.n + ' Einheiten · ' + num(R.sum.run.h, 1) + ' h'], [num(R.sum.h, 0) + ' h', 'Gesamt', R.sum.units + ' Einheiten'], [num(R.active.days, 0), 'aktive Tage', 'längste Serie ' + R.active.streak + ' Tage'], [num(R.sum.elev, 0) + ' m', 'Höhenmeter', 'alle Sportarten']], 't3'));
  }

  V.tri = function (root, R, st) {
    V.reset();
    var race = R.nextTri, key = st.triKey || (race ? race.dist : 'H'), tri = M.triRace(R, key, race && race.dist === key ? race : null, race && race.wx), IN = I.tri(R, key, tri);
    return V.page(root, [
      { id: 'top', title: 'Übersicht', hero: true, build: function (b) {
        V.hero(b, R, st, { sports: ['swim', 'bike', 'run'], dark: true, icon: 'tri', kicker: 'Triathlon · Daten bis ' + U.de(R.today), lead: IN.befund.title + '.', main: tri.total ? [U.time(tri.total), '', 'Prognose ' + M.TRI[key].name + (race && race.dist === key ? ' · ' + race.name : ' · heute')] : null,
          stats: [[num(R.sum.h, 0), 'h', 'Training in 12 Monaten'], [num(R.h84tot, 1), 'h', 'Ausdauer in 12 Wochen'], [num(R.form.form, 0, true), '', 'Form · ' + V.formWord(R.form.form)]], chips: heroChips(R, 'tri'),
          modes: [['hours', 'Stunden'], ['load', 'Belastung']], volNote: 'Stunden je Tag, gestapelt nach Disziplin' });
        b.appendChild(V.legend([['swim', 'Schwimmen'], ['bike', 'Rad'], ['run', 'Laufen']]));
      } },
      { id: 'race', title: 'Race Day', intro: 'Gesamtzeit mit Teilzielen, Chance, Wetter, Höhenmetern und Verpflegung. Zieh am Regler oder klapp die Teilziele auf.', build: function (b) { V.triRace(b, R, st); } },
      { id: 'insights', title: 'Insights', intro: 'Die wichtigste Erkenntnis über alle drei Disziplinen und weitere Beobachtungen.', build: function (b) { V.insights(b, R, st, IN, 'tri'); } },
      { id: 'season', title: 'Saison', intro: 'Wo du in deiner Vorbereitung stehst.', build: function (b) { seasonCard(b, R); } },
      { id: 'form', title: 'Form und Belastung', intro: 'Alle Sportarten zusammen, auch Kraft. Die Säulen zeigen, welche Disziplin wie viel Last gebracht hat.', build: function (b) { V.form(b, R, st, 'all'); } },
      { id: 'balance', title: 'Balance', intro: 'Trainierst du die Disziplinen so, wie das Rennen sie verlangt?', build: function (b) { balance(b, R, key, tri, ['swim', 'bike', 'run']); } },
      { id: 'weeks', title: 'Umfang und Konstanz', intro: 'Ausdauerstunden pro Woche und dein Jahr Tag für Tag.', build: function (b) { V.volume(b, R, st, null); } },
      { id: 'kraft', title: 'Kraft', intro: 'Dein Krafttraining und wie es zu den Schlüsseleinheiten liegt.', build: function (b) { strength(b, R); } },
      { id: 'energy', title: 'Energie', intro: 'Welche Einheiten dich am meisten Body Battery kosten.', build: function (b) { energy(b, R); } },
      { id: 'habit', title: 'Gewohnheit', intro: 'Wann du trainierst, alle Ausdauereinheiten.', build: function (b) { V.habit(b, R, st, null, 'trainierst'); } },
      { id: 'plan', title: 'Wochenplan', intro: 'Dein Plan gegen dein Ist, mit dem Repair Guide.', build: function (b) { V.plan(b, R, st, null); } },
      { id: 'material', title: 'Material', intro: 'Alle Schuhe, Räder und Neos auf einen Blick.', build: function (b) { V.gear(b, R, null); } },
      { id: 'sums', title: 'In Zahlen', intro: 'Dein Jahr zusammengefasst.', build: function (b) { sums(b, R); } }
    ]);
  };

  V.multi = function (root, R, st, sports) {
    V.reset();
    var parts = sports.map(function (s) { return I[s](R, st); }), all = [];
    parts.forEach(function (p) { all.push(p.befund); });
    all.sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    var items = []; parts.forEach(function (p) { items = items.concat(p.items.slice(0, 3)); });
    var IN = { befund: all[0], items: all.slice(1).filter(function (x) { return x.key !== 'clean'; }).concat(items).slice(0, 6) };
    return V.page(root, [
      { id: 'top', title: 'Übersicht', hero: true, build: function (b) {
        V.hero(b, R, st, { sports: sports, dark: true, icon: 'tri', kicker: sports.map(function (s) { return NAME[s]; }).join(' und ') + ' · Daten bis ' + U.de(R.today), lead: IN.befund.title + '.',
          stats: [[num(R.sum.h, 0), 'h', 'Training in 12 Monaten'], [num(U.sum(sports, function (s) { return R.h84[s]; }), 1), 'h', 'Ausdauer in 12 Wochen'], [num(R.form.form, 0, true), '', 'Form · ' + V.formWord(R.form.form)]], chips: heroChips(R, 'multi'),
          modes: [['hours', 'Stunden'], ['load', 'Belastung']], volNote: 'Stunden je Tag, gestapelt' });
        b.appendChild(V.legend(sports.map(function (s) { return [s, NAME[s]]; })));
      } },
      { id: 'insights', title: 'Insights', intro: 'Die wichtigsten Erkenntnisse aus deinen Disziplinen.', build: function (b) { V.insights(b, R, st, IN, 'multi'); } },
      { id: 'season', title: 'Saison', intro: 'Deine Rennen und Phasen.', build: function (b) { seasonCard(b, R); } },
      { id: 'form', title: 'Form und Belastung', intro: 'Alle Sportarten zusammen, auch die nicht gewählten.', build: function (b) { V.form(b, R, st, 'all'); } },
      { id: 'balance', title: 'Verteilung', intro: 'Wie sich deine Ausdauerzeit verteilt.', build: function (b) { balance(b, R, null, null, sports); } },
      { id: 'weeks', title: 'Umfang und Konstanz', intro: 'Ausdauerstunden pro Woche.', build: function (b) { V.volume(b, R, st, null); } },
      { id: 'kraft', title: 'Kraft', intro: 'Dein Krafttraining.', build: function (b) { strength(b, R); } },
      { id: 'energy', title: 'Energie', intro: 'Welche Einheiten dich am meisten Body Battery kosten.', build: function (b) { energy(b, R); } },
      { id: 'plan', title: 'Wochenplan', intro: 'Dein Plan gegen dein Ist.', build: function (b) { V.plan(b, R, st, null); } },
      { id: 'material', title: 'Material', intro: 'Deine Ausrüstung.', build: function (b) { V.gear(b, R, null); } },
      { id: 'sums', title: 'In Zahlen', intro: 'Dein Jahr zusammengefasst.', build: function (b) { sums(b, R); } }
    ]);
  };
})(window.TL = window.TL || {});
