/* TriLog · Garmin-CSV einlesen (deutsch und englisch), normalisieren, speichern */
(function (TL) {
  'use strict';
  var U = TL.u;

  /* ---------- CSV-Zerlegung mit Anführungszeichen ---------- */
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    var first = text.slice(0, text.indexOf('\n') > 0 ? text.indexOf('\n') : text.length);
    var sep = (first.split(';').length > first.split(',').length) ? ';' : ',';
    var rows = [], row = [], f = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"') q = true;
      else if (c === sep) { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(f); f = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = [];
      } else f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows;
  }

  /* ---------- Spalten erkennen: Namen vereinfachen, dann gegen Liste prüfen ---------- */
  function norm(h) { return String(h).toLowerCase().replace(/[ø®©™]/g, '').replace(/[^a-zäöüß0-9]/g, ''); }
  var COLS = {
    type: ['aktivitätstyp', 'activitytype', 'sportart', 'type'],
    date: ['datum', 'date', 'startzeit', 'starttime'],
    title: ['titel', 'title', 'name', 'activityname'],
    dist: ['distanz', 'distance'],
    kcal: ['kalorien', 'calories'],
    time: ['zeit', 'time', 'dauer', 'duration'],
    moving: ['zeitinbewegung', 'movingtime'],
    elapsed: ['verstrichenezeit', 'elapsedtime'],
    hr: ['herzfrequenz', 'avghr', 'durchschnittlicheherzfrequenz', 'averageheartrate', 'avgheartrate'],
    hrmax: ['maximaleherzfrequenz', 'maxhr', 'maxheartrate'],
    runcad: ['schrittfrequenzlaufen', 'avgruncadence'],
    bikecad: ['trittfrequenzrad', 'avgbikecadence', 'trittfrequenz', 'radtrittfrequenz', 'avgcadence'],
    ascent: ['anstieggesamt', 'totalascent', 'anstieg', 'elevationgain'],
    np: ['normalizedpowernp', 'normalizedpower', 'np'],
    tss: ['trainingstressscore', 'tss'],
    pow: ['leistung', 'avgpower', 'durchschnittlicheleistung'],
    powmax: ['maxleistung', 'maxpower'],
    strokes: ['schlägeinsgesamt', 'totalstrokes'],
    swolf: ['swolf', 'avgswolf'],
    srate: ['schlagrate', 'avgstrokerate'],
    steps: ['schritte', 'steps'],
    laps: ['anzahlderrunden', 'numberoflaps'],
    sap: ['durchschnittlichesap', 'avggap', 'sap', 'gap'],
    stride: ['schrittlänge', 'avgstridelength'],
    vr: ['durchschnittlichesvertikalesverhältnis', 'vertikalesverhältnis', 'avgverticalratio'],
    vo: ['vertikalebewegung', 'avgverticaloscillation'],
    gct: ['bodenkontaktzeit', 'avggroundcontacttime'],
    bb: ['bodybatteryabnahme', 'bodybatterydrain'],
    tmin: ['minimaletemperatur', 'mintemp'],
    tmax: ['maximaletemperatur', 'maxtemp'],
    te: ['aerobete', 'aerobicte'],
    reps: ['wiederholungeninsgesamt', 'totalreps'],
    sets: ['sätzeinsgesamt', 'totalsets']
  };
  function mapCols(header) {
    var n = header.map(norm), map = {};
    Object.keys(COLS).forEach(function (k) {
      for (var i = 0; i < COLS[k].length; i++) {
        var idx = n.indexOf(COLS[k][i]);
        if (idx >= 0 && Object.keys(map).map(function (x) { return map[x]; }).indexOf(idx) < 0) { map[k] = idx; return; }
      }
    });
    return map;
  }

  /* ---------- Zahlen: Dezimalpunkt oder Dezimalkomma je Datei erkennen ---------- */
  function detectComma(rows, map) {
    var dot = 0, comma = 0;
    ['dist', 'kcal', 'pow', 'np', 'tss'].forEach(function (k) {
      if (map[k] == null) return;
      rows.forEach(function (r) {
        var v = String(r[map[k]] || '').trim();
        if (/^\d+\.\d{1,2}$/.test(v)) dot++;
        else if (/^\d+,\d{1,2}$/.test(v)) comma++;
      });
    });
    return comma > dot;
  }
  function num(v, comma) {
    if (v == null) return null;
    var s = String(v).trim().replace(/^'/, '').replace(/\s/g, '');
    if (!s || s === '--' || s === '-') return null;
    if (comma) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, '');
    var x = parseFloat(s); return isFinite(x) ? x : null;
  }
  function dur(v) {
    if (v == null) return null;
    var s = String(v).trim();
    if (!s || s === '--') return null;
    if (/^\d+([.,]\d+)?$/.test(s)) return parseFloat(s.replace(',', '.'));
    var p = s.replace(',', '.').split(':').map(parseFloat);
    if (p.some(isNaN)) return null;
    while (p.length < 3) p.unshift(0);
    return p[0] * 3600 + p[1] * 60 + p[2];
  }
  /* Datum: Garmin liefert Ortszeit "2026-09-30 18:19:29", seltener "30.09.2026 18:19" */
  function date(v) {
    var s = String(v || '').trim(), m;
    if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/))) return m[1] + '-' + m[2] + '-' + m[3] + 'T' + U.pad(+m[4]) + ':' + m[5];
    if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) return m[1] + '-' + m[2] + '-' + m[3] + 'T12:00';
    if ((m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})/))) return m[3] + '-' + U.pad(+m[2]) + '-' + U.pad(+m[1]) + 'T' + U.pad(+m[4]) + ':' + m[5];
    var d = new Date(s); if (!isNaN(d)) return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate()) + 'T' + U.pad(d.getHours()) + ':' + U.pad(d.getMinutes());
    return null;
  }

  /* ---------- Sportart zuordnen ---------- */
  function classify(t) {
    var s = String(t || '').toLowerCase();
    if (/triathlon|multisport|duathlon|aquathlon/.test(s)) return ['multi', ''];
    if (/schwimm|swim|freiwasser|open ?water/.test(s)) return ['swim', /freiwasser|open/.test(s) ? 'open' : 'pool'];
    if (/lauf|run|jogg|trail/.test(s)) return ['run', /trail|berg/.test(s) ? 'trail' : (/band|treadmill|indoor/.test(s) ? 'treadmill' : '')];
    if (/rad|bike|cycl|velo|zwift|gravel|rennrad|spinning/.test(s)) return ['bike', /indoor|rolle|virtual|zwift|trainer|spinning/.test(s) ? 'indoor' : ''];
    if (/kraft|strength|gewicht|hiit|krafttraining|gym/.test(s)) return ['strength', ''];
    if (/geh|wander|walk|hik/.test(s)) return ['walk', ''];
    return ['other', ''];
  }

  /* ---------- Datei → Einheiten ---------- */
  TL.importCSV = function (text) {
    var rows = parseCSV(text);
    if (rows.length < 2) throw new Error('Die Datei enthält keine Aktivitäten.');
    var map = mapCols(rows[0]);
    if (map.type == null || map.date == null || (map.time == null && map.moving == null)) throw new Error('Das sieht nicht nach einem Garmin-Aktivitätenexport aus: Spalten für Typ, Datum oder Zeit fehlen.');
    var body = rows.slice(1), comma = detectComma(body, map), out = [], skipped = 0;
    body.forEach(function (r) {
      function g(k) { return map[k] == null ? null : r[map[k]]; }
      var ts = date(g('date')); if (!ts) { skipped++; return; }
      var cls = classify(g('type'));
      var dist = num(g('dist'), comma);
      var km = null;
      if (dist != null && dist > 0) km = cls[0] === 'swim' ? (dist >= 25 ? dist / 1000 : dist) : dist;
      var mv = dur(g('moving')), tt = dur(g('time')), el = dur(g('elapsed'));
      var sec = (mv && mv > 0) ? mv : (tt && tt > 0 ? tt : el);
      if (!sec || sec < 60) { skipped++; return; }
      var hr = num(g('hr'), comma), np = num(g('np'), comma), pw = num(g('pow'), comma), tss = num(g('tss'), comma);
      var u = {
        ts: ts, sport: cls[0], sub: cls[1], type: String(g('type') || ''), name: String(g('title') || g('type') || '').trim(),
        km: km, sec: Math.round(sec), hr: hr && hr > 30 ? Math.round(hr) : null, hrmax: num(g('hrmax'), comma),
        elev: num(g('ascent'), comma), kcal: num(g('kcal'), comma), steps: num(g('steps'), comma),
        cad: cls[0] === 'run' ? num(g('runcad'), comma) : (cls[0] === 'bike' ? num(g('bikecad'), comma) : null),
        pow: cls[0] === 'bike' && pw ? pw : null, np: cls[0] === 'bike' && np ? np : null, tss: tss && tss > 0 ? tss : null,
        swolf: num(g('swolf'), comma), srate: num(g('srate'), comma), strokes: num(g('strokes'), comma),
        rpow: cls[0] === 'run' && pw ? pw : null, rnp: cls[0] === 'run' && np ? np : null,
        sap: cls[0] === 'run' ? dur(g('sap')) : null, stride: num(g('stride'), comma), vr: num(g('vr'), comma), vo: num(g('vo'), comma), gct: num(g('gct'), comma),
        bb: (function (b) { return b == null ? null : Math.abs(b); })(num(g('bb'), comma)), tmin: num(g('tmin'), comma), tmax: num(g('tmax'), comma), te: num(g('te'), comma),
        reps: num(g('reps'), comma), sets: num(g('sets'), comma)
      };
      if (u.sap && (u.sap < 150 || u.sap > 1200)) u.sap = null;
      if (u.sport === 'run' && u.cad && u.cad < 120) u.cad *= 2;
      u.id = u.ts + '|' + u.sport + '|' + (u.km ? u.km.toFixed(2) : '') + '|' + u.sec;
      out.push(u);
    });
    return { units: out, skipped: skipped, comma: comma };
  };

  /* ---------- Speicher im Browser ---------- */
  var K = 'trilog.v1.';
  function load(k, d) { try { var v = localStorage.getItem(K + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(K + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  TL.store = {
    ok: (function () { try { localStorage.setItem(K + 'probe', '1'); localStorage.removeItem(K + 'probe'); return true; } catch (e) { return false; } })(),
    units: function () { return load('units', []); },
    profile: function () { return load('profile', {}); },
    races: function () { return load('races', []); },
    plan: function () { return load('plan', {}); },
    gear: function () { return load('gear', []); },
    setGear: function (g) { save('gear', g); TL.store.touch(); },
    assign: function () { return load('assign', {}); },
    setAssign: function (a) { save('assign', a); TL.store.touch(); },
    meta: function () { return load('meta', { lastBackup: null, lastChange: null, onboarded: false, imports: [] }); },
    setMeta: function (m) { save('meta', m); },
    touch: function () { var m = TL.store.meta(); m.lastChange = Date.now(); save('meta', m); },
    setProfile: function (p) { save('profile', p); TL.store.touch(); },
    setRaces: function (r) { save('races', r); TL.store.touch(); },
    setPlan: function (p) { save('plan', p); TL.store.touch(); },
    merge: function (list) {
      var cur = TL.store.units(), ids = {}, added = 0;
      cur.forEach(function (u) { ids[u.id] = 1; });
      list.forEach(function (u) { if (!ids[u.id]) { cur.push(u); ids[u.id] = 1; added++; } });
      cur.sort(function (a, b) { return a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0; });
      var ok = save('units', cur);
      var m = TL.store.meta(); m.imports = (m.imports || []).concat([{ at: Date.now(), n: list.length, added: added }]).slice(-20); m.lastChange = Date.now(); save('meta', m);
      return { added: added, total: cur.length, saved: ok };
    },
    clearAll: function () { ['units', 'profile', 'races', 'plan', 'meta', 'gear', 'assign'].forEach(function (k) { try { localStorage.removeItem(K + k); } catch (e) {} }); },
    backup: function () {
      return JSON.stringify({ app: 'TriLog', version: 1, created: new Date().toISOString(), profile: TL.store.profile(), races: TL.store.races(), plan: TL.store.plan(), gear: TL.store.gear(), assign: TL.store.assign(), units: TL.store.units() });
    },
    restore: function (text) {
      var b = JSON.parse(text);
      if (!b || b.app !== 'TriLog') throw new Error('Das ist keine TriLog-Sicherung.');
      save('profile', b.profile || {}); save('races', b.races || []); save('plan', b.plan || {}); save('gear', b.gear || []); save('assign', b.assign || {});
      if (b.units) save('units', b.units);
      var m = TL.store.meta(); m.lastBackup = Date.now(); m.lastChange = Date.now() - 1; m.onboarded = true; save('meta', m);
      return (b.units || []).length;
    },
    markBackup: function () { var m = TL.store.meta(); m.lastBackup = Date.now(); save('meta', m); }
  };
})(window.TL = window.TL || {});
