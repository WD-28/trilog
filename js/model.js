/* TriLog · Rechenmodell: Parameter, Belastung, Leistung, Prognosen, Triathlon */
(function (TL) {
  'use strict';
  var U = TL.u;
  var M = TL.model = {};

  M.SPORTS = ['swim', 'bike', 'run'];
  M.SPORTNAME = { swim: 'Schwimmen', bike: 'Rad', run: 'Laufen', strength: 'Kraft', walk: 'Gehen', multi: 'Triathlon', other: 'Sonstiges' };
  M.TRI = {
    S: { name: 'Sprint', swim: 750, bike: 20, run: 5, t1: 150, t2: 90, ifp: 0.92, spd: 1.06, swf: 1.00, runf: 1.03 },
    O: { name: 'Olympisch', swim: 1500, bike: 40, run: 10, t1: 180, t2: 120, ifp: 0.86, spd: 1.03, swf: 1.03, runf: 1.05 },
    H: { name: '70.3', swim: 1900, bike: 90, run: 21.0975, t1: 240, t2: 150, ifp: 0.78, spd: 1.00, swf: 1.05, runf: 1.08 },
    F: { name: '140.6', swim: 3800, bike: 180.2, run: 42.195, t1: 360, t2: 240, ifp: 0.70, spd: 0.95, swf: 1.09, runf: 1.16 }
  };
  M.RUNDIST = { '5': { name: '5 km', km: 5, band: 0.020 }, '10': { name: '10 km', km: 10, band: 0.022 }, 'HM': { name: 'Halbmarathon', km: 21.0975, band: 0.028 }, 'M': { name: 'Marathon', km: 42.195, band: 0.040 } };
  var QUAL = /×|\d\s*x\s*\d|schwell|tempo|intervall|rennen|wettkampf|steigerung|einlaufen|threshold|interval|race|fartlek/i;
  var HARD = /×|\d\s*x\s*\d|intervall|schwell|tempo|threshold|interval|fartlek/i;

  /* ---------- Daniels-Gilbert ---------- */
  M.vdot = function (km, s) {
    var d = km * 1000, t = s / 60, v = d / t;
    return (-4.6 + 0.182258 * v + 0.000104 * v * v) / (0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t));
  };
  M.timeFor = function (km, vd) {
    var lo = km * 120, hi = km * 900;
    for (var i = 0; i < 80; i++) { var mid = (lo + hi) / 2; if (M.vdot(km, mid) > vd) lo = mid; else hi = mid; }
    return Math.round((lo + hi) / 2);
  };
  M.easyPace = function (vd) {
    function v(vo2) { var a = 0.000104, b = 0.182258, c = -4.6 - vo2; return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a); }
    return [Math.round(60000 / v(0.70 * vd)), Math.round(60000 / v(0.62 * vd))];
  };

  /* ---------- Radphysik: Tempo aus Leistung ---------- */
  M.bikeSpeed = function (P, mass, cda) {
    var rho = 1.2, crr = 0.005, g = 9.81, lo = 1, hi = 25;
    for (var i = 0; i < 60; i++) { var v = (lo + hi) / 2, p = 0.5 * rho * cda * v * v * v + crr * mass * g * v; if (p > P) hi = v; else lo = v; }
    return (lo + hi) / 2;
  };

  /* ---------- Hauptberechnung ---------- */
  M.compute = function (units, profile, races, plan, opts) {
    opts = opts || {};
    var R = { profile: profile, assumed: {} };
    var all = units.map(function (u) { var o = Object.assign({}, u); o.d = U.dn(o.ts); o.hour = +o.ts.slice(11, 13); return o; }).sort(function (a, b) { return a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0; });
    R.units = all;
    R.empty = !all.length;
    var realToday = U.todayLocal();
    R.realToday = realToday;
    if (R.empty) return R;
    var TODAY = all[all.length - 1].d; R.today = TODAY;
    var D365 = TODAY - 364, D84 = TODAY - 83;
    R.from = D365;

    /* Ruhepuls, Gewicht */
    var rest = +profile.rest || 0; if (!rest) { rest = 50; R.assumed.rest = true; } R.rest = rest;
    var weight = +profile.weight || 0; if (!weight) { weight = 75; R.assumed.weight = true; } R.weight = weight;

    /* Laufband und Schwimmen: unplausibler Puls zählt als fehlend */
    all.forEach(function (u) {
      if (u.hr != null && u.sport === 'run' && u.km && u.sec / u.km < 480 && u.hr < Math.max(100, rest + 40)) { u.hrBad = true; u.hr = null; }
    });

    var runs = all.filter(function (u) { return u.sport === 'run'; });
    var bikes = all.filter(function (u) { return u.sport === 'bike'; });
    var swims = all.filter(function (u) { return u.sport === 'swim'; });
    runs.forEach(function (u) {
      if (u.km && u.km > 0) { u.pace = u.sec / u.km; if (u.sub !== 'trail' && u.km >= 1) u.vdot = M.vdot(u.km, u.sec); }
    });
    bikes.forEach(function (u) { if (u.km) u.speed = u.km / (u.sec / 3600); });
    swims.forEach(function (u) { if (u.km) { u.p100 = u.sec / (u.km * 10); } });

    /* Maximalpuls: höchster Wert aus Lauf/Rad, den eine zweite Einheit bis auf 3 Schläge erreicht */
    var mx = runs.concat(bikes).map(function (u) { return u.hrmax; }).filter(function (h) { return h && h <= 215; }).sort(function (a, b) { return b - a; });
    var hrmax = null;
    for (var i = 0; i < mx.length - 1; i++) { if (mx[i] - mx[i + 1] <= 3) { hrmax = mx[i]; break; } }
    R.hrmax = +profile.hrmax || hrmax; R.hrmaxSrc = profile.hrmax ? 'angegeben' : (hrmax ? 'aus den Daten' : null);

    /* Rennen nach Regel und aktueller VDOT */
    var vr = runs.filter(function (u) { return u.vdot && u.km >= 3; });
    var r12 = vr.filter(function (u) { return u.d >= D365; });
    var best12 = r12.length ? Math.max.apply(null, r12.map(function (u) { return u.vdot; })) : null;
    runs.forEach(function (u) { u.race = !!(u.vdot && u.d >= D365 && u.km >= 4.9 && best12 && u.vdot >= best12 - 2.5); });
    var cur = vr.filter(function (u) { return u.d > TODAY - 150; }).sort(function (a, b) { return b.vdot - a.vdot; })[0];
    R.run = { vdot: cur ? Math.round(cur.vdot * 10) / 10 : null, vdotRaw: cur ? cur.vdot : null, vdotRun: cur || null, best12: best12 };

    /* Schwellenpuls Laufen */
    var lt = runs.filter(function (u) { return u.d >= D365 && u.vdot && u.hr && u.km >= 9.5 && u.km <= 21.5; }).sort(function (a, b) { return b.vdot - a.vdot; })[0];
    var lthrRun = +profile.lthrRun || (lt ? Math.round(lt.hr * (lt.km < 15 ? 0.98 : 1)) : (R.hrmax ? Math.round(R.hrmax * 0.89) : null));
    R.run.lthr = lthrRun; R.run.lthrSrc = profile.lthrRun ? 'angegeben' : (lt ? 'aus ' + U.num(lt.km, 1) + ' km am ' + U.de(lt.d) : (R.hrmax ? 'geschätzt: 89 % vom Maximalpuls' : null));
    R.run.zones = lthrRun ? [0.85, 0.90, 0.95, 1.0].map(function (p) { return Math.round(lthrRun * p); }) : null;

    /* Rad: Schwelle, FTP, Wattmodus */
    var lthrBike = +profile.lthrBike || (lthrRun ? lthrRun - 7 : null);
    R.bike = { lthr: lthrBike, lthrSrc: profile.lthrBike ? 'angegeben' : (lthrRun ? 'Laufschwelle minus 7 (Faustregel)' : null) };
    R.bike.zonesHr = lthrBike ? [0.81, 0.89, 0.94, 1.0].map(function (p) { return Math.round(lthrBike * p); }) : null;
    var withPow = bikes.filter(function (u) { return (u.np || u.pow) && u.d > TODAY - 120; });
    R.bike.hasPowerData = withPow.length > 0;
    var pm = opts.power || profile.power || 'auto';
    R.bike.powerMode = pm === 'on' ? true : pm === 'off' ? false : R.bike.hasPowerData;
    R.bike.powerSetting = pm;
    var ftpEst = null, ftpRide = null;
    withPow.forEach(function (u) {
      var t = u.sec / 60; if (t < 20 || t > 90) return;
      var e = (u.np || u.pow) * Math.pow(t / 60, 0.07);
      if (!ftpEst || e > ftpEst) { ftpEst = e; ftpRide = u; }
    });
    R.bike.ftp = +profile.ftp || (ftpEst ? Math.round(ftpEst) : null);
    R.bike.ftpSrc = profile.ftp ? 'angegeben' : (ftpEst ? 'geschätzt aus ' + U.num(ftpRide.sec / 60, 0) + ' min am ' + U.de(ftpRide.d) : null);
    R.bike.wkg = R.bike.ftp ? R.bike.ftp / weight : null;

    /* Schwimmen: CSS */
    var css = null, cssSrc = null;
    if (+profile.css) { css = +profile.css; cssSrc = 'angegeben'; }
    else if (+profile.t400 && +profile.t200 && profile.t400 > profile.t200) { css = (profile.t400 - profile.t200) / 2; cssSrc = 'aus Test 400/200 m'; }
    else {
      var cand = swims.filter(function (u) { return u.sub === 'pool' && u.km >= 0.8 && u.d > TODAY - 120 && u.p100; }).sort(function (a, b) { return a.p100 - b.p100; })[0];
      if (cand) { css = cand.p100 - 2; cssSrc = 'geschätzt aus ' + U.num(cand.km * 1000, 0) + ' m am ' + U.de(cand.d); R.swimCssRun = cand; }
    }
    R.swim = { css: css ? Math.round(css) : null, cssSrc: cssSrc };
    R.swim.zones = css ? [css + 15, css + 8, css + 3, css - 2] : null; /* Grenzen in s/100 m, langsam → schnell */

    /* ---------- Zonen je Einheit ---------- */
    all.forEach(function (u) {
      if (u.sport === 'run' && u.hr && R.run.zones) u.zone = 1 + R.run.zones.filter(function (b) { return u.hr >= b; }).length;
      if (u.sport === 'bike') {
        if (R.bike.powerMode && R.bike.ftp && (u.np || u.pow)) { var f = (u.np || u.pow) / R.bike.ftp; u.zone = f < 0.56 ? 1 : f < 0.76 ? 2 : f < 0.91 ? 3 : f < 1.06 ? 4 : 5; u.zoneBy = 'w'; }
        else if (u.hr && R.bike.zonesHr) { u.zone = 1 + R.bike.zonesHr.filter(function (b) { return u.hr >= b; }).length; u.zoneBy = 'hr'; }
      }
      if (u.sport === 'swim' && R.swim.zones && u.p100) { var z = R.swim.zones; u.zone = u.p100 > z[0] ? 1 : u.p100 > z[1] ? 2 : u.p100 > z[2] ? 3 : u.p100 > z[3] ? 4 : 5; }
    });

    /* ---------- Belastung je Einheit ---------- */
    var FAC = { strength: 0.55, bike: 0.65, walk: 0.55, run: 0.75, swim: 0.7, multi: 0.85, other: 0.6 };
    var nEst = 0;
    all.forEach(function (u) {
      var h = u.sec / 3600, l = null, how = '';
      if (u.sport === 'bike' && R.bike.powerMode && R.bike.ftp && (u.np || u.pow)) { var IF = (u.np || u.pow) / R.bike.ftp; l = u.tss || h * IF * IF * 100; how = 'Watt'; }
      else if (u.sport === 'swim' && R.swim.css && u.p100) { var sif = Math.min(1.25, R.swim.css / u.p100); l = h * sif * sif * sif * 100; how = 'Tempo'; }
      else if (u.hr && (u.sport === 'bike' ? lthrBike : lthrRun)) { var thr = u.sport === 'bike' ? lthrBike : lthrRun; var fr = Math.max(0, u.hr - rest) / Math.max(1, thr - rest); l = h * fr * fr * 100; how = 'Puls'; }
      else { l = h * Math.pow(FAC[u.sport] || 0.6, 2) * 100; how = 'geschätzt'; nEst++; }
      u.load = l; u.loadHow = how;
    });
    R.nEst = nEst; R.nHrBad = all.filter(function (u) { return u.hrBad; }).length;

    /* ---------- Fitness und Ermüdung, gesamt und je Disziplin ---------- */
    var d0 = all[0].d, N = TODAY - d0 + 1;
    function series(filter) {
      var dl = new Array(N).fill(0);
      all.forEach(function (u) { if (filter(u)) dl[u.d - d0] += u.load; });
      var init = U.mean(dl.slice(0, Math.min(28, N))), fit = init, fat = init, F = [], A = [];
      dl.forEach(function (v) { fit += (v - fit) / 42; fat += (v - fat) / 7; F.push(fit); A.push(fat); });
      return { load: dl, fit: F, fat: A };
    }
    R.d0 = d0;
    R.ser = { all: series(function () { return true; }) };
    M.SPORTS.forEach(function (s) { R.ser[s] = series(function (u) { return u.sport === s; }); });
    var S = R.ser.all, L = N - 1;
    R.form = { fit: S.fit[L], fat: S.fat[L], form: S.fit[L] - S.fat[L], ramp: S.fit[L] - S.fit[Math.max(0, L - 7)] };
    var a7 = U.sum(S.load.slice(-7)), c28 = U.sum(S.load.slice(-35, -7)) / 4;
    R.form.load7 = a7; R.form.acwr = c28 > 0 ? a7 / c28 : null;
    var l7 = S.load.slice(-7), mu = U.mean(l7), sd = Math.sqrt(U.mean(l7.map(function (x) { return (x - mu) * (x - mu); })));
    R.form.mono = sd > 0 ? mu / sd : null;

    /* ---------- Wochen (Mo–So), 52 abgeschlossene + laufende ---------- */
    var curW = TODAY - U.wday(TODAY);
    R.weeks = [];
    for (var w = curW - 52 * 7; w <= curW; w += 7) R.weeks.push({ start: w, swim: 0, bike: 0, run: 0, other: 0, h: { swim: 0, bike: 0, run: 0, other: 0 }, load: 0, days: { swim: {}, bike: {}, run: {} } });
    var firstW = R.weeks[0].start;
    all.forEach(function (u) {
      var wi = Math.floor((u.d - firstW) / 7); if (wi < 0 || wi >= R.weeks.length) return;
      var W = R.weeks[wi], k = M.SPORTS.indexOf(u.sport) >= 0 ? u.sport : 'other';
      if (k !== 'other' && u.km) W[k] += u.km;
      W.h[k] += u.sec / 3600; W.load += u.load;
      if (k !== 'other' && (u.km || 0) >= (k === 'swim' ? 0.2 : 1)) W.days[k][u.d] = 1;
    });
    R.weeks.forEach(function (W) { W.nd = { swim: Object.keys(W.days.swim).length, bike: Object.keys(W.days.bike).length, run: Object.keys(W.days.run).length }; W.hours = W.h.swim + W.h.bike + W.h.run + W.h.other; });

    /* ---------- Laufen im Detail ---------- */
    var RU = R.run;
    if (RU.vdot) {
      RU.pred = {}; RU.riegel = {};
      var races12 = runs.filter(function (u) { return u.race; }).sort(function (a, b) { return a.km - b.km; });
      var lr = races12[races12.length - 1];
      RU.riegelSrc = lr || null;
      Object.keys(M.RUNDIST).forEach(function (k) { var km = M.RUNDIST[k].km; RU.pred[k] = M.timeFor(km, RU.vdotRaw); if (lr) RU.riegel[k] = Math.round(lr.sec * Math.pow(km / lr.km, 1.06)); });
      RU.easy = M.easyPace(RU.vdot);
      RU.mp = RU.pred.M / 42.195;
    }
    RU.races = runs.filter(function (u) { return u.race; });
    var R84 = runs.filter(function (u) { return u.d >= D84; });
    RU.easyRuns = RU.mp ? R84.filter(function (u) { return u.sub === '' && u.km >= 5 && u.km <= 22 && u.pace > RU.mp && !QUAL.test(u.name) && u.hr; }) : [];
    RU.easyHi = RU.zones ? RU.easyRuns.filter(function (u) { return u.hr >= RU.zones[1]; }) : [];
    RU.hard = R84.filter(function (u) { return HARD.test(u.name) && !u.race; });
    RU.hardOver = lthrRun ? RU.hard.filter(function (u) { return u.hr && u.hr >= lthrRun; }) : [];
    var hd = {}; RU.hard.concat(R84.filter(function (u) { return u.race; })).forEach(function (u) { hd[u.d] = 1; });
    var hds = Object.keys(hd).map(Number).sort(function (a, b) { return a - b; });
    RU.b2b = hds.filter(function (d, i) { return i && d - hds[i - 1] === 1; }).length;
    /* Bestzeiten */
    function pb(lo, hi, norm) {
      var c = runs.filter(function (u) { return u.km >= lo && u.km <= hi && u.sub !== 'trail'; }).map(function (u) { return { u: u, t: u.km <= norm * 1.02 ? u.sec : u.sec * Math.pow(norm / u.km, 1.06) }; }).sort(function (a, b) { return a.t - b.t; })[0];
      return c ? { t: Math.round(c.t), d: c.u.d, name: c.u.name } : null;
    }
    RU.pb = { '5': pb(4.95, 5.3, 5), '10': pb(9.9, 10.5, 10), 'HM': pb(21.0, 21.5, 21.0975), 'M': pb(42.1, 42.8, 42.195) };
    /* Tempo bei gleichem Puls */
    RU.eff = efficiency(runs.filter(function (u) { return u.d >= D365 && u.sub === '' && u.km >= 6 && u.km <= 25 && u.hr && !u.race && !QUAL.test(u.name) && (u.elev || 0) / u.km <= 12; }), function (u) { return u.pace; }, 'pace', 0.25);

    /* ---------- Rad im Detail ---------- */
    var BI = R.bike;
    var flat = bikes.filter(function (u) { return u.sub !== 'indoor' && u.km && u.sec >= 2700 && (u.elev || 0) / u.km <= 10 && u.d > TODAY - 90; });
    BI.flatRides = flat.length;
    if (BI.powerMode && BI.ftp) BI.ready = true;
    else if (!BI.powerMode && flat.length >= 2) {
      var sp = flat.map(function (u) { return u.speed; }).sort(function (a, b) { return a - b; });
      BI.baseSpeed = sp[Math.floor(sp.length * 0.75)] || sp[sp.length - 1];
      BI.ready = true;
    } else BI.ready = false;
    BI.need = BI.ready ? null : (BI.powerMode ? 'eine FTP: Radeinheit von 20 bis 90 Minuten mit Wattmessung oder FTP im Profil eintragen' : 'mindestens 2 flache Ausfahrten über 45 Minuten in den letzten 90 Tagen (bisher ' + flat.length + ')');
    BI.eff = efficiency(bikes.filter(function (u) { return u.d >= D365 && u.sub !== 'indoor' && u.km && u.sec >= 1800 && u.hr && (u.elev || 0) / u.km <= 10; }), function (u) { return u.speed; }, 'speed', 0.3);
    if (BI.powerMode) BI.effW = efficiency(bikes.filter(function (u) { return u.d >= D365 && u.hr && (u.np || u.pow) && u.sec >= 1800; }), function (u) { return u.np || u.pow; }, 'watt', 0.4);

    /* ---------- Schwimmen im Detail ---------- */
    var SW = R.swim;
    SW.ready = !!SW.css;
    SW.need = SW.ready ? null : 'eine CSS: 400 m und 200 m Kraul auf Zeit im Profil eintragen oder eine Beckeneinheit ab 800 m';
    SW.swolf = monthly(swims.filter(function (u) { return u.d >= D365 && u.swolf && u.sub === 'pool'; }), function (u) { return u.swolf; }, 2);
    SW.paceM = monthly(swims.filter(function (u) { return u.d >= D365 && u.p100 && u.sub === 'pool' && u.km >= 0.4; }), function (u) { return u.p100; }, 2);

    /* ---------- Prognosen je Disziplin ---------- */
    BI.predFor = function (km, ifp, spdf, hm) {
      if (!BI.ready) return null;
      var mass = weight + 9, t;
      if (BI.powerMode) { var P = ifp * BI.ftp, v = M.bikeSpeed(P, mass, 0.32); t = km * 1000 / v + 0.5 * mass * 9.81 * (hm || 0) / P; }
      else t = km / (BI.baseSpeed * spdf) * 3600 + (hm || 0) * 0.9;
      return Math.round(t);
    };
    SW.predFor = function (m, f) { return SW.ready ? Math.round(m / 100 * SW.css * f) : null; };

    /* ---------- Rennen ---------- */
    (races || []).forEach(function (r) { r.goalBad = false; if (!r.goal) return; var min = r.kind === 'tri' ? { S: 2700, O: 5400, H: 13000, F: 26000 }[r.dist] : M.RUNDIST[r.dist].km * 140; if (r.goal < min * 0.8) { r.goalBad = r.goal; r.goal = null; } });
    var list = (races || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var future = list.filter(function (r) { return U.dn(r.date) >= realToday; });
    R.races = list;
    R.nextRace = future.filter(function (r) { return r.main; })[0] || future[0] || null;
    R.nextTri = future.filter(function (r) { return r.kind === 'tri'; })[0] || null;
    R.nextRun = future.filter(function (r) { return r.kind === 'run'; })[0] || null;

    /* ---------- Trainingsverteilung und Limiter (84 Tage) ---------- */
    var h84 = { swim: 0, bike: 0, run: 0 };
    all.forEach(function (u) { if (u.d >= D84 && h84[u.sport] != null) h84[u.sport] += u.sec / 3600; });
    R.h84 = h84; R.h84tot = h84.swim + h84.bike + h84.run;

    /* Koppeleinheiten: Lauf startet spätestens 20 Minuten nach Radende */
    R.bricks = [];
    bikes.forEach(function (b) {
      var end = Date.parse(b.ts + ':00Z') + b.sec * 1000;
      runs.forEach(function (r) { var st = Date.parse(r.ts + ':00Z'); if (st >= end - 120000 && st - end <= 20 * 60000) R.bricks.push({ bike: b, run: r }); });
    });

    /* ---------- Summen 12 Monate ---------- */
    var o12 = all.filter(function (u) { return u.d >= D365; });
    R.sum = { units: o12.length, h: U.sum(o12, function (u) { return u.sec / 3600; }), kcal: U.sum(o12, function (u) { return u.kcal || 0; }), elev: U.sum(o12, function (u) { return u.elev || 0; }) };
    M.SPORTS.forEach(function (s) {
      var x = o12.filter(function (u) { return u.sport === s; });
      R.sum[s] = { n: x.length, km: U.sum(x, function (u) { return u.km || 0; }), h: U.sum(x, function (u) { return u.sec / 3600; }), elev: U.sum(x, function (u) { return u.elev || 0; }) };
    });
    var act = {}; o12.forEach(function (u) { act[u.d] = 1; });
    var ad = Object.keys(act).map(Number).sort(function (a, b) { return a - b; }), best = 0, run_ = 0, end_ = null;
    ad.forEach(function (d, i) { run_ = i && d - ad[i - 1] === 1 ? run_ + 1 : 1; if (run_ > best) { best = run_; end_ = d; } });
    R.active = { days: ad.length, streak: best, streakEnd: end_ };
    if (M.extend) M.extend(R, opts);
    return R;
  };

  /* Effizienz: dichtestes 6-Schläge-Band, Monatsmediane und erstes gegen letztes Quartal */
  function efficiency(list, val, kind, tol) {
    if (list.length < 3) return { n: list.length, months: [], ready: false };
    var med = U.median(list.map(val));
    var clean = list.filter(function (u) { return Math.abs(val(u) / med - 1) <= tol; });
    var best = null, bc = -1;
    for (var b = 100; b < 190; b++) { var c = clean.filter(function (u) { return u.hr >= b && u.hr <= b + 5; }).length; if (c > bc) { bc = c; best = b; } }
    var band = clean.filter(function (u) { return u.hr >= best && u.hr <= best + 5; });
    var months = monthly(band, val, 3);
    var dmin = Math.min.apply(null, band.map(function (u) { return u.d; })), dmax = Math.max.apply(null, band.map(function (u) { return u.d; }));
    var early = band.filter(function (u) { return u.d < dmin + 91; }).map(val), late = band.filter(function (u) { return u.d > dmax - 91; }).map(val);
    return { n: band.length, lo: best, hi: best + 5, months: months, out: list.length - band.length, early: early.length >= 2 ? U.median(early) : null, late: late.length >= 2 ? U.median(late) : null, ready: months.length >= 2, kind: kind, pts: band };
  }
  function monthly(list, val, minN) {
    var g = {};
    list.forEach(function (u) { var m = U.monthOf(u.d); (g[m] = g[m] || []).push(val(u)); });
    return Object.keys(g).map(Number).sort(function (a, b) { return a - b; }).filter(function (m) { return g[m].length >= minN; }).map(function (m) { return { m: m, v: U.median(g[m]), n: g[m].length }; });
  }

  /* ---------- Wetter: WBGT-Aufschlag aufs Laufen ---------- */
  M.weatherCost = function (fitSec, vdot, tmax, td) {
    if (tmax == null || td == null || !vdot) return { sec: 0, wbgt: null };
    var T = tmax - 3.5, e = Math.min(6.112 * Math.exp(17.62 * td / (243.12 + td)), 6.112 * Math.exp(17.62 * T / (243.12 + T)));
    var wbgt = 0.567 * T + 0.393 * e + 3.94, niv = U.clamp(1 + (55 - vdot) * 0.045, 1, 2.8), dur = Math.pow(Math.min(fitSec / 3600 / 2.5, 1), 0.6);
    return { sec: Math.round(fitSec * 0.00363 * Math.max(wbgt - 15, 0) * niv * dur), wbgt: wbgt };
  };

  /* ---------- Rennprognose: Lauf ---------- */
  M.runRace = function (R, distKey, goal, race, wx) {
    var RU = R.run; if (!RU.vdot) return null;
    var D = M.RUNDIST[distKey], fit = RU.pred[distKey], w = M.weatherCost(fit, RU.vdot, wx && wx.tmax, wx && wx.td);
    var st = race && race.runHm ? Math.round(fit * (race.runHm / 100 * 450 / (D.km * 1000))) : 0;
    var rt = fit + w.sec + st, age = R.today - RU.vdotRun.d;
    var sd = rt * D.band * (age > 90 ? 1.25 : 1) * (RU.vdotRun.km < D.km / 4 ? 1.25 : 1);
    return { fit: fit, wx: w.sec, wbgt: w.wbgt, st: st, rt: rt, sd: sd, chance: goal ? Math.round(U.Phi((goal - rt) / sd) * 100) : null, age: age };
  };

  /* ---------- Rennprognose: Triathlon ---------- */
  M.triRace = function (R, key, race, wx) {
    var T = M.TRI[key], parts = {}, miss = [];
    var neo = race ? race.neo !== false : true;
    /* Schwimmen: CSS × Distanz × Ausdauerfaktor × Freiwasser (1,05) × Neo (0,95) */
    if (R.swim.ready) { var sw = R.swim.predFor(T.swim, T.swf * 1.05 * (neo ? 0.95 : 1)); parts.swim = { t: sw, sd: sw * (R.swim.cssSrc && R.swim.cssSrc.indexOf('geschätzt') === 0 ? 0.07 : 0.05) }; }
    else miss.push(['swim', R.swim.need]);
    /* Rad */
    if (R.bike.ready) { var bt = R.bike.predFor(T.bike, T.ifp, T.spd, race && race.bikeHm); parts.bike = { t: bt, sd: bt * (R.bike.powerMode ? 0.04 : 0.07) }; }
    else miss.push(['bike', R.bike.need]);
    /* Laufen: Prognose × Koppelfaktor + Wetter + Höhenmeter */
    if (R.run.vdot) {
      var flat = M.timeFor(T.run, R.run.vdotRaw), base = Math.round(flat * T.runf);
      var w = M.weatherCost(base, R.run.vdot, wx && wx.tmax, wx && wx.td);
      var st = race && race.runHm ? Math.round(base * (race.runHm / 100 * 450 / (T.run * 1000))) : 0;
      var rt = base + w.sec + st, age = R.today - R.run.vdotRun.d;
      parts.run = { t: rt, flat: flat, base: base, wx: w.sec, st: st, sd: rt * 0.05 * (age > 90 ? 1.25 : 1) };
    } else miss.push(['run', 'ein Lauf ab 3 km in den letzten 150 Tagen']);
    var t1 = race && race.t1 ? +race.t1 : T.t1, t2 = race && race.t2 ? +race.t2 : T.t2;
    parts.t1 = { t: t1, sd: t1 * 0.2 }; parts.t2 = { t: t2, sd: t2 * 0.2 };
    var out = { key: key, T: T, parts: parts, missing: miss, neo: neo };
    if (!miss.length) {
      out.total = parts.swim.t + t1 + parts.bike.t + t2 + parts.run.t;
      out.sd = Math.sqrt(['swim', 'bike', 'run', 't1', 't2'].reduce(function (s, k) { return s + parts[k].sd * parts[k].sd; }, 0));
      var goal = race && race.goal;
      out.chance = goal ? Math.round(U.Phi((goal - out.total) / out.sd) * 100) : null;
    }
    return out;
  };

  /* Rennanteile je Disziplin (für die Verteilung), aus Prognose oder typischen Werten */
  M.raceShare = function (key, tri) {
    var typ = { S: [0.19, 0.50, 0.31], O: [0.19, 0.48, 0.33], H: [0.12, 0.52, 0.36], F: [0.11, 0.53, 0.36] }[key];
    if (tri && tri.total) { var s = tri.parts.swim.t + tri.parts.bike.t + tri.parts.run.t; return { swim: tri.parts.swim.t / s, bike: tri.parts.bike.t / s, run: tri.parts.run.t / s, src: 'aus deiner Prognose' }; }
    return { swim: typ[0], bike: typ[1], run: typ[2], src: 'typische Verteilung' };
  };
})(window.TL = window.TL || {});
