/* TriLog · Urteil aus Regeln: Befund, sechs Insights, Hinweise je Disziplin, Repair Guide */
(function (TL) {
  'use strict';
  var U = TL.u, M = TL.model, I = TL.insights = {};
  var NAME = { swim: 'Schwimmen', bike: 'Rad', run: 'Laufen' };
  var DAT = { swim: 'dem Schwimmen', bike: 'dem Rad', run: 'dem Laufen' };
  function pct(x) { return U.num(x * 100, 0) + ' %'; }

  /* ---------- Kandidaten für den Befund ---------- */
  function cands(R, triKey, tri) {
    var out = [], share = M.raceShare(triKey, tri), tot = R.h84tot;
    /* Limiter */
    if (tot >= 4) {
      var ratio = {}, worst = null;
      M.SPORTS.forEach(function (s) { ratio[s] = (R.h84[s] / tot) / share[s]; if (!worst || ratio[s] < ratio[worst]) worst = s; });
      var tr = R.h84[worst] / tot, rs = share[worst];
      if (ratio[worst] < 0.8) out.push({
        key: 'limiter', sport: worst, score: (1 - ratio[worst]) * 100, cat: 'Balance', icon: 'tri', target: 'balance',
        title: worst === 'bike' ? 'Das Rad kommt zu kurz' : worst === 'swim' ? 'Das Schwimmen kommt zu kurz' : 'Das Laufen kommt zu kurz',
        sentence: 'In den letzten zwölf Wochen entfielen ' + pct(tr) + ' deiner Ausdauerstunden auf ' + DAT[worst] + ', im Rennen (' + M.TRI[triKey].name + ') macht es rund ' + pct(rs) + ' der Zeit aus.',
        stats: [[pct(tr), 'Trainingsanteil ' + NAME[worst]], [pct(rs), 'Anteil an der Rennzeit'], [U.num(R.h84[worst], 1) + ' h', 'in 12 Wochen']],
        steps: ['Ausdauerstunden der letzten 84 Tage: Schwimmen ' + U.num(R.h84.swim, 1) + ' h, Rad ' + U.num(R.h84.bike, 1) + ' h, Laufen ' + U.num(R.h84.run, 1) + ' h.', 'Rennanteile ' + share.src + ' für ' + M.TRI[triKey].name + ': Schwimmen ' + pct(share.swim) + ', Rad ' + pct(share.bike) + ', Laufen ' + pct(share.run) + '.', 'Verhältnis Training zu Rennen: ' + M.SPORTS.map(function (s) { return NAME[s] + ' ' + U.num(ratio[s], 2); }).join(', ') + '. Unter 0,8 gilt eine Disziplin als unterversorgt.'],
        value: pct(tr), beleg: pct(tr) + ' Training gegen ' + pct(rs) + ' Rennen', grade: tot >= 10 ? 'belegt' : 'Hinweis'
      });
    }
    /* Lockeres zu hart */
    var RU = R.run;
    if (RU.easyRuns.length >= 4 && RU.zones) {
      var hi = RU.easyHi.length, n = RU.easyRuns.length, medHr = U.median(RU.easyRuns.map(function (u) { return u.hr; }));
      if (hi / n >= 0.4) out.push({
        key: 'easy', sport: 'run', score: hi / n * 100, cat: 'Risiko', icon: 'heart', target: 'run', risk: true,
        title: 'Deine lockeren Läufe sind nicht locker',
        sentence: hi + ' von ' + n + ' lockeren Läufen der letzten zwölf Wochen liefen mit einem Durchschnittspuls in Zone 3 oder höher, der Median lag bei ' + Math.round(medHr) + ' (Zone 3 ab ' + RU.zones[1] + ').',
        stats: [[hi + ' von ' + n, 'lockere Läufe in Zone 3+'], [String(Math.round(medHr)), 'Median-Puls locker'], [String(RU.zones[1]), 'Grenze Zone 3']],
        steps: ['Schwellenpuls ' + RU.lthr + ' (' + RU.lthrSrc + '); Zone 3 beginnt bei 90 % davon, also bei ' + RU.zones[1] + '.', 'Locker heißt: Lauf von 5 bis 22 km, langsamer als dein Marathontempo von ' + U.pace(RU.mp) + ' /km, ohne Qualitätsbegriff im Namen.', 'Gezählt werden die letzten 84 Tage.'],
        value: hi + '/' + n, beleg: 'Median ' + Math.round(medHr) + ' · Zone 3 ab ' + RU.zones[1], grade: n >= 6 ? 'belegt' : 'Hinweis'
      });
    }
    /* Sprung im Umfang (Stunden, alle Ausdauer) */
    var Wk = R.weeks, done = Wk.slice(0, -1);
    for (var i = done.length - 1; i >= 4; i--) {
      var hrs = function (W) { return W.h.swim + W.h.bike + W.h.run; };
      var prev = U.mean(done.slice(i - 4, i).map(hrs)), v = hrs(done[i]);
      if (v >= 4 && prev > 0 && v > prev * 1.3) {
        var age = R.today - done[i].start;
        if (age <= 42) out.push({
          key: 'jump', score: Math.min(90, (v / prev - 1) * 60) * (age <= 21 ? 1 : 0.6), cat: 'Risiko', icon: 'warn', target: 'weeks', risk: true,
          title: 'Dein Umfang ist zu schnell gestiegen',
          sentence: 'Die Woche ab ' + U.de(done[i].start) + ' hatte ' + U.num(v, 1) + ' Ausdauerstunden, ' + U.num((v / prev - 1) * 100, 0) + ' % mehr als der Schnitt der vier Wochen davor (' + U.num(prev, 1) + ' h).',
          stats: [[U.num(v, 1) + ' h', 'Woche ab ' + U.de(done[i].start, true)], [U.num(prev, 1) + ' h', 'Schnitt 4 Wochen davor'], ['+' + U.num((v / prev - 1) * 100, 0) + ' %', 'Sprung']],
          steps: ['Ausdauerstunden je Woche (Montag bis Sonntag), Schwimmen, Rad und Laufen zusammen.', 'Als Sprung zählt eine abgeschlossene Woche ab 4 Stunden, die mehr als 30 % über dem Schnitt der vier Wochen davor liegt.', 'Berücksichtigt wird nur die jüngste solche Woche der letzten sechs Wochen.'],
          value: '+' + U.num((v / prev - 1) * 100, 0) + ' %', beleg: U.num(v, 1) + ' h gegen ' + U.num(prev, 1) + ' h', grade: 'belegt'
        });
        break;
      }
    }
    /* Form sehr tief */
    if (R.form.form < -25) out.push({
      key: 'form', score: Math.min(95, -R.form.form * 2), cat: 'Risiko', icon: 'gauge', target: 'formcard', risk: true,
      title: 'Du bist gerade sehr belastet',
      sentence: 'Deine Form liegt bei ' + U.num(R.form.form, 0, true) + ': Die Ermüdung (' + U.num(R.form.fat, 0) + ') übersteigt die Fitness (' + U.num(R.form.fit, 0) + ') deutlich.',
      stats: [[U.num(R.form.form, 0, true), 'Form'], [U.num(R.form.fat, 0), 'Ermüdung'], [U.num(R.form.load7, 0), 'Punkte in 7 Tagen']],
      steps: ['Fitness: gleitender Schnitt der Tageslast über 42 Tage.', 'Ermüdung: gleitender Schnitt über 7 Tage.', 'Form = Fitness minus Ermüdung am Ende des Tages.'],
      value: U.num(R.form.form, 0, true), beleg: 'Fitness ' + U.num(R.form.fit, 0) + ' · Ermüdung ' + U.num(R.form.fat, 0), grade: 'belegt'
    });
    return out;
  }

  /* ---------- Befund und sechs Insights für die Triathlon-Ansicht ---------- */
  I.tri = function (R, triKey, tri) {
    var C = cands(R, triKey, tri).sort(function (a, b) { return b.score - a.score; });
    var bef = C[0] || {
      key: 'clean', score: 0, icon: 'check', target: 'formcard',
      title: 'Dein Training ist sauber verteilt',
      sentence: 'Keine Disziplin ist deutlich unterversorgt, kein Umfangssprung und keine überhöhte Ermüdung in den letzten Wochen.',
      stats: [[U.num(R.h84tot, 1) + ' h', 'Ausdauer in 12 Wochen'], [U.num(R.form.form, 0, true), 'Form'], [R.form.acwr ? U.num(R.form.acwr, 2) : '–', 'akut zu chronisch']],
      steps: ['Geprüft: Verteilung der Ausdauerstunden gegen die Rennanteile.', 'Geprüft: Wochensprünge über 30 % und Form unter −25.', 'Geprüft: Puls der lockeren Läufe.']
    };
    var used = {}; used[bef.key] = 1;
    var items = [];
    /* Fortschritt: VDOT jetzt gegen vor einem halben Jahr, sonst Rad- oder Schwimmeffizienz */
    (function () {
      var runs = R.units.filter(function (u) { return u.vdot && u.km >= 3; });
      var old = runs.filter(function (u) { return u.d <= R.today - 150 && u.d > R.today - 330; }).sort(function (a, b) { return b.vdot - a.vdot; })[0];
      if (R.run.vdot && old) {
        var dv = Math.round(R.run.vdot * 10) / 10 - Math.round(old.vdot * 10) / 10;
        items.push({ cat: 'Fortschritt', icon: 'trend', target: 'run', title: dv > 0.4 ? 'Dein Laufen wird schneller' : dv < -0.4 ? 'Deine Laufform ist gesunken' : 'Laufleistung stabil', value: U.num(dv, 1, true), sentence: 'Dein bester VDOT lag vor fünf bis elf Monaten bei ' + U.num(old.vdot, 1) + ', in den letzten 150 Tagen bei ' + U.num(R.run.vdot, 1) + '.', beleg: U.num(old.vdot, 1) + ' → ' + U.num(R.run.vdot, 1) + ' · VDOT', grade: 'belegt', risk: dv < -0.4 });
      } else if (R.swim.paceM.length >= 2) {
        var p = R.swim.paceM, d = p[p.length - 1].v - p[0].v;
        items.push({ cat: 'Fortschritt', icon: 'swim', target: 'swim', title: d < 0 ? 'Du schwimmst schneller' : 'Schwimmtempo noch ohne Fortschritt', value: U.num(d, 0, true) + ' s', sentence: 'Dein Median-Tempo im Becken lag ' + U.monthLabel(p[0].m) + ' bei ' + U.pace(p[0].v) + ' /100 m, zuletzt bei ' + U.pace(p[p.length - 1].v) + '.', beleg: 'Beckeneinheiten ab 400 m', grade: 'Hinweis' });
      } else items.push({ cat: 'Fortschritt', icon: 'trend', target: 'run', title: 'Noch kein Verlauf messbar', value: '–', sentence: 'Für einen Vorher-nachher-Vergleich braucht TriLog Läufe ab 3 km aus zwei Zeiträumen.', beleg: 'zu wenig Daten', grade: 'Hinweis' });
    })();
    /* Risiko */
    var risk = C.filter(function (c) { return c.cat === 'Risiko' && !used[c.key]; })[0];
    if (risk) { used[risk.key] = 1; items.push(risk); }
    else items.push({ cat: 'Risiko', icon: 'gauge', target: 'formcard', title: R.form.acwr && R.form.acwr > 1.3 ? 'Belastung steigt gerade an' : 'Belastung im grünen Bereich', value: R.form.acwr ? U.num(R.form.acwr, 2) : '–', sentence: 'Die letzten 7 Tage brachten ' + U.num(R.form.load7, 0) + ' Punkte, das Verhältnis zum Schnitt der 4 Wochen davor liegt bei ' + (R.form.acwr ? U.num(R.form.acwr, 2) : '–') + '.', beleg: 'akut zu chronisch · Zielbereich 0,8–1,3', grade: 'belegt', risk: R.form.acwr > 1.5 });
    /* Rennen */
    (function () {
      var race = R.nextRace;
      if (race && race.kind === 'tri' && tri && tri.total) items.push({ cat: 'Rennen', icon: 'flag', target: 'race', title: race.goal ? 'Ziel in ' + race.name : 'Prognose für ' + race.name, value: race.goal ? tri.chance + ' %' : U.time(tri.total), sentence: 'Die Prognose liegt bei ' + U.time(tri.total) + (race.goal ? ', dein Ziel bei ' + U.time(race.goal) : '') + ', Streuung ± ' + U.time(tri.sd) + '.', beleg: U.num(R.realToday <= U.dn(race.date) ? U.dn(race.date) - R.realToday : 0, 0) + ' Tage bis zum Start', grade: 'belegt' });
      else if (race && race.kind === 'run' && R.run.vdot) { var rr = M.runRace(R, race.dist, race.goal, race, race.wx); items.push({ cat: 'Rennen', icon: 'flag', target: 'run', title: race.goal ? 'Ziel in ' + race.name : 'Prognose für ' + race.name, value: race.goal ? rr.chance + ' %' : U.time(rr.rt), sentence: 'Die Prognose für ' + M.RUNDIST[race.dist].name + ' liegt bei ' + U.time(rr.rt) + (race.goal ? ', dein Ziel bei ' + U.time(race.goal) : '') + '.', beleg: 'Streuung ± ' + U.time(rr.sd), grade: 'belegt' }); }
      else if (tri && tri.missing.length) items.push({ cat: 'Rennen', icon: 'flag', target: 'race', title: 'Prognose noch unvollständig', value: (3 - tri.missing.length) + '/3', sentence: 'Für eine ' + M.TRI[triKey].name + '-Prognose fehlt noch: ' + tri.missing.map(function (m) { return NAME[m[0]]; }).join(', ') + '.', beleg: 'Disziplinen mit Prognose', grade: 'Hinweis' });
      else if (tri && tri.total) items.push({ cat: 'Rennen', icon: 'flag', target: 'race', title: M.TRI[triKey].name + ' heute', value: U.time(tri.total), sentence: 'Würdest du heute starten, liegt deine Zielzeit bei rund ' + U.time(tri.total) + '.', beleg: 'Streuung ± ' + U.time(tri.sd), grade: 'belegt' });
    })();
    /* Konstanz: Wochen mit allen drei Disziplinen */
    (function () {
      var last6 = R.weeks.slice(-7, -1), all3 = last6.filter(function (W) { return W.nd.swim && W.nd.bike && W.nd.run; }).length;
      var all52 = R.weeks.slice(0, -1).filter(function (W) { return W.nd.swim && W.nd.bike && W.nd.run; }).length;
      items.push({ cat: 'Konstanz', icon: 'calendar', target: 'weeks', title: all3 >= 4 ? 'Alle drei Disziplinen regelmäßig' : 'Selten alle drei in einer Woche', value: all3 + '/6', sentence: 'In ' + all3 + ' der letzten 6 Wochen hast du geschwommen, bist Rad gefahren und gelaufen, in 52 Wochen ' + all52 + '-mal.', beleg: 'Wochen mit allen drei Disziplinen', grade: 'belegt' });
    })();
    /* Gewohnheit */
    (function () {
      var en = R.units.filter(function (u) { return u.d >= R.today - 364 && M.SPORTS.indexOf(u.sport) >= 0; });
      if (!en.length) return;
      var g = {}; en.forEach(function (u) { var k = U.wday(u.d) + '-' + u.hour; g[k] = (g[k] || 0) + 1; });
      var top = Object.keys(g).sort(function (a, b) { return g[b] - g[a]; })[0].split('-');
      var pre9 = en.filter(function (u) { return u.hour < 9; }).length / en.length;
      items.push({ cat: 'Gewohnheit', icon: 'clock', target: 'habit', title: pre9 > 0.5 ? 'Du trainierst früh' : pre9 < 0.1 ? 'Du trainierst fast nie früh' : 'Gemischte Trainingszeiten', value: pct(pre9), sentence: U.num(pre9 * 100, 0) + ' % deiner Ausdauereinheiten begannen vor 9 Uhr, am häufigsten startest du ' + U.WDL[+top[0]].toLowerCase() + 's um ' + top[1] + ' Uhr.', beleg: en.length + ' Einheiten in 12 Monaten', grade: 'belegt' });
    })();
    /* Balance (Limiter) oder Koppeln */
    var lim = C.filter(function (c) { return c.key === 'limiter' && !used.limiter; })[0];
    if (lim) items.push(lim);
    else {
      var b84 = R.bricks.filter(function (b) { return b.run.d > R.today - 84; }).length;
      items.push({ cat: 'Balance', icon: 'brick', target: 'balance', title: b84 ? 'Koppeleinheiten im Training' : 'Noch keine Koppeleinheiten', value: String(b84), sentence: b84 ? b84 + ' Läufe in den letzten zwölf Wochen begannen direkt nach einer Radeinheit.' : 'In den letzten zwölf Wochen begann kein Lauf direkt nach einer Radeinheit. Koppeln gewöhnt die Beine an den Wechsel.', beleg: 'Lauf ≤ 20 min nach Radende', grade: b84 ? 'belegt' : 'Hinweis' });
    }
    return { befund: bef, items: items.slice(0, 6) };
  };

  /* ---------- Repair Guide: Plan der Woche prüfen ---------- */
  I.repair = function (plan, R) {
    var days = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return (plan[i] || []); });
    function hard(e) { return e.kind === 'hart'; } function key(e) { return e.kind === 'lang' || e.kind === 'koppel'; }
    var hardDays = days.map(function (d) { return d.some(hard); }), keyDays = days.map(function (d) { return d.some(key); });
    /* harte Einheit direkt vor einer Schlüsseleinheit */
    for (var i = 0; i < 6; i++) {
      if (hardDays[i] && keyDays[i + 1]) {
        var e = days[i].filter(hard)[0], k = days[i + 1].filter(key)[0];
        return { day: i, entry: e, to: 'locker', title: 'Ich mache den ' + U.WDL[i] + ' leicht, damit der ' + U.WDL[i + 1] + ' gelingt', reason: 'Am ' + U.WDL[i] + ' steht eine harte Einheit (' + NAME[e.sport] + '), direkt danach am ' + U.WDL[i + 1] + ' die Schlüsseleinheit (' + NAME[k.sport] + ', ' + (k.kind === 'koppel' ? 'Koppel' : 'lang') + '). Deine Form liegt bei ' + U.num(R.form.form, 0, true) + '. Zwei Reize hintereinander drücken die Qualität der wichtigeren Einheit.', keep: 'Die Schlüsseleinheit bleibt unverändert.' };
      }
    }
    /* zwei harte Tage hintereinander */
    for (i = 0; i < 6; i++) if (hardDays[i] && hardDays[i + 1]) {
      var e2 = days[i + 1].filter(hard)[0];
      return { day: i + 1, entry: e2, to: 'locker', title: 'Ich entzerre die harten Tage', reason: U.WDL[i] + ' und ' + U.WDL[i + 1] + ' sind beide hart geplant. Die zweite Einheit startet mit vorbelasteten Beinen, deine Form liegt bei ' + U.num(R.form.form, 0, true) + '.', keep: 'Die erste harte Einheit bleibt, die zweite wird locker.' };
    }
    var nh = hardDays.filter(Boolean).length;
    return { day: null, title: 'Deine Woche passt', reason: nh ? nh + ' harte Tage, keiner direkt vor einer Schlüsseleinheit und keine zwei harten Tage hintereinander.' : 'Kein harter Tag geplant. Für Fortschritt helfen ein bis zwei gezielte harte Einheiten pro Woche.', keep: '' };
  };

  /* ---------- Kurzhinweise je Disziplin ---------- */
  I.sport = function (R, s) {
    var out = [];
    if (s === 'run') {
      var RU = R.run;
      if (RU.easyRuns.length) out.push(['heart', RU.easyHi.length + ' von ' + RU.easyRuns.length + ' lockeren Läufen in Zone 3 oder höher', RU.easyHi.length / RU.easyRuns.length >= 0.4]);
      if (RU.hard.length) out.push(['bolt', RU.hardOver.length + ' von ' + RU.hard.length + ' harten Einheiten über dem Schwellenpuls', RU.hardOver.length > 0]);
      if (RU.easy) out.push(['run', 'Lockeres Tempo für dich: ' + U.pace(RU.easy[0]) + '–' + U.pace(RU.easy[1]) + ' /km', false]);
    }
    if (s === 'bike') {
      var BI = R.bike;
      if (!BI.ready) out.push(['info', 'Für Prognosen fehlt noch ' + BI.need, false]);
      if (BI.powerMode && BI.ftp && BI.ftpSrc.indexOf('geschätzt') === 0) out.push(['bolt', 'Die FTP ist aus einer Fahrt geschätzt. Ein 20-Minuten-Test oder ein Eintrag unter Mehr → Profil macht sie genau.', false]);
      if (R.assumed.weight) out.push(['info', 'Gewicht angenommen (75 kg). Trag es unter Mehr → Profil ein, dann stimmen W/kg und Radprognose.', false]);
      if (!BI.powerMode) out.push(['bolt', 'Ohne Wattmessung ist die Radprognose rund doppelt so unsicher. Ein Powermeter oder ein 20-Minuten-Test macht sie genauer.', false]);
      var b84 = R.bricks.filter(function (b) { return b.run.d > R.today - 84; }).length; out.push(['brick', b84 + ' Koppelläufe in 12 Wochen', false]);
    }
    if (s === 'swim') {
      var SW = R.swim, sw = R.units.filter(function (u) { return u.sport === 'swim' && u.d > R.today - 84; });
      if (!SW.ready) out.push(['info', 'Für Prognosen fehlt noch ' + SW.need, false]);
      if (SW.css && SW.cssSrc.indexOf('geschätzt') === 0) out.push(['drop', 'Die CSS ist aus dem Training geschätzt, egal ob Brust oder Kraul. Ein 400/200-m-Kraultest (Mehr → Profil) macht sie genau.', false]);
      out.push(['swim', sw.length + ' Einheiten in 12 Wochen, ' + sw.filter(function (u) { return u.sub === 'open'; }).length + ' im Freiwasser', false]);
    }
    return out;
  };
})(window.TL = window.TL || {});
