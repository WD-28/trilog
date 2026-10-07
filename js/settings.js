/* TriLog · „Mehr“: Daten, Sicherung, Profil, Rennen, Wochenplan, Erklärungen */
(function (TL) {
  'use strict';
  var U = TL.u, M = TL.model, V = TL.views, S = TL.settings = {};
  var el = U.el, esc = U.esc, num = U.num;

  function parseTime(s) {
    s = String(s || '').trim(); if (!s) return null;
    var p = s.split(':').map(function (x) { return parseFloat(x.replace(',', '.')); });
    if (p.some(isNaN)) return null;
    while (p.length < 3) p.unshift(0);
    return Math.round(p[0] * 3600 + p[1] * 60 + p[2]);
  }
  S.parseTime = parseTime;
  function field(label, input, hint, infoKey) {
    var f = el('label', { cls: 'field' });
    var l = el('span', { cls: 'fl', text: label }); if (infoKey) l.appendChild(V.info(infoKey)); f.appendChild(l);
    f.appendChild(input); if (hint) f.appendChild(el('span', { cls: 'fh', text: hint }));
    return f;
  }
  /* Zeitfeld: Format sichtbar, Kontrolle beim Tippen, unplausible Werte blockieren das Speichern */
  function timeField(label, id, val, fmt, ctxFn, infoKey, note) {
    var i = inp(id, val ? U.time(val) : '', 'text', fmt === 'h' ? 'h:mm:ss' : 'm:ss', { inputmode: 'numeric', 'aria-describedby': id + '-h' });
    var f = field(label, i, null, infoKey), h = el('span', { cls: 'fh', id: id + '-h' }); f.appendChild(h);
    var base = (fmt === 'h' ? 'Stunden:Minuten:Sekunden, z. B. 1:40:00 für 1 Stunde 40 Minuten' : 'Minuten:Sekunden, z. B. 2:30') + (note ? '. ' + note : '');
    function check() {
      var r = M.checkTime(i.value, ctxFn());
      f.classList.toggle('err', !r.ok);
      h.className = 'fh' + (r.ok && !r.empty ? ' okh' : !r.ok ? ' errh' : '');
      h.textContent = r.empty ? base : r.ok ? r.txt : r.msg;
      return r;
    }
    i.addEventListener('input', check); f.check = check; f.input = i; setTimeout(check, 0);
    return f;
  }
  S.timeField = timeField;
  function inp(id, val, type, ph, extra) { var i = el('input', Object.assign({ id: id, type: type || 'text', value: val == null ? '' : val, placeholder: ph || '', autocomplete: 'off' }, extra || {})); return i; }
  function sel(id, opts, val) { var s = el('select', { id: id }); opts.forEach(function (o) { var op = el('option', { value: o[0], text: o[1] }); if (String(o[0]) === String(val)) op.selected = true; s.appendChild(op); }); return s; }
  function sec(id, title, sub) { var c = el('section', { cls: 'card', id: 'more-' + id }); c.appendChild(el('header', { cls: 'ch' }, '<div class="chw"><div class="cht"><h3>' + esc(title) + '</h3></div>' + (sub ? '<p class="sub">' + esc(sub) + '</p>' : '') + '</div>')); return c; }

  S.render = function (root, R, st) {
    root.appendChild(el('div', { cls: 'mhead' }, '<p class="kick">Einstellungen und Daten</p><h1>Mehr.</h1>'));
    var parts = [['daten', 'Daten', dataCard(R)], ['module', 'Module', modulesCard()], ['profil', 'Profil', profileCard(R)], ['rennen', 'Rennen', racesCard(R)], ['ausruestung', 'Ausrüstung', gearCard(R)], ['plan', 'Wochenplan', planEditor()], ['glossar', 'Erklärungen', glossar()], ['ueber', 'Über', about()]];
    parts.forEach(function (p) { var s2 = el('section', { cls: 'sec', id: 'more-' + p[0] }); s2.style.paddingTop = '22px'; s2.appendChild(p[2]); root.appendChild(s2); });
    if (st.moreSection) setTimeout(function () { var t = U.$('more-' + st.moreSection); if (t) t.scrollIntoView({ block: 'start' }); st.moreSection = null; }, 30);
    return parts.map(function (p) { return { id: 'more-' + p[0], title: p[1] }; });
  };

  /* ---------- Module ---------- */
  function modulesCard() {
    var c = sec('module', 'Module', 'Wähle, welche Disziplinen TriLog zeigt. Mit allen dreien gibt es die Triathlon-Seite, mit zweien eine Gesamtseite. Nicht gewählte Sportarten zählen weiter in Form und Belastung.');
    var p = TL.store.profile(), m = p.modules || { swim: true, bike: true, run: true };
    var g = el('div', { cls: 'toggles' });
    [['swim', 'Schwimmen', 'CSS, Technik, Freiwasser'], ['bike', 'Rad', 'FTP oder Tempo, Ausdauer, Koppeln'], ['run', 'Laufen', 'VDOT, Laufstil, Race Day']].forEach(function (x) {
      var t = el('label', { cls: 'tog' }); t.innerHTML = '<span class="sdot s-' + x[0] + '"></span><div><b>' + x[1] + '</b><span>' + x[2] + '</span></div><span class="sw"><input type="checkbox" id="mod-' + x[0] + '"' + (m[x[0]] !== false ? ' checked' : '') + '><i></i></span>';
      var cb = t.querySelector('input');
      cb.onchange = function () {
        var pp = TL.store.profile(), mm = pp.modules || { swim: true, bike: true, run: true }; mm[x[0]] = cb.checked;
        if (!mm.swim && !mm.bike && !mm.run) { cb.checked = true; U.toast('Mindestens eine Disziplin muss aktiv bleiben.'); return; }
        pp.modules = mm; TL.store.setProfile(pp); U.toast(cb.checked ? x[1] + ' eingeblendet.' : x[1] + ' ausgeblendet.'); TL.app.reload('mehr', true);
      };
      g.appendChild(t);
    });
    c.appendChild(g);
    return c;
  }

  /* ---------- Ausrüstung ---------- */
  var TYPES = [['shoe', 'Laufschuh'], ['bike', 'Rad'], ['chain', 'Kette'], ['tire', 'Reifen'], ['wetsuit', 'Neoprenanzug']];
  var DEFS = { shoe: [600, 800], chain: [3000, 5000], tire: [3000, 5000], bike: [null, null], wetsuit: [null, null] };
  function gearCard(R) {
    var c = sec('ausruestung', 'Ausrüstung', 'Schuhe, Räder und Verschleißteile mit Startdatum. TriLog ordnet die Kilometer nach Zeitraum und Sportart zu und erinnert dich an den Wechsel.');
    var list = TL.store.gear(), calc = {}; ((R && R.gear) || []).forEach(function (x) { calc[x.id] = x; });
    if (!list.length) c.appendChild(el('p', { cls: 'muted', text: 'Noch nichts angelegt.' }));
    list.forEach(function (x) {
      var k = calc[x.id] || {}, row = el('div', { cls: 'race' + (x.end ? ' past' : '') }), TY = TYPES.filter(function (t) { return t[0] === x.type; })[0][1];
      row.innerHTML = '<span class="sdot s-' + ({ shoe: 'run', bike: 'bike', chain: 'bike', tire: 'bike', wetsuit: 'swim' }[x.type]) + '"></span><div><b>' + esc(x.name) + (x.def ? ' <span class="chip acc">Standard</span>' : '') + (x.end ? ' <span class="chip">ausgemustert</span>' : '') + '</b><span>' + TY + ' · seit ' + (x.start ? U.de(x.start) : '–') + (x.type !== 'wetsuit' && k.km != null ? ' · ' + num(k.km, 0) + ' km' : '') + (k.max ? ' von ' + num(k.max, 0) : '') + '</span></div>';
      var ed = el('button', { cls: 'ibtn press', type: 'button', 'aria-label': 'Bearbeiten' }, U.ico('list', 16)); ed.onclick = function () { form.fill(x); form.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
      var rt = el('button', { cls: 'ibtn press', type: 'button', 'aria-label': x.end ? 'Wieder aktivieren' : 'Ausmustern', title: x.end ? 'Wieder aktivieren' : 'Ausmustern' }, U.ico(x.end ? 'plus' : 'x', 16)); rt.onclick = function () { var l = TL.store.gear(); l.forEach(function (y) { if (y.id === x.id) y.end = y.end ? null : U.ds(U.todayLocal()); }); TL.store.setGear(l); TL.app.reload('mehr', true); };
      var dl = el('button', { cls: 'ibtn press', type: 'button', 'aria-label': 'Löschen' }, U.ico('trash', 16)); dl.onclick = function () { TL.store.setGear(TL.store.gear().filter(function (y) { return y.id !== x.id; })); TL.app.reload('mehr', true); };
      row.appendChild(ed); row.appendChild(rt); row.appendChild(dl); c.appendChild(row);
    });
    var form = el('form', { cls: 'form gearform' }); form.appendChild(el('h4', { text: 'Ausrüstung hinzufügen' }));
    var g = el('div', { cls: 'fgrid' }), ty = sel('g-type', TYPES, 'shoe');
    var fw = inp('g-warn', '', 'number', '', { inputmode: 'numeric' }), fm = inp('g-max', '', 'number', '', { inputmode: 'numeric' });
    function ph() { var d = DEFS[ty.value]; fw.placeholder = d[0] ? String(d[0]) : '–'; fm.placeholder = d[1] ? String(d[1]) : '–'; fw.disabled = fm.disabled = !d[1]; }
    ty.onchange = ph;
    g.appendChild(field('Name', inp('g-name', '', 'text', 'z. B. Pegasus 41', { required: '' })));
    g.appendChild(field('Art', ty));
    g.appendChild(field('Im Einsatz seit', inp('g-start', '', 'date', '', { required: '' })));
    g.appendChild(field('Kilometer beim Start', inp('g-km0', '', 'number', '0', { inputmode: 'numeric' }), 'für gebrauchte Teile'));
    g.appendChild(field('Hinweis ab km', fw, 'leer = Richtwert', 'gear'));
    g.appendChild(field('Austausch ab km', fm, 'leer = Richtwert'));
    form.appendChild(g);
    form.appendChild(el('label', { cls: 'check' }, '<input type="checkbox" id="g-def"><span>Standard für diese Sportart (bei mehreren aktiven)</span>'));
    form.appendChild(el('p', { cls: 'foot', text: 'Richtwerte: Laufschuh Hinweis ab 600 km, Austausch ab 800 km (Carbon-Wettkampfschuhe eher 300–500 km). Kette und Reifen 3 000–5 000 km, genauer ist eine Kettenlehre. Neo: Prüfung nach rund vier Saisons. Faustregeln, entscheidend ist der Zustand.' }));
    var id = null;
    form.appendChild(el('button', { cls: 'tbtn primary press', type: 'submit' }, U.ico('check', 15) + '<span>Speichern</span>'));
    form.fill = function (x) { id = x.id; form.querySelector('h4').textContent = 'Ausrüstung bearbeiten'; U.$('g-name').value = x.name; ty.value = x.type; ph(); U.$('g-start').value = x.start || ''; U.$('g-km0').value = x.km0 || ''; fw.value = x.warn || ''; fm.value = x.max || ''; U.$('g-def').checked = !!x.def; };
    form.onsubmit = function (e) {
      e.preventDefault();
      var x = { id: id || 'g' + Date.now().toString(36), name: U.$('g-name').value.trim(), type: ty.value, start: U.$('g-start').value, km0: +U.$('g-km0').value || 0, warn: +fw.value || null, max: +fm.value || null, def: U.$('g-def').checked };
      if (!x.name || !x.start) { U.toast('Name und Startdatum fehlen.'); return; }
      if (x.warn && x.max && x.warn > x.max) { U.toast('Der Hinweis muss vor dem Austausch kommen.'); return; }
      var l = TL.store.gear(), old = l.filter(function (y) { return y.id === x.id; })[0]; if (old) x.end = old.end || null;
      if (x.def) l.forEach(function (y) { if (y.type === x.type) y.def = false; });
      l = l.filter(function (y) { return y.id !== x.id; }).concat([x]); TL.store.setGear(l); U.toast('Gespeichert.'); TL.app.reload('mehr', true);
    };
    ph(); c.appendChild(form);
    return c;
  }

  /* ---------- Daten und Sicherung ---------- */
  function dataCard(R) {
    var c = sec('daten', 'Daten', 'Deine Einheiten bleiben in diesem Browser auf diesem Gerät.');
    var units = TL.store.units(), meta = TL.store.meta();
    c.appendChild(el('div', { cls: 'tiles t3' }, '<div class="tile"><span class="l">Einheiten</span><span class="v num">' + U.big(num(units.length, 0)) + '</span></div><div class="tile"><span class="l">Von</span><span class="v num sm">' + (units.length ? U.de(units[0].ts) : '–') + '</span></div><div class="tile"><span class="l">Bis</span><span class="v num sm">' + (units.length ? U.de(units[units.length - 1].ts) : '–') + '</span></div>'));
    var drop = el('div', { cls: 'drop', tabindex: '0', role: 'button', 'aria-label': 'Garmin-CSV auswählen' }, U.ico('upload', 26) + '<b>Garmin-CSV importieren</b><span>Datei antippen oder hierher ziehen. Neue Einheiten werden ergänzt, doppelte erkannt.</span>');
    var fi = el('input', { type: 'file', id: 'csvin', accept: '.csv,text/csv', hidden: '' });
    drop.onclick = function () { fi.click(); }; drop.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); } };
    fi.onchange = function () { if (fi.files[0]) TL.app.importFile(fi.files[0]); fi.value = ''; };
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) TL.app.importFile(e.dataTransfer.files[0]); });
    c.appendChild(drop); c.appendChild(fi);
    var how = el('details', { cls: 'way' });
    how.innerHTML = '<summary>' + U.ico('info', 15) + 'So bekommst du die CSV aus Garmin</summary><ol><li>Garmin Connect am Rechner im Browser öffnen: connect.garmin.com → Aktivitäten → Alle Aktivitäten. In der Handy-App gibt es den Export nicht.</li><li>Nach unten scrollen, bis der gewünschte Zeitraum geladen ist. Garmin exportiert nur, was auf der Seite steht. Für Prognosen sind 12 Monate ideal.</li><li>Oben rechts „CSV exportieren“ klicken und die Datei hier importieren.</li><li>Später reicht ein Export der letzten Wochen, TriLog ergänzt nur Neues.</li></ol>';
    c.appendChild(how);
    var last = (meta.imports || []).slice(-1)[0];
    if (last) c.appendChild(el('p', { cls: 'foot', text: 'Letzter Import: ' + new Date(last.at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) + ' · ' + last.added + ' neue von ' + last.n + ' Einheiten.' }));

    /* Sicherung */
    var b = el('div', { cls: 'backup' });
    var st = backupState();
    b.innerHTML = '<div class="bk"><span class="bdot ' + st.cls + '"></span><div><b>' + esc(st.title) + '</b><span>' + esc(st.text) + '</span></div></div>';
    var row = el('div', { cls: 'brow' });
    row.appendChild(V.btn('Sicherung speichern', 'save', function () { S.saveBackup(); }, 'primary'));
    var ri = el('input', { type: 'file', id: 'bakin', accept: '.json,application/json', hidden: '' });
    ri.onchange = function () { var f = ri.files[0]; if (!f) return; f.text().then(function (t) { try { var n = TL.store.restore(t); U.toast('Sicherung geladen: ' + n + ' Einheiten.'); TL.app.reload(); } catch (e) { U.toast(e.message); } }); ri.value = ''; };
    row.appendChild(V.btn('Sicherung laden', 'upload', function () { ri.click(); }));
    row.appendChild(V.btn('Als Text kopieren', 'copy', function () { var t = TL.store.backup(); try { navigator.clipboard.writeText(t).then(function () { TL.store.markBackup(); U.toast('Sicherung in die Zwischenablage kopiert. Füge sie in eine Notiz ein.'); TL.app.renderHeader(); }, function () { U.toast('Kopieren wurde abgelehnt. Nutze „Sicherung speichern“.'); }); } catch (e) { U.toast('Kopieren nicht möglich. Nutze „Sicherung speichern“.'); } }));
    b.appendChild(row); b.appendChild(ri);
    b.appendChild(el('p', { cls: 'foot', text: 'Die Sicherung enthält Profil, Rennen, Wochenplan und alle importierten Einheiten. Am iPhone landet sie in der Dateien-App.' }));
    c.appendChild(b);
    /* Löschen mit zweitem Schritt */
    var del = V.btn('Alle Daten auf diesem Gerät löschen', 'trash', function () {
      if (del.classList.contains('arm')) { TL.store.clearAll(); U.toast('Alle Daten gelöscht.'); TL.app.reload(); return; }
      del.classList.add('arm'); del.querySelector('span').textContent = 'Wirklich löschen? Nochmal tippen'; setTimeout(function () { del.classList.remove('arm'); del.querySelector('span').textContent = 'Alle Daten auf diesem Gerät löschen'; }, 4000);
    }, 'danger');
    c.appendChild(del);
    return c;
  }
  function backupState() {
    var m = TL.store.meta(), units = TL.store.units().length;
    if (!units && !m.lastChange) return { cls: 'none', title: 'Noch nichts zu sichern', text: 'Importiere zuerst eine CSV.' };
    if (m.lastBackup && (!m.lastChange || m.lastBackup >= m.lastChange)) return { cls: 'ok', title: 'Gesichert', text: 'zuletzt am ' + new Date(m.lastBackup).toLocaleDateString('de-DE') };
    var days = m.lastChange ? Math.floor((Date.now() - m.lastChange) / 864e5) : 0;
    return { cls: 'due', title: 'Änderungen nicht gesichert', text: m.lastBackup ? 'letzte Sicherung am ' + new Date(m.lastBackup).toLocaleDateString('de-DE') : 'noch nie gesichert' + (days ? ' · seit ' + days + (days === 1 ? ' Tag' : ' Tagen') : '') };
  }
  S.backupState = backupState;
  S.saveBackup = function () {
    var t = TL.store.backup(), name = 'trilog-sicherung-' + U.ds(U.todayLocal()) + '.json';
    try {
      var blob = new Blob([t], { type: 'application/json' }), url = URL.createObjectURL(blob), a = el('a', { href: url, download: name });
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
      TL.store.markBackup(); U.toast('Sicherung gespeichert: ' + name); TL.app.renderHeader();
    } catch (e) { U.toast('Speichern nicht möglich. Nutze „Als Text kopieren“.'); }
  };

  /* ---------- Profil ---------- */
  function profileCard(R) {
    var p = TL.store.profile(), c = sec('profil', 'Profil', 'Alles optional. Leere Felder füllt TriLog aus deinen Daten.');
    var f = el('form', { cls: 'form' });
    var g = el('div', { cls: 'fgrid' });
    g.appendChild(field('Vorname', inp('p-name', p.name, 'text', 'für die Begrüßung')));
    g.appendChild(field('Gewicht', inp('p-weight', p.weight, 'number', 'kg', { inputmode: 'decimal', step: '0.1' }), R && R.assumed && R.assumed.weight ? 'angenommen: 75 kg' : 'für W/kg und Radprognose', 'wkg'));
    g.appendChild(field('Ruhepuls', inp('p-rest', p.rest, 'number', '50', { inputmode: 'numeric' }), R && R.rest ? 'aktuell ' + R.rest + (R.assumed.rest ? ' (angenommen)' : '') : '', 'rest'));
    g.appendChild(field('Maximalpuls', inp('p-hrmax', p.hrmax, 'number', R && R.hrmax ? String(R.hrmax) : '', { inputmode: 'numeric' }), R && R.hrmax ? 'aus den Daten: ' + R.hrmax : '', 'hrmax'));
    g.appendChild(field('Schwellenpuls Laufen', inp('p-lthrRun', p.lthrRun, 'number', R && R.run && R.run.lthr ? String(R.run.lthr) : '', { inputmode: 'numeric' }), R && R.run && R.run.lthrSrc ? R.run.lthrSrc : '', 'lthr'));
    g.appendChild(field('Schwellenpuls Rad', inp('p-lthrBike', p.lthrBike, 'number', R && R.bike && R.bike.lthr ? String(R.bike.lthr) : '', { inputmode: 'numeric' }), R && R.bike && R.bike.lthrSrc ? R.bike.lthrSrc : '', 'lthr'));
    g.appendChild(field('FTP', inp('p-ftp', p.ftp, 'number', R && R.bike && R.bike.ftp ? String(R.bike.ftp) : 'Watt', { inputmode: 'numeric' }), R && R.bike && R.bike.ftpSrc ? R.bike.ftpSrc : 'nur mit Powermeter', 'ftp'));
    g.appendChild(field('Wattmessung', sel('p-power', [['auto', 'Automatisch erkennen'], ['on', 'Mit Powermeter'], ['off', 'Ohne Powermeter']], p.power || 'auto'), '', 'power'));
    var fCss = timeField('CSS pro 100 m', 'p-css', p.css, 'm', function () { return { example: '2:05', what: 'eine CSS pro 100 m', min: 55, max: 300, hint: function () { return 'ein Wert zwischen 1:00 und 5:00'; }, extra: function (x) { return ' pro 100 m'; } }; }, 'css', 'Direkt eintragen oder unten aus einem Test');
    var fT4 = timeField('… oder Test 400 m Kraul', 'p-t400', p.t400, 'm', function () { return { example: '8:20', what: '400 m', min: 230, max: 1200, hint: function () { return 'eine Zeit zwischen 4:00 und 20:00'; } }; }, null, 'So schnell wie gleichmäßig möglich');
    var fT2 = timeField('Test 200 m Kraul', 'p-t200', p.t200, 'm', function () { return { example: '3:55', what: '200 m', min: 110, max: 600, hint: function () { return 'eine Zeit zwischen 2:00 und 10:00'; } }; }, null, 'Nach 5 bis 10 Minuten Pause');
    g.appendChild(fCss); g.appendChild(fT4); g.appendChild(fT2);
    f.appendChild(g);
    var sv = el('button', { cls: 'tbtn primary press', type: 'submit' }, U.ico('check', 15) + '<span>Profil speichern</span>'); f.appendChild(sv);
    f.onsubmit = function (e) {
      e.preventDefault();
      function v(id) { return U.$(id).value.trim(); }
      function n(id) { var x = parseFloat(v(id).replace(',', '.')); return isFinite(x) && x > 0 ? x : null; }
      var c1 = fCss.check(), c2 = fT4.check(), c3 = fT2.check();
      if (!c1.ok || !c2.ok || !c3.ok) { U.toast('Bitte die rot markierten Zeiten korrigieren.'); return; }
      if (c2.sec && c3.sec && c2.sec <= c3.sec) { U.toast('Die 400-m-Zeit muss länger sein als die 200-m-Zeit.'); return; }
      var old = TL.store.profile();
      var np = { modules: old.modules, name: v('p-name'), weight: n('p-weight'), rest: n('p-rest'), hrmax: n('p-hrmax'), lthrRun: n('p-lthrRun'), lthrBike: n('p-lthrBike'), ftp: n('p-ftp'), power: v('p-power'), css: c1.sec, t400: c2.sec, t200: c3.sec };
      TL.store.setProfile(np); U.toast('Profil gespeichert.'); TL.app.reload('mehr');
    };
    c.appendChild(f);
    return c;
  }

  /* ---------- Rennen ---------- */
  function racesCard(R) {
    var c = sec('rennen', 'Rennen', 'Das nächste Hauptrennen steht im Countdown. Für das Wetter sucht TriLog den Ort.');
    var list = TL.store.races().slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var today = U.todayLocal();
    if (!list.length) c.appendChild(el('p', { cls: 'muted', text: 'Noch kein Rennen eingetragen.' }));
    list.forEach(function (r) {
      var past = U.dn(r.date) < today, row = el('div', { cls: 'race' + (past ? ' past' : '') });
      row.innerHTML = '<span class="sdot ' + (r.kind === 'tri' ? 's-tri' : 's-run') + '"></span><div><b>' + esc(r.name) + (r.main ? ' <span class="chip acc">Hauptrennen</span>' : '') + '</b><span>' + U.de(r.date) + (r.ort ? ' · ' + esc(r.ort) : '') + ' · ' + (r.kind === 'tri' ? M.TRI[r.dist].name : M.RUNDIST[r.dist].name) + (r.goal ? ' · Ziel ' + U.time(r.goal) : '') + (r.lat ? '' : (r.ort ? ' · Ort nicht gefunden' : '')) + '</span></div>';
      var ed = el('button', { cls: 'ibtn press', type: 'button', 'aria-label': 'Bearbeiten' }, U.ico('list', 16)); ed.onclick = function () { form.fill(r); form.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
      var dl = el('button', { cls: 'ibtn press', type: 'button', 'aria-label': 'Löschen' }, U.ico('trash', 16)); dl.onclick = function () { TL.store.setRaces(TL.store.races().filter(function (x) { return x.id !== r.id; })); TL.app.reload('mehr'); };
      row.appendChild(ed); row.appendChild(dl); c.appendChild(row);
    });
    var form = raceForm(); c.appendChild(form);
    return c;
  }
  function raceForm() {
    var f = el('form', { cls: 'form raceform' });
    f.appendChild(el('h4', { text: 'Rennen hinzufügen' }));
    var g = el('div', { cls: 'fgrid' });
    var kind = sel('r-kind', [['tri', 'Triathlon'], ['run', 'Laufrennen']], 'tri');
    var dist = sel('r-dist', [], 'H');
    function fillDist(v) { U.clear(dist); (kind.value === 'tri' ? [['S', 'Sprint'], ['O', 'Olympisch'], ['H', '70.3'], ['F', '140.6']] : [['5', '5 km'], ['10', '10 km'], ['HM', 'Halbmarathon'], ['M', 'Marathon']]).forEach(function (o) { var op = el('option', { value: o[0], text: o[1] }); if (o[0] === v) op.selected = true; dist.appendChild(op); }); tri.hidden = kind.value !== 'tri'; }
    kind.onchange = function () { fillDist(kind.value === 'tri' ? 'H' : 'HM'); if (fGoal) fGoal.check(); };
    dist.onchange = function () { if (fGoal) fGoal.check(); };
    g.appendChild(field('Name', inp('r-name', '', 'text', 'z. B. Ironman 70.3 Rügen', { required: '' })));
    g.appendChild(field('Datum', inp('r-date', '', 'date', '', { required: '' })));
    g.appendChild(field('Ort', inp('r-ort', '', 'text', 'für das Wetter')));
    g.appendChild(field('Art', kind));
    g.appendChild(field('Distanz', dist));
    var fGoal = timeField('Zielzeit (optional)', 'r-goal', null, 'h', function () {
      var tri_ = kind.value === 'tri', km = tri_ ? null : M.RUNDIST[dist.value].km;
      var min = tri_ ? { S: 2700, O: 5400, H: 12600, F: 25200 }[dist.value] : km * 150, max = tri_ ? { S: 3 * 3600, O: 5 * 3600, H: 9 * 3600, F: 17 * 3600 }[dist.value] : km * 600;
      return { example: '1:40:00', what: tri_ ? 'einen ' + M.TRI[dist.value].name + '-Triathlon' : 'einen Lauf über ' + M.RUNDIST[dist.value].name, min: min, max: max, hint: function () { var p = fGoal.input.value.trim().split(':'); return p.length === 2 ? p[0] + ':' + U.pad(+p[1]) + ':00' : 'eine Zeit im Format h:mm:ss'; }, extra: function (x) { return tri_ ? '' : ' · Tempo ' + U.pace(x / km) + ' /km'; } };
    }, 'chance');
    g.appendChild(fGoal);
    g.appendChild(field('Höhenmeter Laufen', inp('r-runHm', '', 'number', '0', { inputmode: 'numeric' })));
    f.appendChild(g);
    var tri = el('div', { cls: 'fgrid' });
    tri.appendChild(field('Höhenmeter Rad', inp('r-bikeHm', '', 'number', '0', { inputmode: 'numeric' })));
    tri.appendChild(field('Neoprenanzug', sel('r-neo', [['1', 'erlaubt'], ['0', 'nicht erlaubt']], '1'), '', 'neo'));
    var wz = function () { return { example: '3:00', what: 'eine Wechselzone', min: 20, max: 1200, hint: function () { return 'eine Zeit zwischen 0:20 und 20:00'; } }; };
    var fT1 = timeField('Wechselzone 1 · Schwimmen → Rad', 'r-t1', null, 'm', wz, 't12', 'Leer lassen für den Richtwert der Distanz');
    var fT2r = timeField('Wechselzone 2 · Rad → Laufen', 'r-t2', null, 'm', wz, null, 'Leer lassen für den Richtwert der Distanz');
    tri.appendChild(fT1); tri.appendChild(fT2r);
    f.appendChild(tri);
    var main = el('label', { cls: 'check' }, '<input type="checkbox" id="r-main"><span>Hauptrennen</span>'); f.appendChild(main);
    fillDist('H');
    var id = null;
    var save = el('button', { cls: 'tbtn primary press', type: 'submit' }, U.ico('check', 15) + '<span>Rennen speichern</span>'); f.appendChild(save);
    f.fill = function (r) {
      id = r.id; f.querySelector('h4').textContent = 'Rennen bearbeiten';
      U.$('r-name').value = r.name; U.$('r-date').value = r.date; U.$('r-ort').value = r.ort || ''; kind.value = r.kind; fillDist(r.dist);
      U.$('r-goal').value = r.goal ? U.time(r.goal) : ''; U.$('r-runHm').value = r.runHm || ''; U.$('r-bikeHm').value = r.bikeHm || ''; U.$('r-neo').value = r.neo === false ? '0' : '1';
      U.$('r-t1').value = r.t1 ? U.time(r.t1) : ''; U.$('r-t2').value = r.t2 ? U.time(r.t2) : ''; U.$('r-main').checked = !!r.main;
      [fGoal, fT1, fT2r].forEach(function (x) { x.check(); });
    };
    f.onsubmit = function (e) {
      e.preventDefault();
      var list = TL.store.races(), old = list.filter(function (x) { return x.id === id; })[0] || {};
      var cg = fGoal.check(), c1 = fT1.check(), c2 = fT2r.check();
      if (!cg.ok || !c1.ok || !c2.ok) { U.toast('Bitte die rot markierten Zeiten korrigieren.'); return; }
      var r = { id: id || 'r' + Date.now().toString(36), name: U.$('r-name').value.trim(), date: U.$('r-date').value, ort: U.$('r-ort').value.trim(), kind: kind.value, dist: dist.value, goal: cg.sec, runHm: +U.$('r-runHm').value || 0, bikeHm: +U.$('r-bikeHm').value || 0, neo: U.$('r-neo').value === '1', t1: c1.sec, t2: c2.sec, main: U.$('r-main').checked };
      if (!r.name || !r.date) { U.toast('Name und Datum fehlen.'); return; }
      if (old.ort === r.ort && old.lat) { r.lat = old.lat; r.lon = old.lon; }
      if (r.main) list.forEach(function (x) { x.main = false; });
      list = list.filter(function (x) { return x.id !== r.id; }).concat([r]);
      TL.store.setRaces(list); U.toast('Rennen gespeichert.');
      if (r.ort && !r.lat) TL.app.geocode(r); else TL.app.reload('mehr');
    };
    return f;
  }

  /* ---------- Wochenplan ---------- */
  function planEditor() {
    var c = sec('plan', 'Wochenplan', 'Gilt für jede Woche, bis du ihn änderst. Schlüsseleinheiten sind „lang“ und „Koppel“.');
    var plan = JSON.parse(JSON.stringify(TL.store.plan() || {}));
    var wrap = el('div', { cls: 'plan-ed' }); c.appendChild(wrap);
    function draw() {
      U.clear(wrap);
      for (var i = 0; i < 7; i++) (function (i) {
        var day = el('div', { cls: 'pday-ed' }); day.appendChild(el('b', { text: U.WDL[i] }));
        var list = plan[i] = plan[i] || [];
        list.forEach(function (e, j) {
          var r = el('div', { cls: 'pentry' });
          var sp = sel('pe-s-' + i + '-' + j, [['swim', 'Schwimmen'], ['bike', 'Rad'], ['run', 'Laufen'], ['strength', 'Kraft'], ['rest', 'Ruhetag']], e.sport);
          var kd = sel('pe-k-' + i + '-' + j, [['locker', 'locker'], ['hart', 'hart'], ['lang', 'lang'], ['koppel', 'Koppel'], ['technik', 'Technik']], e.kind || 'locker');
          var am = inp('pe-a-' + i + '-' + j, e.amount || '', 'number', 'Menge', { inputmode: 'decimal', step: 'any' });
          var un = sel('pe-u-' + i + '-' + j, [['km', 'km'], ['m', 'm'], ['min', 'min']], e.unit || (e.sport === 'swim' ? 'm' : 'km'));
          sp.onchange = function () { e.sport = sp.value; if (sp.value === 'swim') { e.unit = 'm'; } draw(); };
          kd.onchange = function () { e.kind = kd.value; }; am.oninput = function () { e.amount = parseFloat(am.value.replace(',', '.')) || null; }; un.onchange = function () { e.unit = un.value; };
          var x = el('button', { cls: 'ibtn press', type: 'button', 'aria-label': 'Entfernen' }, U.ico('x', 15)); x.onclick = function () { list.splice(j, 1); draw(); };
          r.appendChild(sp); if (e.sport !== 'rest') { r.appendChild(kd); r.appendChild(am); r.appendChild(un); } r.appendChild(x);
          day.appendChild(r);
        });
        var add = el('button', { cls: 'tbtn press small', type: 'button' }, U.ico('plus', 14) + '<span>Einheit</span>'); add.onclick = function () { list.push({ sport: 'run', kind: 'locker', amount: null, unit: 'km' }); draw(); };
        day.appendChild(add); wrap.appendChild(day);
      })(i);
    }
    draw();
    var sv = V.btn('Wochenplan speichern', 'check', function () { TL.store.setPlan(plan); U.toast('Wochenplan gespeichert.'); TL.app.reload('mehr'); }, 'primary');
    c.appendChild(sv);
    return c;
  }

  /* ---------- Erklärungen ---------- */
  function glossar() {
    var c = sec('glossar', 'Erklärungen', 'Was jede Kennzahl misst und wozu sie dient');
    var keys = Object.keys(TL.GLOSSAR).sort(function (a, b) { return TL.GLOSSAR[a][0].localeCompare(TL.GLOSSAR[b][0], 'de'); });
    keys.forEach(function (k) { var g = TL.GLOSSAR[k], d = el('details', { cls: 'gl-item' }); d.innerHTML = '<summary>' + esc(g[0]) + U.ico('chev', 14) + '</summary><p><b>Was:</b> ' + esc(g[1]) + '</p><p><b>Wozu:</b> ' + esc(g[2]) + '</p>'; c.appendChild(d); });
    return c;
  }
  function about() {
    var c = sec('ueber', 'Über TriLog', 'Das Logbuch für Schwimmen, Rad und Laufen');
    c.appendChild(el('p', { cls: 'muted', text: 'TriLog liest deinen Garmin-Export und rechnet alles in deinem Browser. Deine Trainingsdaten verlassen dieses Gerät nicht. Nur für das Rennwetter fragt TriLog bei Open-Meteo nach Ort und Datum deines Rennens.' }));
    c.appendChild(el('p', { cls: 'muted', text: 'Safari am iPhone löscht gespeicherte Daten einer Webseite, wenn sie sieben Tage nicht geöffnet wurde. Leg TriLog deshalb auf den Home-Bildschirm (Teilen → Zum Home-Bildschirm) und sichere regelmäßig.' }));
    var cur = 'auto'; try { cur = localStorage.getItem('trilog.theme') || 'auto'; } catch (e) {}
    var th = el('div', { cls: 'pwrow' }); th.appendChild(el('span', { cls: 'l', text: 'Darstellung' }));
    th.appendChild(V.chips([['auto', 'Wie das Gerät'], ['light', 'Sepia'], ['dark', 'Dunkel']], cur, function (v) { try { if (v === 'auto') localStorage.removeItem('trilog.theme'); else localStorage.setItem('trilog.theme', v); } catch (e) {} if (v === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', v); TL.app.reload('mehr'); }));
    c.appendChild(th);
    var ob = V.btn('Einführung erneut zeigen', 'info', function () { TL.app.onboarding(true); }); c.appendChild(ob);
    c.appendChild(el('p', { cls: 'foot', text: 'TriLog 1.0 · Prognosen sind Modelle, keine Garantie, und ersetzen keine medizinische Beratung.' }));
    return c;
  }
})(window.TL = window.TL || {});
