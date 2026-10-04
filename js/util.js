/* TriLog · Grundwerkzeuge: Formatierung, Datum, DOM, Icons */
(function (TL) {
  'use strict';
  var THIN = ' ', MIN = '−';
  var U = TL.u = {};

  U.MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  U.MONL = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  U.WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  U.WDL = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

  /* Zahlen deutsch: Dezimalkomma, schmales Leerzeichen als Tausender, echtes Minus */
  U.num = function (x, dec, sign) {
    if (x == null || !isFinite(x)) return '–';
    dec = dec || 0;
    var s = Math.abs(x).toFixed(dec), p = s.split('.');
    var r = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, THIN) + (p[1] ? ',' + p[1] : '');
    var zero = Number(s) === 0;
    return (x < 0 && !zero ? MIN : (sign && !zero ? '+' : '')) + r;
  };
  U.big = function (s) { return U.esc(s).split(THIN).join('<span class="ts"></span>'); };
  U.pad = function (n) { return (n < 10 ? '0' : '') + n; };
  /* Dauer: 2:47:59 oder 46:02 */
  U.time = function (sec) {
    if (sec == null || !isFinite(sec)) return '–';
    sec = Math.round(sec);
    var neg = sec < 0; sec = Math.abs(sec);
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return (neg ? MIN : '') + (h ? h + ':' + U.pad(m) + ':' + U.pad(s) : m + ':' + U.pad(s));
  };
  /* Dauer in Stunden und Minuten: 3 h 20 min */
  U.hm = function (sec) {
    if (!sec) return '0 min';
    var m = Math.round(sec / 60), h = Math.floor(m / 60);
    return h ? h + ' h ' + (m % 60 ? (m % 60) + ' min' : '') : m + ' min';
  };
  U.pace = function (secPerUnit) { return secPerUnit && isFinite(secPerUnit) ? U.time(secPerUnit) : '–'; };
  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* Datum als Tagesnummer (UTC-Tage), damit Zeitumstellungen keine Tage verschlucken */
  U.dn = function (s) { var p = s.slice(0, 10).split('-'); return Date.UTC(+p[0], p[1] - 1, +p[2]) / 864e5; };
  U.ds = function (n) { var d = new Date(n * 864e5); return d.getUTCFullYear() + '-' + U.pad(d.getUTCMonth() + 1) + '-' + U.pad(d.getUTCDate()); };
  U.de = function (s, short) { if (typeof s === 'number') s = U.ds(s); var p = s.slice(0, 10).split('-'); return short ? p[2] + '.' + p[1] + '.' : p[2] + '.' + p[1] + '.' + p[0]; };
  U.wday = function (n) { return (new Date(n * 864e5).getUTCDay() + 6) % 7; };
  U.todayLocal = function () { var d = new Date(); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5; };
  U.monthOf = function (n) { var d = new Date(n * 864e5); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };
  U.monthLabel = function (m) { return U.MON[m % 12] + ' ' + Math.floor(m / 12); };

  U.median = function (a) { if (!a.length) return null; var b = a.slice().sort(function (x, y) { return x - y; }); var m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  U.mean = function (a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; };
  U.sum = function (a, f) { return a.reduce(function (s, x) { return s + (f ? f(x) : x) || s; }, 0); };
  U.clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  U.erf = function (x) { var s = x < 0 ? -1 : 1; x = Math.abs(x); var t = 1 / (1 + 0.3275911 * x); var y = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t; return s * (1 - y * Math.exp(-x * x)); };
  U.Phi = function (z) { return 0.5 * (1 + U.erf(z / Math.SQRT2)); };
  U.linreg = function (pts) {
    var n = pts.length; if (n < 2) return null;
    var sx = 0, sy = 0, sxx = 0, sxy = 0;
    pts.forEach(function (p) { sx += p[0]; sy += p[1]; sxx += p[0] * p[0]; sxy += p[0] * p[1]; });
    var d = n * sxx - sx * sx; if (!d) return null;
    var b = (n * sxy - sx * sy) / d; return { b: b, a: (sy - b * sx) / n };
  };

  /* DOM */
  U.el = function (tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) { if (attrs[k] == null) continue; if (k === 'cls') e.className = attrs[k]; else if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (html != null) e.innerHTML = html;
    return e;
  };
  U.NS = 'http://www.w3.org/2000/svg';
  U.sv = function (tag, attrs, text) { var e = document.createElementNS(U.NS, tag); for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; };
  U.$ = function (id) { return document.getElementById(id); };
  U.clear = function (e) { while (e.firstChild) e.removeChild(e.firstChild); return e; };

  /* Icons im Stil von SF Symbols: 24er Raster, Linie 1,8, runde Enden */
  var IC = {
    swim: '<path d="M3 17c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1"/><path d="M3 20.5c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1"/><circle cx="16.5" cy="7" r="1.8"/><path d="m6 13 4.5-4.5 3 3L16 10"/>',
    bike: '<circle cx="6" cy="16" r="3.6"/><circle cx="18" cy="16" r="3.6"/><path d="M6 16 9.5 9h6L18 16M9.5 9 12 16h2.5M14 6h2.5"/>',
    run: '<circle cx="14.5" cy="4.6" r="1.8"/><path d="m6 20.5 3.6-5 3 2.5v4M8 10.5l3-3h3l2.5 3.5H20M11 7.5 9 14.5"/>',
    tri: '<path d="M12 4 3.5 19h17z"/><path d="M8 13h8"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.6M12 18.6v2.6M4.4 5.4l1.8 1.8M17.8 16.8l1.8 1.8M2.8 12h2.6M18.6 12h2.6M4.4 18.6l1.8-1.8M17.8 7.2l1.8-1.8"/>',
    upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14"/>',
    save: '<path d="M5 4.5h11L19.5 8v11a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V6A1.5 1.5 0 0 1 6 4.5z"/><path d="M8 4.5v5h7v-5M8 20.5v-6h8v6"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.1"/>',
    flag: '<path d="M6 21V4"/><path d="M6 4.5h11l-2.5 4 2.5 4H6"/>',
    warn: '<path d="M12 4 3 19.5h18z"/><path d="M12 10v4.5M12 17.2v.1"/>',
    trend: '<path d="M4 17 9.5 11l3.5 3.5L20 7"/><path d="M15 7h5v5"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    heart: '<path d="M12 19.5s-7.5-4.3-7.5-9.6A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 2.3c0 5.3-7.5 9.6-7.5 9.6z"/>',
    bolt: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/>',
    mountain: '<path d="m3 19 6.5-11 4 6.5 2-3L21 19z"/>',
    cloud: '<path d="M7 18.5a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6 1.5A3.3 3.3 0 0 1 17 18.5z"/>',
    sigma: '<path d="M17 5H7l5.5 7L7 19h10"/>',
    gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="m12 17 4-5"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.1M4.5 12h.1M4.5 18h.1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    check: '<path d="m6 12.5 4 4 8-9"/>',
    trash: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    chev: '<path d="m9 6 6 6-6 6"/>',
    share: '<path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M6 11v8a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19v-8"/>',
    swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
    drop: '<path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
    book: '<path d="M5 4.5h9.5A2.5 2.5 0 0 1 17 7v13H7.5A2.5 2.5 0 0 1 5 17.5z"/><path d="M5 17.5A2.5 2.5 0 0 1 7.5 15H17M19 6v14"/>',
    home: '<path d="M4 11 12 4l8 7"/><path d="M6 9.5V20h12V9.5"/>',
    brick: '<rect x="3.5" y="6" width="17" height="5" rx="1.5"/><rect x="3.5" y="13" width="17" height="5" rx="1.5"/><path d="M12 6v5M8 13v5M16 13v5"/>'
  };
  U.ico = function (n, s, c) {
    s = s || 20;
    return '<svg class="ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="' + (c || 'currentColor') + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[n] || '') + '</svg>';
  };

  /* Tooltip, Texte immer per textContent */
  var tip;
  U.tip = function (e, title, rows) {
    if (!tip) { tip = U.el('div', { cls: 'tip', role: 'status' }); document.body.appendChild(tip); }
    U.clear(tip);
    tip.appendChild(U.el('div', { cls: 'd', text: title }));
    rows.forEach(function (r) {
      var row = U.el('div', { cls: 'r' });
      var i = U.el('i'); i.style.background = r[2] || 'currentColor';
      row.appendChild(i); row.appendChild(U.el('b', { text: r[0] })); row.appendChild(U.el('span', { text: r[1] || '' }));
      tip.appendChild(row);
    });
    tip.classList.add('on'); U.moveTip(e);
  };
  U.moveTip = function (e) {
    if (!tip) return;
    var x = e.clientX, y = e.clientY, w = tip.offsetWidth, h = tip.offsetHeight;
    var nx = x + 14, ny = y - h - 12;
    if (nx + w > innerWidth - 8) nx = x - w - 14;
    if (ny < 8) ny = y + 18;
    tip.style.left = Math.max(8, nx) + 'px'; tip.style.top = ny + 'px';
  };
  U.hideTip = function () { if (tip) tip.classList.remove('on'); };
  U.hover = function (node, fn) {
    node.addEventListener('pointermove', function (e) { var r = fn(e); if (r) U.tip(e, r[0], r[1]); });
    node.addEventListener('pointerleave', U.hideTip);
  };

  /* Unsichtbare Tabelle für Screenreader */
  U.srTable = function (host, caption, head, rows) {
    var w = U.el('div', { cls: 'sr' }), t = U.el('table');
    t.appendChild(U.el('caption', { text: caption }));
    var tr = U.el('tr'); head.forEach(function (h) { tr.appendChild(U.el('th', { text: h })); }); t.appendChild(tr);
    rows.forEach(function (r) { var tr = U.el('tr'); r.forEach(function (v) { tr.appendChild(U.el('td', { text: v })); }); t.appendChild(tr); });
    w.appendChild(t); host.appendChild(w);
  };

  /* Toast */
  var toastT;
  U.toast = function (msg, action) {
    var t = U.$('toast'); if (!t) return;
    U.clear(t); t.appendChild(U.el('span', { text: msg }));
    if (action) { var b = U.el('button', { cls: 'tbtn press', type: 'button', text: action[0] }); b.onclick = function () { t.classList.remove('on'); action[1](); }; t.appendChild(b); }
    t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, action ? 7000 : 3200);
  };

  U.MOTION = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
})(window.TL = window.TL || {});
