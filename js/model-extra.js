/* TriLog · Erweiterte Auswertung: Laufdynamik, Laufwatt, SAP, Temperatur, Zuglänge,
   Body Battery, Kraft, Ausrüstung, Taper, Saisonphase, Verpflegung, Rennteile je Disziplin */
(function (TL) {
  'use strict';
  var U = TL.u, M = TL.model;
  var QUAL = /×|\d\s*x\s*\d|schwell|tempo|intervall|rennen|wettkampf|steigerung|einlaufen|threshold|interval|race|fartlek/i;
  var HARD = /×|\d\s*x\s*\d|intervall|schwell|tempo|threshold|interval|fartlek/i;
  M.QUAL = QUAL; M.HARD = HARD;

  function monthly(list, val, minN) {
    var g = {};
    list.forEach(function (u) { var v = val(u); if (v == null || !isFinite(v)) return; var m = U.monthOf(u.d); (g[m] = g[m] || []).push(v); });
    return Object.keys(g).map(Number).sort(function (a, b) { return a - b; }).filter(function (m) { return g[m].length >= minN; }).map(function (m) { return { m: m, v: U.median(g[m]), n: g[m].length }; });
  }
  M.monthly = monthly;

  /* Effizienz: dichtestes 6-Schläge-Band, Monatsmediane, erstes gegen letztes Quartal */
  function efficiency(list, val, kind, tol) {
    list = list.filter(function (u) { var v = val(u); return v != null && isFinite(v) && u.hr; });
    if (list.length < 3) return { n: list.length, months: [], ready: false, kind: kind, pts: [] };
    var med = U.median(list.map(val));
    var clean = list.filter(function (u) { return Math.abs(val(u) / med - 1) <= tol; });
    var best = null, bc = -1;
    for (var b = 90; b < 195; b++) { var c = clean.filter(function (u) { return u.hr >= b && u.hr <= b + 5; }).length; if (c > bc) { bc = c; best = b; } }
    var band = clean.filter(function (u) { return u.hr >= best && u.hr <= best + 5; });
    var months = monthly(band, val, 2);
    var dmin = Math.min.apply(null, band.map(function (u) { return u.d; })), dmax = Math.max.apply(null, band.map(function (u) { return u.d; }));
    var early = band.filter(function (u) { return u.d < dmin + 91; }).map(val), late = band.filter(function (u) { return u.d > dmax - 91; }).map(val);
    return { n: band.length, lo: best, hi: best + 5, months: months, out: list.length - band.length, early: early.length >= 2 ? U.median(early) : null, late: late.length >= 2 ? U.median(late) : null, ready: months.length >= 2 && band.length >= 4, kind: kind, pts: band, span: dmax - dmin };
  }
  M.efficiency = efficiency;

  M.extend = function (R, ctx) {
    var all = R.units, T = R.today, D365 = T - 364, D84 = T - 83;
    var runs = all.filter(function (u) { return u.sport === 'run'; });
    var bikes = all.filter(function (u) { return u.sport === 'bike'; });
    var swims = all.filter(function (u) { return u.sport === 'swim'; });
    var RU = R.run, BI = R.bike, SW = R.swim;

    /* ---------------- Laufen ---------------- */
    var r12 = runs.filter(function (u) { return u.d >= D365 && u.km >= 3; });
    RU.dyn = {
      cad: monthly(r12, function (u) { return u.cad; }, 2),
      stride: monthly(r12, function (u) { return u.stride; }, 2),
      gct: monthly(r12, function (u) { return u.gct; }, 2),
      vo: monthly(r12, function (u) { return u.vo; }, 2),
      vr: monthly(r12, function (u) { return u.vr; }, 2)
    };
    RU.dynNow = {};
    ['cad', 'stride', 'gct', 'vo', 'vr'].forEach(function (k) { var x = runs.filter(function (u) { return u.d > T - 42 && u.km >= 3 && u[k]; }).map(function (u) { return u[k]; }); RU.dynNow[k] = x.length ? U.median(x) : null; });
    RU.hasDyn = r12.some(function (u) { return u.gct; });
    /* Laufwatt: Schwelle aus der stärksten Einheit 20–70 min, Zonen nach Prozent der Schwelle */
    var pw = runs.filter(function (u) { return u.rpow && u.sec >= 1200 && u.sec <= 4200 && u.d > T - 150; });
    var bestP = null;
    pw.forEach(function (u) { var e = (u.rnp || u.rpow) * Math.pow(u.sec / 3600, 0.07); if (!bestP || e > bestP.e) bestP = { e: e, u: u }; });
    RU.cpw = bestP ? Math.round(bestP.e) : null; RU.cpwRun = bestP ? bestP.u : null;
    RU.hasPow = runs.some(function (u) { return u.rpow; });
    RU.powEff = efficiency(runs.filter(function (u) { return u.d >= D365 && u.rpow && u.km >= 5 && u.sub !== 'treadmill' && !u.race; }), function (u) { return u.rpow; }, 'rwatt', 0.3);
    /* steigungsbereinigtes Tempo: auch hügelige Läufe zählen */
    RU.effSap = efficiency(runs.filter(function (u) { return u.d >= D365 && u.sub === '' && u.km >= 5 && u.km <= 25 && u.sap && !u.race && !QUAL.test(u.name); }), function (u) { return u.sap; }, 'pace', 0.25);
    /* Temperatur (Uhr am Handgelenk, liegt meist über der Lufttemperatur) */
    var tb = [[-50, 10, 'unter 10 °C'], [10, 16, '10–15 °C'], [16, 21, '16–20 °C'], [21, 26, '21–25 °C'], [26, 60, 'ab 26 °C']];
    var easyish = runs.filter(function (u) { return u.d >= D365 && u.sub === '' && u.km >= 5 && u.km <= 22 && u.hr && u.tmin != null && !u.race && !QUAL.test(u.name); });
    RU.temp = tb.map(function (b) { var x = easyish.filter(function (u) { return u.tmin >= b[0] && u.tmin < b[1]; }); return { label: b[2], n: x.length, hr: x.length ? U.median(x.map(function (u) { return u.hr; })) : null, pace: x.length ? U.median(x.map(function (u) { return u.sap || u.pace; })) : null }; });

    /* ---------------- Rad ---------------- */
    bikes.forEach(function (u) {
      if (BI.ftp && (u.np || u.pow)) { u.IF = (u.np || u.pow) / BI.ftp; u.tssCalc = u.tss || u.sec / 3600 * u.IF * u.IF * 100; }
      if (u.km && u.elev != null) u.climb = u.elev / u.km;
    });
    BI.ftpTrend = monthly(bikes.filter(function (u) { return (u.np || u.pow) && u.sec >= 1200 && u.sec <= 5400; }), function (u) { return (u.np || u.pow) * Math.pow(u.sec / 3600, 0.07); }, 1).map(function (p) { return p; });
    BI.cad = monthly(bikes.filter(function (u) { return u.cad && u.sec >= 1200; }), function (u) { return u.cad; }, 1);
    BI.speedM = monthly(bikes.filter(function (u) { return u.speed && u.sub !== 'indoor' && u.sec >= 1800; }), function (u) { return u.speed; }, 1);
    BI.rides = bikes.filter(function (u) { return u.d >= D365; });
    BI.longRides = BI.rides.filter(function (u) { return u.sec >= 7200; });
    BI.longHot = BI.longRides.filter(function (u) { return u.IF && u.IF > 0.8; });
    BI.indoor = BI.rides.filter(function (u) { return u.sub === 'indoor'; }).length;

    /* ---------------- Schwimmen ---------------- */
    swims.forEach(function (u) { if (u.km && u.strokes) u.dps = u.km * 1000 / u.strokes; });
    var s12 = swims.filter(function (u) { return u.d >= D365; });
    SW.dps = monthly(s12.filter(function (u) { return u.dps && u.km >= 0.2; }), function (u) { return u.dps; }, 1);
    SW.srateM = monthly(s12.filter(function (u) { return u.srate; }), function (u) { return u.srate; }, 1);
    SW.cssTrend = (function () { var g = {}; s12.filter(function (u) { return u.sub === 'pool' && u.p100 && u.km >= 0.4; }).forEach(function (u) { var m = U.monthOf(u.d); g[m] = Math.min(g[m] || 1e9, u.p100 - 2); }); return Object.keys(g).map(Number).sort(function (a, b) { return a - b; }).map(function (m) { return { m: m, v: g[m], n: 1 }; }); })();
    SW.poolPace = U.median(s12.filter(function (u) { return u.sub === 'pool' && u.p100; }).map(function (u) { return u.p100; }));
    SW.openPace = U.median(s12.filter(function (u) { return u.sub === 'open' && u.p100; }).map(function (u) { return u.p100; }));
    SW.nPool = s12.filter(function (u) { return u.sub === 'pool'; }).length; SW.nOpen = s12.filter(function (u) { return u.sub === 'open'; }).length;
    SW.perWeek = R.weeks.slice(-7, -1).map(function (W) { return W.nd.swim; });
    SW.list = s12;
    /* zu hart geschwommen: Einheiten ab 800 m, deren Tempo in Zone 4 oder 5 liegt, obwohl sie nicht nach Intervallen klingen */
    SW.easyHard = SW.zones ? s12.filter(function (u) { return u.d >= D84 && u.km >= 0.8 && u.zone >= 4 && !HARD.test(u.name); }) : [];

    /* ---------------- Body Battery ---------------- */
    var bbx = all.filter(function (u) { return u.d >= D365 && u.bb != null && u.sec >= 900; });
    function grp(u) {
      if (u.sport === 'run') return HARD.test(u.name) ? 'Laufen hart' : (u.km >= 14 ? 'Laufen lang' : 'Laufen locker');
      return M.SPORTNAME[u.sport] || 'Sonstiges';
    }
    var g = {};
    bbx.forEach(function (u) { var k = grp(u); (g[k] = g[k] || []).push(u.bb / (u.sec / 3600)); });
    R.bb = Object.keys(g).filter(function (k) { return g[k].length >= 2; }).map(function (k) { return { k: k, perH: U.median(g[k]), n: g[k].length }; }).sort(function (a, b) { return b.perH - a.perH; });

    /* ---------------- Kraft ---------------- */
    var st = all.filter(function (u) { return u.sport === 'strength' && u.d >= D365; });
    var s84 = st.filter(function (u) { return u.d >= D84; });
    var keyDays = {};
    runs.concat(bikes).forEach(function (u) { if (u.d >= D84 && (HARD.test(u.name) || u.race || (u.sport === 'run' && u.km >= 14) || (u.sport === 'bike' && u.sec >= 7200))) keyDays[u.d] = 1; });
    R.strength = {
      n12: st.length, n84: s84.length, perWeek: s84.length / 12,
      min: U.median(s84.map(function (u) { return u.sec / 60; })),
      hr: U.median(s84.filter(function (u) { return u.hr; }).map(function (u) { return u.hr; })),
      beforeKey: s84.filter(function (u) { return keyDays[u.d + 1]; }).length,
      sameDay: s84.filter(function (u) { return keyDays[u.d]; }).length,
      byWd: [0, 1, 2, 3, 4, 5, 6].map(function (i) { return s84.filter(function (u) { return U.wday(u.d) === i; }).length; }),
      weeks: R.weeks.map(function (W) { return { start: W.start, n: st.filter(function (u) { return u.d >= W.start && u.d < W.start + 7; }).length }; })
    };

    /* ---------------- Ausrüstung ---------------- */
    var gear = (ctx.gear || []).map(function (x) { return Object.assign({}, x); }), assign = ctx.assign || {};
    var SPORT_OF = { shoe: 'run', bike: 'bike', wetsuit: 'swim', chain: 'bike', tire: 'bike' };
    gear.forEach(function (x) { x.km = +x.km0 || 0; x.n = 0; x.first = null; x.last = null; x.km28 = 0; x.sport = SPORT_OF[x.type] || 'run'; x.sd = x.start ? U.dn(x.start) : -1e9; x.ed = x.end ? U.dn(x.end) : 1e9; });
    all.forEach(function (u) {
      var cand = [];
      if (assign[u.id]) { var a = gear.filter(function (x) { return x.id === assign[u.id]; })[0]; if (a) cand = [a]; }
      else {
        var inRange = gear.filter(function (x) { return x.sport === u.sport && x.type !== 'wetsuit' && u.d >= x.sd && u.d <= x.ed; });
        /* Schuh und Rad: Standard bzw. jüngstes Teil; Ketten und Reifen laufen zusätzlich zum Rad mit */
        var main = inRange.filter(function (x) { return x.type === 'shoe' || x.type === 'bike'; }).sort(function (a, b) { return (b.def ? 1 : 0) - (a.def ? 1 : 0) || b.sd - a.sd; })[0];
        cand = (main ? [main] : []).concat(inRange.filter(function (x) { return x.type === 'chain' || x.type === 'tire'; }));
        if (u.sport === 'swim' && u.sub === 'open') cand = cand.concat(gear.filter(function (x) { return x.type === 'wetsuit' && u.d >= x.sd && u.d <= x.ed; }));
      }
      cand.forEach(function (x) { if (u.km && u.sub !== 'indoor') x.km += u.km; x.n++; if (!x.first || u.d < x.first) x.first = u.d; if (!x.last || u.d > x.last) x.last = u.d; if (u.d > T - 28 && u.km) x.km28 += u.km; });
    });
    var DEF = { shoe: [600, 800], bike: [null, null], chain: [3000, 5000], tire: [3000, 5000], wetsuit: [null, null] };
    gear.forEach(function (x) {
      x.warn = +x.warn || DEF[x.type][0]; x.max = +x.max || DEF[x.type][1];
      if (x.type === 'wetsuit') { var yrs = (T - x.sd) / 365; x.years = yrs; x.state = yrs >= 4 ? 'due' : 'ok'; return; }
      if (!x.max) { x.state = 'ok'; return; }
      x.state = x.km >= x.max ? 'due' : x.km >= x.warn ? 'warn' : 'ok';
      x.weeksLeft = x.km28 > 0 ? Math.max(0, (x.max - x.km) / (x.km28 / 4)) : null;
    });
    R.gear = gear;
    R.gearActive = gear.filter(function (x) { return !x.end && !x.retired; });

    /* ---------------- Saisonphase und Taper ---------------- */
    var main = R.races.filter(function (r) { return U.dn(r.date) >= R.realToday && r.main; })[0] || R.nextRace;
    R.mainRace = main || null;
    if (main) {
      var wk = (U.dn(main.date) - R.realToday) / 7, ph;
      if (wk <= 2) ph = ['Taper', 'Umfang runter, Intensität kurz halten, frisch werden'];
      else if (wk <= 6) ph = ['Wettkampfspezifisch', 'Renntempo und Koppeln, Umfang auf Höchststand'];
      else if (wk <= 12) ph = ['Aufbau', 'Schwelle und lange Einheiten steigern'];
      else ph = ['Grundlage', 'viel locker, Technik, Umfang langsam erhöhen'];
      R.phase = { name: ph[0], text: ph[1], weeks: wk, race: main };
    }
    R.races.forEach(function (r) { if (U.dn(r.date) >= R.realToday) r.taper = M.taper(R, r.date); });
    return R;
  };

  /* Fitness und Ermüdung bis zum Renntag fortschreiben: vor dem Taper mittlere Last, ab 14 Tagen vorher 55 % */
  M.taper = function (R, date) {
    var S = R.ser.all, L = S.fit.length - 1, raceD = U.dn(date), tst = raceD - 14, m28 = U.mean(S.load.slice(-28));
    var fit = S.fit[L], fat = S.fat[L];
    for (var d = R.today + 1; d < raceD; d++) { var v = m28 * (d >= tst ? 0.55 : 1); fit += (v - fit) / 42; fat += (v - fat) / 7; }
    return { start: tst, form: fit - fat, fit: fit, fat: fat, started: R.today >= tst };
  };

  /* Verpflegung: allgemeine Richtwerte nach Dauer, keine individuelle Empfehlung */
  M.fuel = function (sec, tmax) {
    var h = sec / 3600, carb, fluid;
    if (h < 1.25) carb = [0, 30]; else if (h < 2.5) carb = [30, 60]; else carb = [60, 90];
    fluid = tmax != null && tmax >= 24 ? [600, 900] : [400, 700];
    return { h: h, carb: carb, fluid: fluid, totalCarb: [Math.round(carb[0] * h), Math.round(carb[1] * h)] };
  };

  /* ---------------- Rennteile einzeln (für Schwimmen und Rad) ---------------- */
  M.swimLeg = function (R, m, race) {
    if (!R.swim.ready) return null;
    var neo = race ? race.neo !== false : true, k = m <= 800 ? 1 : m <= 1600 ? 1.03 : m <= 2000 ? 1.05 : 1.09;
    var open = race ? 1.05 : 1, t = Math.round(m / 100 * R.swim.css * k * open * (race && neo ? 0.95 : 1));
    var est = R.swim.cssSrc && R.swim.cssSrc.indexOf('geschätzt') === 0;
    return { t: t, sd: t * (est ? 0.07 : 0.05), k: k, open: open, neo: race ? neo : null, est: est };
  };
  M.bikeLeg = function (R, km, ifp, spdf, race, wx) {
    if (!R.bike.ready) return null;
    var base = R.bike.predFor(km, ifp, spdf, 0), hm = race && race.bikeHm ? race.bikeHm : 0, withHm = R.bike.predFor(km, ifp, spdf, hm);
    var w = M.weatherCost(withHm, R.run.vdot || 45, wx && wx.tmax, wx && wx.td), heat = Math.round(w.sec * 0.5);
    var t = withHm + heat;
    return { flat: base, hm: withHm - base, heat: heat, t: t, sd: t * (R.bike.powerMode ? 0.04 : 0.07) };
  };

  /* Zeiteingabe prüfen: streng h:mm:ss bzw. m:ss, Plausibilität gegen Erwartung */
  M.checkTime = function (str, ctx) {
    str = String(str || '').trim();
    if (!str) return { ok: true, sec: null, empty: true };
    if (!/^\d{1,2}(:\d{1,2}){0,2}$/.test(str)) return { ok: false, msg: 'Bitte nur Ziffern und Doppelpunkte, z. B. ' + ctx.example + '.' };
    var p = str.split(':').map(Number);
    if (p.slice(1).some(function (x) { return x > 59; })) return { ok: false, msg: 'Minuten und Sekunden dürfen höchstens 59 sein.' };
    while (p.length < 3) p.unshift(0);
    var sec = p[0] * 3600 + p[1] * 60 + p[2];
    var txt = (p[0] ? p[0] + ' h ' : '') + p[1] + ' min ' + U.pad(p[2]) + ' s';
    if (ctx.min && sec < ctx.min) return { ok: false, sec: sec, msg: str + ' wäre ' + txt + '. Für ' + ctx.what + ' ist das unrealistisch kurz. Gemeint ist vermutlich ' + ctx.hint(sec) + '.' };
    if (ctx.max && sec > ctx.max) return { ok: false, sec: sec, msg: str + ' wäre ' + txt + '. Für ' + ctx.what + ' ist das unrealistisch lang.' };
    return { ok: true, sec: sec, txt: '= ' + txt + (ctx.extra ? ctx.extra(sec) : '') };
  };
})(window.TL = window.TL || {});
