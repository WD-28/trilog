/* TriLog · Befund und Beobachtungen je Disziplin, aus Regeln über deine Daten */
(function (TL) {
  'use strict';
  var U = TL.u, M = TL.model, I = TL.insights;
  var num = U.num;
  function pct(x) { return num(x * 100, 0) + ' %'; }
  function sdiff(a, b) { return Math.round(a) - Math.round(b); }

  /* Ausrüstung: der kritischste Gegenstand einer Sportart */
  I.gearItem = function (R, sport) {
    var g = (R.gearActive || []).filter(function (x) { return !sport || x.sport === sport; }).sort(function (a, b) { var o = { due: 0, warn: 1, ok: 2 }; return o[a.state] - o[b.state] || (b.km / (b.max || 1e9)) - (a.km / (a.max || 1e9)); })[0];
    if (!g) return { cat: 'Material', icon: sport === 'swim' ? 'drop' : sport === 'bike' ? 'bike' : 'shoe', target: 'material', title: 'Ausrüstung noch nicht angelegt', value: '–', sentence: 'Leg unter „Mehr → Ausrüstung“ deine ' + (sport === 'bike' ? 'Räder, Ketten und Reifen' : sport === 'swim' ? 'Neoprenanzüge' : 'Laufschuhe') + ' an. TriLog zählt dann die Kilometer und erinnert dich rechtzeitig an den Wechsel.', beleg: 'Garmin liefert keine Ausrüstung mit', grade: 'Hinweis' };
    if (g.type === 'wetsuit') return { cat: 'Material', icon: 'drop', target: 'material', title: g.state === 'due' ? g.name + ' prüfen' : g.name + ' im Einsatz', value: num(g.years, 1) + ' J.', sentence: g.name + ' ist seit ' + num(g.years, 1) + ' Jahren in Gebrauch' + (g.state === 'due' ? '. Nach rund vier Saisons lohnt ein Blick auf Nähte, Risse und Passform.' : ', ' + g.n + ' Freiwassereinheiten bisher.'), beleg: 'Richtwert: Prüfung nach 4 Jahren', grade: 'Hinweis', risk: g.state === 'due' };
    var left = g.max ? g.max - g.km : null;
    return { cat: 'Material', icon: g.type === 'shoe' ? 'shoe' : 'bike', target: 'material', risk: g.state !== 'ok',
      title: g.state === 'due' ? g.name + ': Austausch fällig' : g.state === 'warn' ? g.name + ' bald tauschen' : g.name + ' hält noch',
      value: num(g.km, 0) + ' km', sentence: g.name + ' hat ' + num(g.km, 0) + ' km' + (g.max ? ' von empfohlenen ' + num(g.max, 0) + ' km' : '') + (g.weeksLeft != null && left > 0 ? (g.weeksLeft > 104 ? '. Bei deinem aktuellen Umfang reicht das noch über zwei Jahre.' : '. Bei deinem Umfang der letzten vier Wochen sind das noch etwa ' + num(g.weeksLeft, 0) + ' Wochen.') : (left != null && left <= 0 ? '. Der Richtwert ist überschritten, prüf Sohle bzw. Verschleiß.' : '.')),
      beleg: 'Richtwert ' + (g.warn ? 'Hinweis ab ' + num(g.warn, 0) + ' km' : '') + (g.max ? ' · Austausch ab ' + num(g.max, 0) + ' km' : ''), grade: 'Hinweis' };
  };

  function habitItem(R, sport, verb) {
    var en = R.units.filter(function (u) { return u.d >= R.today - 364 && u.sport === sport; });
    if (en.length < 3) return { cat: 'Gewohnheit', icon: 'clock', target: 'habit', title: 'Noch kein Muster erkennbar', value: String(en.length), sentence: 'Für ein Muster braucht TriLog mehr Einheiten in den letzten zwölf Monaten.', beleg: en.length + ' Einheiten', grade: 'Hinweis' };
    var g = {}; en.forEach(function (u) { var k = U.wday(u.d) + '-' + u.hour; g[k] = (g[k] || 0) + 1; });
    var top = Object.keys(g).sort(function (a, b) { return g[b] - g[a]; })[0].split('-');
    var pre9 = en.filter(function (u) { return u.hour < 9; }).length / en.length;
    return { cat: 'Gewohnheit', icon: 'clock', target: 'habit', title: pre9 > 0.5 ? 'Du ' + verb + ' meist früh' : pre9 < 0.1 ? 'Du ' + verb + ' fast nie vor neun' : 'Gemischte Uhrzeiten', value: pct(pre9), sentence: num(pre9 * 100, 0) + ' % deiner Einheiten begannen vor 9 Uhr, am häufigsten ' + U.WDL[+top[0]].toLowerCase() + 's um ' + top[1] + ' Uhr (' + g[top.join('-')] + '-mal).', beleg: en.length + ' Einheiten in 12 Monaten', grade: 'belegt' };
  }
  function freqItem(R, sport, label, want) {
    var last6 = R.weeks.slice(-7, -1).map(function (W) { return W.nd[sport]; }), avg = U.mean(last6), hit = last6.filter(function (n) { return n >= want; }).length;
    return { cat: 'Konstanz', icon: 'calendar', target: 'weeks', title: hit >= 4 ? 'Regelmäßig ' + label : avg >= want - 1 ? want + ' Tage pro Woche selten erreicht' : 'Selten ' + label, value: num(avg, 1) + '/Wo.', sentence: 'In den letzten sechs Wochen im Schnitt ' + num(avg, 1) + ' Tage pro Woche, ' + hit + '-mal mindestens ' + want + ' Tage.', beleg: 'Ziel für Fortschritt: ' + want + ' Tage pro Woche', grade: 'belegt', risk: hit === 0 && avg < want / 2 };
  }
  function jumpCand(R, key, unit, minV, label) {
    var done = R.weeks.slice(0, -1);
    for (var i = done.length - 1; i >= done.length - 6 && i >= 4; i--) {
      var v = key(done[i]), prev = U.mean(done.slice(i - 4, i).map(key));
      if (v >= minV && prev > 0 && v > prev * 1.3) return { key: 'jump', score: Math.min(85, (v / prev - 1) * 55), cat: 'Belastung', icon: 'warn', target: 'weeks', risk: true,
        title: 'Dein ' + label + ' ist zu schnell gestiegen',
        sentence: 'Die Woche ab ' + U.de(done[i].start) + ' hatte ' + num(v, 1) + ' ' + unit + ', ' + num((v / prev - 1) * 100, 0) + ' % mehr als der Schnitt der vier Wochen davor (' + num(prev, 1) + ' ' + unit + ').',
        stats: [[num(v, 1) + ' ' + unit, 'Woche ab ' + U.de(done[i].start, true)], [num(prev, 1) + ' ' + unit, 'Schnitt 4 Wochen davor'], ['+' + num((v / prev - 1) * 100, 0) + ' %', 'Sprung']],
        steps: ['Wochen laufen von Montag bis Sonntag.', 'Als Sprung zählt eine abgeschlossene Woche, die mehr als 30 % über dem Schnitt der vier Wochen davor liegt.', 'Geprüft werden die letzten sechs abgeschlossenen Wochen, gemeldet wird die jüngste.'],
        value: '+' + num((v / prev - 1) * 100, 0) + ' %', beleg: num(v, 1) + ' gegen ' + num(prev, 1) + ' ' + unit, grade: 'belegt', chart: { kind: 'weeks', i: i } };
    }
    return null;
  }
  function effCand(E, sport, unitTxt, better) {
    if (!E || !E.months || E.months.length < 3 || E.span < 60) return null;
    var m0 = E.months[0], m1 = E.months[E.months.length - 1], early = m0.v, late = m1.v;
    var d = E.kind === 'pace' ? sdiff(early, late) : late - early, rel = d / early;
    if (Math.abs(rel) < 0.02) return null;
    var up = d > 0, f = E.kind === 'pace' ? function (v) { return U.pace(v) + ' /km'; } : E.kind === 'speed' ? function (v) { return num(v, 1) + ' km/h'; } : function (v) { return num(v, 0) + ' W'; };
    return { key: 'eff', score: Math.min(80, Math.abs(rel) * 900), cat: 'Fortschritt', icon: 'trend', target: 'eff', risk: !up,
      title: up ? better + ' bei gleichem Puls' : 'Bei gleichem Puls langsamer geworden',
      sentence: 'Im Pulsbereich ' + E.lo + ' bis ' + E.hi + ' lag dein Monatsmedian ' + U.monthLabel(m0.m) + ' bei ' + f(early) + ', ' + U.monthLabel(m1.m) + ' bei ' + f(late) + '.',
      stats: [[f(early), U.monthLabel(m0.m)], [f(late), U.monthLabel(m1.m)], [num(d, E.kind === 'speed' ? 1 : 0, true) + ' ' + unitTxt, up ? 'besser' : 'schlechter']],
      steps: ['Nur gleichmäßige Einheiten ohne Intervalle oder Rennen.', 'Das Pulsband von 6 Schlägen mit den meisten Einheiten: ' + E.lo + ' bis ' + E.hi + ', ' + E.n + ' Einheiten.', 'Verglichen werden der erste und der letzte Monat mit mindestens zwei Einheiten im Band (' + E.months.length + ' Monate mit Daten).'],
      value: num(d, E.kind === 'speed' ? 1 : 0, true) + ' ' + unitTxt, beleg: E.n + ' Einheiten im Band ' + E.lo + '–' + E.hi, grade: E.n >= 8 ? 'belegt' : 'Hinweis', chart: { kind: 'eff' } };
  }
  function finish(C, items, clean) {
    C = C.filter(Boolean).sort(function (a, b) { return b.score - a.score; });
    var bef = C[0] || clean; var used = {}; used[bef.key] = 1;
    items = C.slice(1).concat(items).filter(function (x) { if (!x || used[x.key || '']) return false; if (x.key) used[x.key] = 1; return true; });
    var gi = items.map(function (x) { return x.cat === 'Material' && x.risk; }).indexOf(true);
    if (gi >= 6) items.splice(5, 0, items.splice(gi, 1)[0]);
    return { befund: bef, items: items.slice(0, 6) };
  }

  /* ====================== LAUFEN ====================== */
  I.run = function (R) {
    var RU = R.run, C = [], items = [];
    if (RU.easyRuns.length >= 4 && RU.zones) {
      var hi = RU.easyHi.length, n = RU.easyRuns.length, medHr = U.median(RU.easyRuns.map(function (u) { return u.hr; }));
      if (hi / n >= 0.4) C.push({ key: 'easy', score: hi / n * 100, cat: 'Belastung', icon: 'heart', target: 'easy', risk: true,
        title: 'Deine lockeren Läufe sind nicht locker',
        sentence: hi + ' von ' + n + ' lockeren Läufen der letzten zwölf Wochen liefen mit einem Durchschnittspuls in Zone 3 oder höher, der Median lag bei ' + Math.round(medHr) + ', Zone 3 beginnt bei ' + RU.zones[1] + '.',
        stats: [[hi + ' von ' + n, 'lockere Läufe in Zone 3+'], [String(Math.round(medHr)), 'Median-Puls locker'], [U.pace(RU.easy[0]) + '–' + U.pace(RU.easy[1]), 'lockeres Tempo für dich']],
        steps: ['Schwellenpuls ' + RU.lthr + ' (' + RU.lthrSrc + '); Zone 3 beginnt bei 90 % davon, also bei ' + RU.zones[1] + '.', 'Locker heißt: 5 bis 22 km, langsamer als dein Marathontempo von ' + U.pace(RU.mp) + ' /km, ohne Qualitätsbegriff im Namen.', 'Lockeres Tempo nach Daniels für VDOT ' + num(RU.vdot, 1) + ': ' + U.pace(RU.easy[0]) + ' bis ' + U.pace(RU.easy[1]) + ' /km.'],
        value: hi + '/' + n, beleg: 'Median ' + Math.round(medHr) + ' · Zone 3 ab ' + RU.zones[1], grade: n >= 6 ? 'belegt' : 'Hinweis', chart: { kind: 'easy' } });
    }
    C.push(jumpCand(R, function (W) { return W.run; }, 'km', 20, 'Laufumfang'));
    var E = RU.effSap && RU.effSap.ready ? RU.effSap : RU.eff;
    C.push(effCand(E, 'run', 's/km', 'Du läufst schneller'));
    if (RU.hard.length >= 2 && RU.hardOver.length / RU.hard.length >= 0.5) C.push({ key: 'hard', score: 55, cat: 'Belastung', icon: 'bolt', target: 'easy', risk: true, title: 'Deine harten Einheiten sind zu hart', sentence: RU.hardOver.length + ' von ' + RU.hard.length + ' Intervall- und Schwelleneinheiten hatten über die ganze Einheit einen Schnitt am oder über deinem Schwellenpuls von ' + RU.lthr + '. Mit Ein- und Auslaufen heißt das: Die schnellen Abschnitte waren deutlich darüber.', stats: [[RU.hardOver.length + ' von ' + RU.hard.length, 'über der Schwelle'], [String(RU.lthr), 'Schwellenpuls'], [String(RU.b2b), 'zwei harte Tage in Folge']], steps: ['Hart heißt: Der Name klingt nach Intervallen, Schwelle oder Tempo.', 'Verglichen wird der Durchschnittspuls der ganzen Einheit mit dem Schwellenpuls.', 'Zeitraum: die letzten 84 Tage.'], value: RU.hardOver.length + '/' + RU.hard.length, beleg: 'Ø-Puls ≥ ' + RU.lthr, grade: 'belegt', chart: { kind: 'easy' } });

    /* Beobachtungen */
    var runs = R.units.filter(function (u) { return u.vdot && u.km >= 3; }), old = runs.filter(function (u) { return u.d <= R.today - 150 && u.d > R.today - 330; }).sort(function (a, b) { return b.vdot - a.vdot; })[0];
    if (RU.vdot && old) { var dv = Math.round(RU.vdot * 10) / 10 - Math.round(old.vdot * 10) / 10; items.push({ key: 'vdot', cat: 'Fortschritt', icon: 'trend', target: 'perf', title: dv > 0.4 ? 'Dein VDOT steigt' : dv < -0.4 ? 'Dein VDOT ist gesunken' : 'VDOT stabil', value: num(dv, 1, true), sentence: 'Bester VDOT vor fünf bis elf Monaten: ' + num(old.vdot, 1) + ', in den letzten 150 Tagen: ' + num(RU.vdot, 1) + '.', beleg: num(old.vdot, 1) + ' → ' + num(RU.vdot, 1), grade: 'belegt', risk: dv < -0.4 }); }
    var e2 = effCand(E, 'run', 's/km', 'Du läufst schneller'); if (e2) items.push(e2);
    var race = R.nextRun;
    if (race && RU.vdot && !race.goalBad) { var rr = M.runRace(R, race.dist, race.goal, race, race.wx); items.push({ key: 'race', cat: 'Rennen', icon: 'flag', target: 'race', title: race.goal ? 'Ziel in ' + race.name + ': ' + I.chanceWord(rr.chance) : 'Prognose für ' + race.name, value: race.goal ? rr.chance + ' %' : U.time(rr.rt), sentence: 'Am Renntag liegst du bei etwa ' + U.time(rr.rt) + (race.goal ? ', ' + I.gapTxt(rr.rt, race.goal) + ' Ziel von ' + U.time(race.goal) : '') + '. Streuung ± ' + U.time(rr.sd) + '.', beleg: (U.dn(race.date) - R.realToday) + ' Tage bis zum Start', grade: 'belegt' }); }
    else if (race && race.goalBad) items.push({ key: 'race', cat: 'Rennen', icon: 'warn', target: 'race', risk: true, title: 'Zielzeit prüfen', value: U.time(race.goalBad), sentence: 'Für ' + race.name + ' ist als Ziel ' + U.time(race.goalBad) + ' eingetragen, das ist für ' + M.RUNDIST[race.dist].name + ' unrealistisch. Bitte unter „Mehr → Rennen“ im Format h:mm:ss eintragen.', beleg: 'z. B. 1:40:00', grade: 'Hinweis' });
    items.push(freqItem(R, 'run', 'gelaufen', 3));
    if (RU.dynNow && RU.dynNow.cad) { var cad = RU.dynNow.cad; items.push({ key: 'cad', cat: 'Technik', icon: 'run', target: 'dyn', title: cad >= 170 ? 'Hohe Schrittfrequenz' : cad >= 160 ? 'Schrittfrequenz im üblichen Bereich' : 'Niedrige Schrittfrequenz', value: num(cad, 0), sentence: 'Median der letzten sechs Wochen: ' + num(cad, 0) + ' Schritte pro Minute, Bodenkontakt ' + (RU.dynNow.gct ? num(RU.dynNow.gct, 0) + ' ms' : '–') + ', Schrittlänge ' + (RU.dynNow.stride ? num(RU.dynNow.stride, 2) + ' m' : '–') + '.', beleg: 'Freizeitläufer liegen meist bei 160–175', grade: 'Hinweis' }); }
    items.push(I.gearItem(R, 'run'));
    items.push(habitItem(R, 'run', 'läufst'));
    var clean = { key: 'clean', score: 0, icon: 'check', target: 'easy', title: 'Dein Lauftraining ist sauber', sentence: 'Lockere Läufe liegen im lockeren Bereich, kein Umfangssprung und keine überzogenen harten Einheiten in den letzten zwölf Wochen.', stats: [[num(R.sum.run.km, 0) + ' km', 'in 12 Monaten'], [RU.vdot ? num(RU.vdot, 1) : '–', 'VDOT'], [RU.easyHi.length + ' von ' + RU.easyRuns.length, 'Lockere zu hart']], steps: ['Geprüft: Puls der lockeren Läufe.', 'Geprüft: Wochensprünge über 30 %.', 'Geprüft: harte Einheiten über der Schwelle.'] };
    return finish(C, items, clean);
  };

  /* ====================== RAD ====================== */
  I.bike = function (R, ctx) {
    var BI = R.bike, C = [], items = [], key = ctx && ctx.triKey || 'H', T = M.TRI[key];
    var bikeRace = R.nextTri ? (BI.ready ? M.bikeLeg(R, M.TRI[R.nextTri.dist].bike, M.TRI[R.nextTri.dist].ifp, M.TRI[R.nextTri.dist].spd, R.nextTri, R.nextTri.wx) : null) : null;
    var longest = BI.rides.slice().sort(function (a, b) { return b.sec - a.sec; })[0];
    var need = R.nextTri ? (bikeRace ? bikeRace.t : M.TRI[R.nextTri.dist].bike / 27 * 3600) : null;
    if (R.nextTri && longest && need && longest.sec < need * 0.6) C.push({ key: 'long', score: 60 + (1 - longest.sec / need) * 30, cat: 'Ausdauer', icon: 'clock', target: 'long', risk: true,
      title: 'Dir fehlt die lange Ausfahrt',
      sentence: 'Deine längste Fahrt der letzten zwölf Monate dauerte ' + U.hm(longest.sec) + ', der Radteil von ' + R.nextTri.name + ' braucht voraussichtlich ' + U.hm(need) + '.',
      stats: [[U.hm(longest.sec), 'längste Fahrt'], [U.hm(need), 'Radteil im Rennen'], [num(longest.sec / need * 100, 0) + ' %', 'erreicht']],
      steps: ['Längste Radeinheit der letzten 365 Tage nach Bewegungszeit.', 'Radzeit im Rennen aus deiner Prognose' + (bikeRace ? '' : ' bzw. 27 km/h als Annahme') + '.', 'Als Richtwert gilt: Die längste Ausfahrt sollte vor dem Rennen mindestens 80 % der Radzeit erreichen.'],
      value: num(longest.sec / need * 100, 0) + ' %', beleg: U.hm(longest.sec) + ' von ' + U.hm(need), grade: 'belegt', chart: { kind: 'long', need: need } });
    if (BI.longHot.length >= 2 && BI.longHot.length / Math.max(1, BI.longRides.length) >= 0.5) C.push({ key: 'ifhot', score: 50, cat: 'Belastung', icon: 'bolt', target: 'eff', risk: true, title: 'Lange Fahrten zu hart', sentence: BI.longHot.length + ' von ' + BI.longRides.length + ' Fahrten über zwei Stunden hatten einen Intensitätsfaktor über 0,80.', stats: [[BI.longHot.length + ' von ' + BI.longRides.length, 'lange Fahrten > 0,80 IF'], [num(BI.ftp, 0) + ' W', 'FTP'], ['0,65–0,75', 'üblich für lange Grundlage']], steps: ['Intensitätsfaktor = Normalized Power ÷ FTP.', 'Lang heißt: mindestens zwei Stunden.', 'Zeitraum: 12 Monate.'], value: BI.longHot.length + '/' + BI.longRides.length, beleg: 'IF > 0,80 bei Fahrten ab 2 h', grade: 'belegt' });
    C.push(jumpCand(R, function (W) { return W.h.bike; }, 'h', 3, 'Radumfang'));
    var E = BI.powerMode && BI.effW && BI.effW.ready ? BI.effW : BI.eff;
    C.push(effCand(E, 'bike', E.kind === 'watt' ? 'W' : 'km/h', 'Du fährst stärker'));

    if (BI.powerMode && BI.ftp) items.push({ key: 'ftp', cat: 'Leistung', icon: 'bolt', target: 'perf', title: 'FTP ' + num(BI.ftp, 0) + ' W', value: num(BI.wkg, 2) + ' W/kg', sentence: 'Deine Schwellenleistung liegt bei ' + num(BI.ftp, 0) + ' W, bei ' + num(R.weight, 0) + ' kg sind das ' + num(BI.wkg, 2) + ' W/kg.', beleg: BI.ftpSrc + (R.assumed.weight ? ' · Gewicht angenommen' : ''), grade: BI.ftpSrc === 'angegeben' ? 'belegt' : 'Hinweis' });
    else items.push({ key: 'ftp', cat: 'Leistung', icon: 'bike', target: 'perf', title: BI.baseSpeed ? 'Dauertempo flach' : 'Leistung noch offen', value: BI.baseSpeed ? num(BI.baseSpeed, 1) + ' km/h' : '–', sentence: BI.baseSpeed ? 'Aus ' + BI.flatRides + ' flachen Ausfahrten der letzten 90 Tage. Ohne Wattmessung ist das die Grundlage für deine Radprognose.' : 'Es fehlt noch ' + BI.need + '.', beleg: 'ohne Powermeter', grade: 'Hinweis' });
    if (bikeRace) items.push({ key: 'race', cat: 'Rennen', icon: 'flag', target: 'race', title: 'Radteil in ' + R.nextTri.name, value: U.time(bikeRace.t), sentence: 'Für ' + num(M.TRI[R.nextTri.dist].bike, 0) + ' km rechnet TriLog mit ' + U.time(bikeRace.t) + (bikeRace.hm ? ', davon ' + U.time(bikeRace.hm) + ' für die Höhenmeter' : '') + '.', beleg: 'Streuung ± ' + U.time(bikeRace.sd), grade: 'belegt' });
    var e2 = effCand(E, 'bike', E.kind === 'watt' ? 'W' : 'km/h', 'Du fährst stärker'); if (e2) items.push(e2);
    items.push(freqItem(R, 'bike', 'gefahren', 2));
    var b84 = R.bricks.filter(function (b) { return b.run.d > R.today - 84; }).length;
    items.push({ key: 'brick', cat: 'Koppeln', icon: 'brick', target: 'brick', title: b84 ? b84 + ' Koppelläufe in 12 Wochen' : 'Noch keine Koppelläufe', value: String(b84), sentence: b84 ? 'So viele Läufe begannen höchstens 20 Minuten nach einer Radeinheit.' : 'Kein Lauf begann direkt nach einer Radeinheit. Schon 10 bis 15 Minuten nach dem Rad gewöhnen die Beine an den Wechsel.', beleg: 'Lauf ≤ 20 min nach Radende', grade: b84 ? 'belegt' : 'Hinweis' });
    items.push(I.gearItem(R, 'bike'));
    items.push(habitItem(R, 'bike', 'fährst'));
    var clean = { key: 'clean', score: 0, icon: 'check', target: 'weeks', title: 'Dein Radtraining passt', sentence: 'Kein Umfangssprung, keine überzogenen langen Fahrten, und die lange Ausfahrt reicht für dein nächstes Rennen.', stats: [[num(R.sum.bike.km, 0) + ' km', 'in 12 Monaten'], [num(R.sum.bike.h, 1) + ' h', 'Radzeit'], [String(BI.rides.length), 'Fahrten']], steps: ['Geprüft: Länge der längsten Fahrt gegen den Radteil im Rennen.', 'Geprüft: Intensität langer Fahrten.', 'Geprüft: Wochensprünge über 30 %.'] };
    return finish(C, items, clean);
  };

  /* ====================== SCHWIMMEN ====================== */
  I.swim = function (R) {
    var SW = R.swim, C = [], items = [];
    var avg = U.mean(SW.perWeek);
    if (avg < 2) C.push({ key: 'freq', score: 55 + (2 - avg) * 15, cat: 'Konstanz', icon: 'calendar', target: 'weeks', risk: avg < 1,
      title: 'Zu selten im Wasser für Fortschritt',
      sentence: 'In den letzten sechs Wochen warst du im Schnitt ' + num(avg, 1) + '-mal pro Woche schwimmen. Technik festigt sich vor allem über Häufigkeit, zwei bis drei kurze Einheiten bringen mehr als eine lange.',
      stats: [[num(avg, 1), 'Einheiten pro Woche'], [String(SW.perWeek.filter(function (n) { return n >= 2; }).length) + ' von 6', 'Wochen mit 2+'], [SW.list.length + '', 'Einheiten in 12 Monaten']],
      steps: ['Gezählt werden Tage mit mindestens 200 m.', 'Zeitraum: die letzten sechs abgeschlossenen Wochen.', 'Richtwert für Technikaufbau: zwei bis drei Einheiten pro Woche.'],
      value: num(avg, 1) + '/Wo.', beleg: 'Richtwert 2–3 pro Woche', grade: 'belegt', chart: { kind: 'weeks' } });
    if (SW.dps.length >= 2) { var d0 = SW.dps[0].v, d1 = SW.dps[SW.dps.length - 1].v, rel = (d1 - d0) / d0; if (Math.abs(rel) >= 0.05) C.push({ key: 'dps', score: 40 + Math.abs(rel) * 120, cat: 'Technik', icon: 'swim', target: 'tech', risk: rel < 0,
      title: rel > 0 ? 'Deine Züge werden länger' : 'Deine Züge werden kürzer',
      sentence: 'Pro Zug kommst du inzwischen ' + num(d1, 2) + ' m weit, ' + U.monthLabel(SW.dps[0].m) + ' waren es ' + num(d0, 2) + ' m. Mehr Strecke pro Zug ist das deutlichste Zeichen für bessere Technik.',
      stats: [[num(d0, 2) + ' m', 'pro Zug, früh'], [num(d1, 2) + ' m', 'pro Zug, zuletzt'], [num(rel * 100, 0, true) + ' %', 'Veränderung']],
      steps: ['Zuglänge = geschwommene Meter ÷ Züge laut Uhr.', 'Monatsmediane aller Einheiten ab 200 m.', 'Brust und Kraul zählen gemeinsam, ein Wechsel der Lage verschiebt den Wert.'],
      value: num(rel * 100, 0, true) + ' %', beleg: num(d0, 2) + ' → ' + num(d1, 2) + ' m', grade: SW.dps.length >= 3 ? 'belegt' : 'Hinweis', chart: { kind: 'dps' } }); }
    if (SW.css && SW.cssSrc && SW.cssSrc.indexOf('geschätzt') === 0) C.push({ key: 'css', score: 35, cat: 'Leistung', icon: 'drop', target: 'perf', title: 'Deine CSS ist nur geschätzt', sentence: 'Die CSS von ' + U.pace(SW.css) + ' /100 m stammt aus dem Training, nicht aus einem Test. Zonen, Belastung und Prognose sind dadurch ungenauer.', stats: [[U.pace(SW.css), 'CSS geschätzt'], ['400 + 200 m', 'Test im Kraul'], ['± 7 %', 'Streuung statt ± 5 %']], steps: ['Ohne Test nimmt TriLog das schnellste Tempo einer Beckeneinheit ab 800 m minus 2 Sekunden.', 'Ein Test (400 m und 200 m Kraul) ergibt: (Zeit 400 − Zeit 200) ÷ 2.', 'Eintragen unter „Mehr → Profil“.'], value: U.pace(SW.css), beleg: SW.cssSrc, grade: 'Hinweis' });

    if (SW.css) items.push({ key: 'css', cat: 'Leistung', icon: 'drop', target: 'perf', title: 'CSS ' + U.pace(SW.css) + ' /100 m', value: U.pace(SW.css), sentence: 'Tempo, das du im Kraul etwa 30 Minuten halten kannst. Grundlage für Zonen und Prognosen.', beleg: SW.cssSrc, grade: SW.cssSrc === 'angegeben' || SW.cssSrc === 'aus Test 400/200 m' ? 'belegt' : 'Hinweis' });
    if (SW.paceM.length >= 2) { var p = SW.paceM, dd = sdiff(p[0].v, p[p.length - 1].v); items.push({ key: 'pace', cat: 'Fortschritt', icon: 'trend', target: 'eff', title: dd > 0 ? 'Du schwimmst schneller' : 'Tempo noch ohne Fortschritt', value: num(dd, 0, true) + ' s', sentence: 'Median im Becken: ' + U.monthLabel(p[0].m) + ' ' + U.pace(p[0].v) + ' /100 m, zuletzt ' + U.pace(p[p.length - 1].v) + '.', beleg: 'Beckeneinheiten ab 400 m', grade: p.length >= 3 ? 'belegt' : 'Hinweis', risk: dd < 0 }); }
    var leg = R.nextTri ? M.swimLeg(R, M.TRI[R.nextTri.dist].swim, R.nextTri) : null;
    if (leg) items.push({ key: 'race', cat: 'Rennen', icon: 'flag', target: 'race', title: 'Schwimmteil in ' + R.nextTri.name, value: U.time(leg.t), sentence: num(M.TRI[R.nextTri.dist].swim, 0) + ' m im Freiwasser' + (leg.neo ? ' mit Neo' : '') + ', Streuung ± ' + U.time(leg.sd) + '.', beleg: leg.est ? 'CSS geschätzt' : 'CSS aus Test', grade: leg.est ? 'Hinweis' : 'belegt' });
    items.push(freqItem(R, 'swim', 'geschwommen', 2));
    if (SW.nOpen || SW.nPool) items.push({ key: 'open', cat: 'Freiwasser', icon: 'drop', target: 'open', title: SW.nOpen ? 'Freiwasser ' + (SW.openPace && SW.poolPace ? num((SW.openPace / SW.poolPace - 1) * 100, 0, true) + ' % langsamer' : 'im Training') : 'Noch kein Freiwasser', value: SW.nOpen + '/' + (SW.nOpen + SW.nPool), sentence: SW.nOpen ? 'Im Becken ' + U.pace(SW.poolPace) + ' /100 m, im Freiwasser ' + U.pace(SW.openPace) + '. Orientierung, Wellen und fehlendes Abstoßen kosten Zeit.' : 'Im Rennen fehlen Wende und Leine. Einheiten im See vor der Saison helfen bei Orientierung und Neo-Gefühl.', beleg: SW.nOpen + ' Freiwasser, ' + SW.nPool + ' Becken', grade: SW.nOpen >= 3 ? 'belegt' : 'Hinweis' });
    if (SW.dps.length) { var last = SW.dps[SW.dps.length - 1]; items.push({ key: 'dpsi', cat: 'Technik', icon: 'swim', target: 'tech', title: 'Zuglänge ' + num(last.v, 2) + ' m', value: num(last.v, 2) + ' m', sentence: 'Strecke pro Zug im letzten Monat mit Daten. Steigt der Wert bei gleichem Tempo, schwimmst du ökonomischer.', beleg: last.n + ' Einheiten', grade: 'Hinweis' }); }
    items.push(I.gearItem(R, 'swim'));
    items.push(habitItem(R, 'swim', 'schwimmst'));
    var clean = { key: 'clean', score: 0, icon: 'check', target: 'weeks', title: 'Dein Schwimmen läuft regelmäßig', sentence: 'Du schwimmst oft genug für Technikfortschritt, und die Werte sind stabil.', stats: [[num(R.sum.swim.km * 1000, 0) + ' m', 'in 12 Monaten'], [num(avg, 1), 'pro Woche'], [SW.css ? U.pace(SW.css) : '–', 'CSS']], steps: ['Geprüft: Häufigkeit pro Woche.', 'Geprüft: Zuglänge im Verlauf.', 'Geprüft: Herkunft der CSS.'] };
    return finish(C, items, clean);
  };

  I.chanceWord = function (c) { return c == null ? '' : c < 20 ? 'unwahrscheinlich' : c < 40 ? 'eher nicht' : c < 60 ? 'offen' : c < 80 ? 'gut möglich' : 'sehr wahrscheinlich'; };
  I.gapTxt = function (rt, goal) { var d = Math.round(rt) - Math.round(goal); return d > 0 ? U.time(d) + ' über deinem' : d < 0 ? U.time(-d) + ' unter deinem' : 'genau auf deinem'; };
})(window.TL = window.TL || {});
