/* TriLog · Diagramme als SVG, gebaut aus den Daten, neu gezeichnet bei Größenänderung */
(function (TL) {
  'use strict';
  var U = TL.u, C = TL.chart = {};
  var sv = U.sv;
  function W(host) { return Math.max(260, host.clientWidth || 320); }
  function svgIn(host, h, label) {
    U.clear(host);
    var w = W(host), s = sv('svg', { class: 'chart', viewBox: '0 0 ' + w + ' ' + h, width: '100%', height: h, role: 'img', 'aria-label': label || '' });
    host.appendChild(s); return { s: s, w: w, h: h };
  }
  function txt(s, x, y, t, cls, anchor, style) { var e = sv('text', { x: x, y: y, class: cls || 'ax', 'text-anchor': anchor || 'start', style: style }, t); s.appendChild(e); return e; }
  function grid(s, x0, x1, y, label, fmt) { s.appendChild(sv('line', { class: 'gl', x1: x0, x2: x1, y1: y, y2: y })); if (label != null) txt(s, x0 - 6, y + 3.5, fmt ? fmt(label) : label, 'ax', 'end'); }
  function niceMax(v, step) { return Math.max(step, Math.ceil(v / step) * step); }
  function step(v) { v = v || 1; var e = Math.pow(10, Math.floor(Math.log10(v))), c = [1, 2, 2.5, 5, 10]; for (var i = 0; i < c.length; i++) if (c[i] * e >= v) return c[i] * e; return 10 * e; }
  C.drawn = {};
  function animOnce(key) { if (!U.MOTION || C.drawn[key]) return false; C.drawn[key] = 1; return true; }
  function grow(node, i) { node.style.transformBox = 'fill-box'; node.style.transformOrigin = 'bottom'; node.style.transform = 'scaleY(0)'; node.style.transition = 'transform .7s cubic-bezier(.34,1.26,.5,1) ' + Math.min(600, i * 12) + 'ms'; requestAnimationFrame(function () { requestAnimationFrame(function () { node.style.transform = ''; }); }); }
  function drawLine(p) { var L = p.getTotalLength ? p.getTotalLength() : 0; if (!L) return; p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.getBoundingClientRect(); p.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(.2,.9,.25,1)'; p.style.strokeDashoffset = 0; setTimeout(function () { p.style.strokeDasharray = ''; }, 1300); }
  function bar(x, y0, y, bw, r, style) {
    var hh = y0 - y; if (hh <= 0.4) return null; r = Math.min(r, hh, bw / 2);
    return sv('path', { d: 'M' + x + ' ' + y0 + 'V' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'H' + (x + bw - r) + 'Q' + (x + bw) + ' ' + y + ' ' + (x + bw) + ' ' + (y + r) + 'V' + y0 + 'Z', style: style });
  }

  /* ---------- Fitness, Ermüdung, Form (+ gestapelte Tageslast je Disziplin) ---------- */
  C.fitness = function (host, R, key, days, o) {
    o = o || {};
    var S = R.ser[key], N = S.fit.length, from = Math.max(0, N - days);
    var fit = S.fit.slice(from), fat = S.fat.slice(from), n = fit.length;
    var form = fit.map(function (f, i) { return f - fat[i]; });
    var g = svgIn(host, 300, 'Fitness, Ermüdung und Form'), s = g.s, w = g.w, ml = 30, mr = 46, mt = 14, top = 168, fb = 192, fh = 70;
    var ymax = niceMax(Math.max.apply(null, fit.concat(fat)) * 1.08, 10);
    function X(i) { return ml + (n > 1 ? i / (n - 1) : 0) * (w - ml - mr); }
    function Y(v) { return mt + (1 - v / ymax) * (top - mt); }
    for (var v = 0; v <= ymax; v += ymax > 60 ? 20 : 10) grid(s, ml, w - mr, Y(v), v);
    /* gestapelte Tageslast */
    if (o.stack) {
      var lmax = 0, loads = [];
      for (var i = 0; i < n; i++) { var st = o.stack.map(function (k) { return R.ser[k].load[from + i]; }); loads.push(st); lmax = Math.max(lmax, st.reduce(function (a, b) { return a + b; }, 0)); }
      var bw = Math.max(1, (w - ml - mr) / n * 0.7), sc = (top - mt) * 0.45 / (lmax || 1);
      loads.forEach(function (st, i) { var y = top; st.forEach(function (lv, k) { if (lv <= 0) return; var hh = lv * sc; s.appendChild(sv('rect', { x: X(i) - bw / 2, y: y - hh, width: bw, height: hh, style: 'fill:var(--c-' + o.stack[k] + ');opacity:.55' })); y -= hh; }); });
    }
    var defs = sv('defs', {}); var gid = 'gf' + key + Math.random().toString(36).slice(2, 6);
    defs.innerHTML = '<linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--acc);stop-opacity:.18"/><stop offset="1" style="stop-color:var(--acc);stop-opacity:0"/></linearGradient>';
    s.appendChild(defs);
    function path(a) { return a.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(''); }
    s.appendChild(sv('path', { d: path(fit) + 'L' + X(n - 1) + ' ' + Y(0) + 'L' + X(0) + ' ' + Y(0) + 'Z', fill: 'url(#' + gid + ')' }));
    var pa = sv('path', { d: path(fat), fill: 'none', style: 'stroke:var(--ink3);stroke-opacity:.6', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }); s.appendChild(pa);
    var pf = sv('path', { d: path(fit), fill: 'none', style: 'stroke:var(--acc)', 'stroke-width': 2.2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }); s.appendChild(pf);
    if (animOnce('fit' + key + days)) { drawLine(pf); drawLine(pa); }
    /* Rennen */
    (o.races || []).forEach(function (r, k) { var i = r.d - R.d0 - from; if (i < 0 || i >= n) return; var x = X(i); s.appendChild(sv('line', { x1: x, x2: x, y1: mt, y2: top, style: 'stroke:var(--ink)', 'stroke-opacity': .25 })); s.appendChild(sv('circle', { cx: x, cy: mt, r: 3, style: 'fill:var(--ink)' })); });
    /* Form-Säulen */
    var fmax = niceMax(Math.max.apply(null, form.map(Math.abs).concat([10])), 10), y0 = fb + fh / 2;
    function FY(v) { return y0 - v / fmax * (fh / 2); }
    txt(s, ml, fb - 6, 'Form');
    s.appendChild(sv('line', { x1: ml, x2: w - mr, y1: y0, y2: y0, style: 'stroke:var(--ink)', 'stroke-opacity': .2 }));
    var fbw = Math.max(1, (w - ml - mr) / n * 0.62);
    form.forEach(function (v, i) { var y = FY(v); s.appendChild(sv('rect', { x: X(i) - fbw / 2, y: Math.min(y, y0), width: fbw, height: Math.max(0.6, Math.abs(y - y0)), style: v >= 0 ? 'fill:var(--acc);opacity:.7' : 'fill:var(--neutral)' })); });
    txt(s, ml - 6, FY(fmax) + 4, U.num(fmax, 0, true), 'ax', 'end'); txt(s, ml - 6, FY(-fmax) + 4, U.num(-fmax, 0), 'ax', 'end');
    /* Monate */
    var lastX = -99; for (i = 0; i < n; i++) { var dd = new Date((R.d0 + from + i) * 864e5); if (dd.getUTCDate() === 1 && X(i) > ml + 8 && X(i) - lastX >= 30) { txt(s, X(i), 296, U.MON[dd.getUTCMonth()], 'ax', 'middle'); lastX = X(i); } }
    /* Endwerte direkt beschriften */
    var yf = Y(fit[n - 1]), ya = Y(fat[n - 1]); if (Math.abs(yf - ya) < 13) { if (yf <= ya) ya = yf + 13; else yf = ya + 13; }
    txt(s, X(n - 1) + 7, yf + 4, U.num(fit[n - 1], 0), 'lbl', 'start', 'fill:var(--acc-t)');
    txt(s, X(n - 1) + 7, ya + 4, U.num(fat[n - 1], 0), 'lbl', 'start', 'fill:var(--ink3)');
    txt(s, X(n - 1) + 7, FY(form[n - 1]) + 4, U.num(form[n - 1], 0, true), 'lbl', 'start', 'fill:var(--ink)');
    s.appendChild(sv('circle', { cx: X(n - 1), cy: Y(fit[n - 1]), r: 4, style: 'fill:var(--acc);stroke:var(--card)', 'stroke-width': 2 }));
    /* Fadenkreuz */
    var ch = sv('line', { y1: mt, y2: fb + fh, style: 'stroke:var(--ink)', 'stroke-opacity': 0 }); s.appendChild(ch);
    var hit = sv('rect', { x: ml, y: 0, width: w - ml - mr, height: 300, fill: 'transparent' }); s.appendChild(hit);
    U.hover(hit, function (e) {
      var r = s.getBoundingClientRect(), sx = (e.clientX - r.left) * w / r.width, i = Math.round((sx - ml) / (w - ml - mr) * (n - 1)); i = U.clamp(i, 0, n - 1);
      ch.setAttribute('x1', X(i)); ch.setAttribute('x2', X(i)); ch.setAttribute('stroke-opacity', .3);
      return [U.de(R.d0 + from + i), [[U.num(fit[i], 1), 'Fitness', 'var(--acc)'], [U.num(fat[i], 1), 'Ermüdung', 'var(--ink3)'], [U.num(form[i], 1, true), 'Form', 'var(--acc)'], [U.num(S.load[from + i], 0), 'Tageslast', 'var(--neutral)']]];
    });
    hit.addEventListener('pointerleave', function () { ch.setAttribute('stroke-opacity', 0); });
    var rows = []; for (i = 0; i < n; i += 7) rows.push([U.de(R.d0 + from + i), U.num(fit[i], 1), U.num(fat[i], 1), U.num(form[i], 1, true)]);
    U.srTable(host, 'Fitness, Ermüdung, Form wöchentlich', ['Datum', 'Fitness', 'Ermüdung', 'Form'], rows);
  };

  /* ---------- Wochensäulen, gestapelt oder einfach ---------- */
  C.weeks = function (host, weeks, o) {
    var g = svgIn(host, 230, o.label || 'Wochen'), s = g.s, w = g.w, ml = 32, mr = 10, mt = 22, mb = 22, h = 230;
    var tot = weeks.map(function (W) { return o.stack.reduce(function (a, k) { return a + o.val(W, k); }, 0); });
    var avg = weeks.map(function (W, i) { var p = tot.slice(Math.max(0, i - 4), i); return p.length === 4 ? U.mean(p) : null; });
    var mx = Math.max.apply(null, tot.concat(o.goal ? [o.goal] : []).concat([o.min || 1])) * 1.1, stp = step(mx / 4), ymax = niceMax(mx, stp);
    var n = weeks.length, slot = (w - ml - mr) / n, bw = Math.min(22, slot * 0.66);
    function X(i) { return ml + slot * (i + 0.5); } function Y(v) { return mt + (1 - v / ymax) * (h - mt - mb); }
    for (var v = 0; v <= ymax + 1e-9; v += stp) grid(s, ml, w - mr, Y(v), v, function (x) { return U.num(x, stp < 1 ? 1 : 0); });
    var an = animOnce('wk' + (o.key || '') + n);
    weeks.forEach(function (W, i) {
      var cur = i === n - 1, y = Y(0);
      if (cur) { var hh = Y(0) - Y(tot[i]); s.appendChild(sv('rect', { x: X(i) - bw / 2, y: Y(tot[i]), width: bw, height: Math.max(2, hh), rx: 4, style: 'fill:var(--acc-bg);stroke:var(--acc);stroke-dasharray:3 3' })); }
      else o.stack.forEach(function (k, j) {
        var v = o.val(W, k); if (v <= 0) return; var y1 = Y(0) - (Y(0) - Y(v)) - (Y(0) - y);
        var last = j === o.stack.length - 1 || o.stack.slice(j + 1).every(function (kk) { return o.val(W, kk) <= 0; });
        var node = last ? bar(X(i) - bw / 2, y, y1, bw, 5, 'fill:' + o.color(k, W, i)) : sv('rect', { x: X(i) - bw / 2, y: y1, width: bw, height: y - y1, style: 'fill:' + o.color(k, W, i) });
        if (node) { s.appendChild(node); if (an) grow(node, i); }
        y = y1;
      });
      if (o.mark && o.mark.i === i) txt(s, X(i), Y(tot[i]) - 6, o.mark.label, 'lbl', 'middle', 'fill:var(--acc-t)');
      var sd = W.start; for (var k = 0; k < 7; k++) { var dd = new Date((sd + k) * 864e5); if (dd.getUTCDate() === 1 && (n < 30 || dd.getUTCMonth() % 2 === 0)) txt(s, X(i), h - 6, U.MON[dd.getUTCMonth()], 'ax', 'middle'); }
      var hit = sv('rect', { x: X(i) - slot / 2, y: mt, width: slot, height: h - mt - mb, fill: 'transparent' }); s.appendChild(hit);
      U.hover(hit, function () { return ['Woche ab ' + U.de(W.start) + (cur ? ' · läuft' : ''), o.stack.map(function (k) { return [U.num(o.val(W, k), o.dec || 0) + ' ' + o.unit, o.names ? o.names[k] : '', o.color(k, W, i)]; }).concat(avg[i] != null ? [[U.num(avg[i], o.dec || 0) + ' ' + o.unit, 'Schnitt 4 Wochen davor', 'var(--ink)']] : [])]; });
    });
    var pa = ''; avg.forEach(function (a, i) { if (a == null) return; pa += (pa ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(a).toFixed(1); });
    if (pa) s.appendChild(sv('path', { d: pa, fill: 'none', style: 'stroke:var(--ink)', 'stroke-width': 1.5, 'pointer-events': 'none' }));
    if (o.goal) { s.appendChild(sv('line', { x1: ml, x2: w - mr, y1: Y(o.goal), y2: Y(o.goal), style: 'stroke:var(--acc)', 'stroke-width': 1, 'pointer-events': 'none' })); txt(s, ml + 4, Y(o.goal) - 5, 'Ziel ' + U.num(o.goal, o.dec || 0) + ' ' + o.unit, 'lbl', 'start', 'fill:var(--acc-t)'); }
    U.srTable(host, o.label || 'Wochen', ['Woche ab', o.unit], weeks.map(function (W, i) { return [U.de(W.start), U.num(tot[i], 1)]; }));
    return { tot: tot, avg: avg };
  };

  /* ---------- Monatslinie (z. B. Tempo bei gleichem Puls, CSS-Tempo, SWOLF) ---------- */
  C.months = function (host, pts, o) {
    var g = svgIn(host, 200, o.label), s = g.s, w = g.w, ml = 44, mr = 30, mt = 18, mb = 24, h = 200;
    if (!pts.length) return;
    var m0 = pts[0].m, m1 = pts[pts.length - 1].m; if (m1 === m0) { m0--; m1++; }
    var vs = pts.map(function (p) { return p.v; }), lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs), pad = Math.max((hi - lo) * 0.25, o.minPad || 1);
    lo -= pad; hi += pad;
    function X(m) { return ml + (m - m0) / (m1 - m0) * (w - ml - mr); }
    function Y(v) { var t = (v - lo) / (hi - lo); if (o.invert) t = 1 - t; return mt + (1 - t) * (h - mt - mb); }
    for (var k = 0; k <= 3; k++) { var v = lo + (hi - lo) * k / 3; grid(s, ml, w - mr, Y(v), o.fmt(v)); }
    if (o.axisNote) txt(s, ml, mt - 6, o.axisNote, 'ax');
    var defs = sv('defs', {}), gid = 'gm' + Math.random().toString(36).slice(2, 7);
    defs.innerHTML = '<linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--acc);stop-opacity:.16"/><stop offset="1" style="stop-color:var(--acc);stop-opacity:0"/></linearGradient>';
    s.appendChild(defs);
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p.m).toFixed(1) + ' ' + Y(p.v).toFixed(1); }).join('');
    s.appendChild(sv('path', { d: d + 'L' + X(pts[pts.length - 1].m) + ' ' + (h - mb) + 'L' + X(pts[0].m) + ' ' + (h - mb) + 'Z', fill: 'url(#' + gid + ')' }));
    var ln = sv('path', { d: d, fill: 'none', style: 'stroke:var(--acc)', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }); s.appendChild(ln);
    var reg = U.linreg(pts.map(function (p) { return [p.m, p.v]; }));
    if (reg && pts.length >= 3) s.appendChild(sv('line', { x1: X(pts[0].m), x2: X(pts[pts.length - 1].m), y1: Y(reg.a + reg.b * pts[0].m), y2: Y(reg.a + reg.b * pts[pts.length - 1].m), style: 'stroke:var(--ink3)', 'stroke-dasharray': '4 4', 'stroke-width': 1.2 }));
    pts.forEach(function (p, i) {
      var last = i === pts.length - 1, c = sv('circle', { cx: X(p.m), cy: Y(p.v), r: last ? 5.5 : 4.5, style: last ? 'fill:var(--acc);stroke:var(--card)' : 'fill:var(--card);stroke:var(--acc)', 'stroke-width': 2 });
      s.appendChild(c); U.hover(c, function () { return [U.monthLabel(p.m), [[o.fmt(p.v), o.name, 'var(--acc)'], [p.n + ' Einheiten', '']]]; });
      if (last) txt(s, X(p.m), Y(p.v) - 10, o.fmt(p.v), 'lbl', 'middle', 'fill:var(--acc-t)');
      txt(s, X(p.m), h - 6, U.MON[p.m % 12], 'ax', 'middle');
    });
    U.srTable(host, o.label, ['Monat', o.name], pts.map(function (p) { return [U.monthLabel(p.m), o.fmt(p.v)]; }));
  };

  /* ---------- Streudiagramm: Einheiten über Datum, mit Grenzlinie ---------- */
  C.scatter = function (host, pts, o) {
    var g = svgIn(host, 230, o.label), s = g.s, w = g.w, ml = 34, mr = 10, mt = 12, mb = 24, h = 230;
    var x0 = o.x0, x1 = o.x1, ys = pts.map(function (p) { return p.y; }).concat([o.line]);
    var y0 = Math.floor((Math.min.apply(null, ys) - 6) / 5) * 5, y1 = Math.ceil((Math.max.apply(null, ys) + 5) / 5) * 5;
    function X(d) { return ml + (d - x0) / Math.max(1, x1 - x0) * (w - ml - mr); } function Y(v) { return mt + (1 - (v - y0) / (y1 - y0)) * (h - mt - mb); }
    for (var v = y0; v <= y1; v += 5) grid(s, ml, w - mr, Y(v), v);
    s.appendChild(sv('rect', { x: ml, y: mt, width: w - ml - mr, height: Math.max(0, Y(o.line) - mt), style: 'fill:var(--acc-bg)', opacity: .7 }));
    s.appendChild(sv('line', { x1: ml, x2: w - mr, y1: Y(o.line), y2: Y(o.line), style: 'stroke:var(--acc)', 'stroke-width': 1.5 }));
    txt(s, w - mr - 4, mt + 14, o.lineLabel, 'lbl', 'end', 'fill:var(--acc-t)');
    for (var d = x0; d <= x1; d++) { var dt = new Date(d * 864e5); if (dt.getUTCDate() === 1) txt(s, X(d), h - 6, U.MON[dt.getUTCMonth()], 'ax', 'middle'); }
    pts.forEach(function (p) { var hi = p.y >= o.line, c = sv('circle', { cx: X(p.d), cy: Y(p.y), r: 6.5, style: (hi ? 'fill:var(--acc)' : 'fill:var(--neutral)') + ';stroke:var(--card)', 'stroke-width': 2 }); s.appendChild(c); U.hover(c, function () { return [U.de(p.d), p.rows]; }); });
    U.srTable(host, o.label, ['Datum', 'Wert'], pts.map(function (p) { return [U.de(p.d), String(p.y)]; }));
  };

  /* ---------- Zonenbalken (HTML) ---------- */
  C.zones = function (host, mins, ranges, names) {
    U.clear(host);
    var tot = mins.reduce(function (a, b) { return a + b; }, 0) || 1, pc = mins.map(function (m) { return m / tot * 100; });
    var bar = U.el('div', { cls: 'zbar' });
    pc.forEach(function (p, i) { var b = U.el('i'); b.style.flexGrow = p; b.style.background = 'var(--r' + (i + 1) + ')'; b.title = 'Z' + (i + 1) + ': ' + U.num(p, 1) + ' %'; bar.appendChild(b); });
    host.appendChild(bar);
    var lg = U.el('div', { cls: 'zleg' });
    pc.forEach(function (p, i) { lg.appendChild(U.el('div', null, '<span><i style="background:var(--r' + (i + 1) + ')"></i>' + U.esc(names ? names[i] : 'Z' + (i + 1)) + '</span><b>' + U.num(p, 1) + ' %</b><em>' + U.esc(ranges[i]) + '</em>')); });
    host.appendChild(lg);
    U.srTable(host, 'Zonenverteilung', ['Zone', 'Bereich', 'Anteil'], pc.map(function (p, i) { return ['Z' + (i + 1), ranges[i], U.num(p, 1) + ' %']; }));
    return pc;
  };

  /* ---------- Startzeiten: Wochentag × Stunde ---------- */
  C.punch = function (host, list) {
    var grid_ = []; for (var i = 0; i < 7; i++) { grid_.push(new Array(24).fill(0)); }
    list.forEach(function (u) { grid_[U.wday(u.d)][u.hour]++; });
    var mx = 0, mi = 0, mj = 0; for (i = 0; i < 7; i++) for (var j = 0; j < 24; j++) if (grid_[i][j] > mx) { mx = grid_[i][j]; mi = i; mj = j; }
    var w = W(host), ml = 24, cw = (w - ml - 2) / 24, rh = Math.max(18, Math.min(26, cw * 1.5)), h = 8 + 7 * rh + 18;
    var g = svgIn(host, h, 'Startzeiten nach Wochentag und Stunde'), s = g.s;
    for (i = 0; i < 7; i++) {
      txt(s, 0, 8 + i * rh + rh / 2 + 3.5, U.WD[i]);
      for (j = 0; j < 24; j++) {
        var v = grid_[i][j], cx = ml + j * cw + cw / 2, cy = 8 + i * rh + rh / 2, mr = Math.min(cw, rh) / 2 - 1;
        if (!v) { s.appendChild(sv('circle', { cx: cx, cy: cy, r: 1.4, style: 'fill:var(--track)' })); continue; }
        var best = i === mi && j === mj, c = sv('circle', { cx: cx, cy: cy, r: Math.max(2.8, mr * Math.sqrt(v / mx)), style: 'fill:var(--acc);' + (best ? 'stroke:var(--card)' : ''), 'fill-opacity': best ? 1 : 0.25 + 0.55 * v / mx, 'stroke-width': best ? 2 : 0 });
        (function (i, j, v) { U.hover(c, function () { return [U.WDL[i] + ', ' + j + ' Uhr', [[v + (v > 1 ? ' Einheiten' : ' Einheit'), 'Start', 'var(--acc)']]]; }); })(i, j, v);
        s.appendChild(c);
      }
    }
    [0, 6, 12, 18].forEach(function (j) { txt(s, ml + j * cw + cw / 2, h - 3, j + ' h', 'ax', 'middle'); });
    var rows = []; for (i = 0; i < 7; i++) for (j = 0; j < 24; j++) if (grid_[i][j]) rows.push([U.WD[i], j + ' Uhr', String(grid_[i][j])]);
    U.srTable(host, 'Startzeiten', ['Tag', 'Stunde', 'Anzahl'], rows);
    var pre9 = list.length ? list.filter(function (u) { return u.hour < 9; }).length / list.length * 100 : 0;
    return { pre9: pre9, top: mx ? [mi, mj, mx] : null };
  };

  /* ---------- Kalender: ein Kästchen je Tag ---------- */
  C.calendar = function (host, R, color) {
    var from = R.from, today = R.today, start = from - U.wday(from), nW = Math.floor((today - start) / 7) + 1;
    var w = W(host), cell = Math.min(14, Math.max(4, (w - 22) / nW - 2.5)), gap = cell < 8 ? 1.5 : 2.5, stp = cell + gap;
    var h = 14 + 7 * stp, g = svgIn(host, h, 'Kalender'), s = g.s;
    s.setAttribute('viewBox', '0 0 ' + (22 + nW * stp) + ' ' + h); s.style.maxWidth = (22 + nW * stp) + 'px';
    ['Mo', 'Mi', 'Fr'].forEach(function (l, i) { txt(s, 0, 14 + i * 2 * stp + cell * 0.8, l, 'ax', 'start', 'font-size:' + Math.min(10, cell * 0.85 + 1) + 'px'); });
    var by = {}; R.units.forEach(function (u) { if (u.d >= from) (by[u.d] = by[u.d] || []).push(u); });
    var lastM = -1;
    for (var d = from; d <= today; d++) {
      var c = Math.floor((d - start) / 7), r = U.wday(d), x = 22 + c * stp, y = 14 + r * stp, list = by[d] || [];
      var info = color(list);
      var rc = sv('rect', { x: x, y: y, width: cell, height: cell, rx: Math.min(3.5, cell / 3), style: 'fill:' + info.fill + (d === today ? ';stroke:var(--ink);stroke-width:1.5' : '') });
      (function (d, list, info) { U.hover(rc, function () { return [U.WDL[U.wday(d)] + ', ' + U.de(d), list.length ? list.map(function (u) { return [TL.model.SPORTNAME[u.sport], (u.km ? U.num(u.sport === 'swim' ? u.km * 1000 : u.km, u.sport === 'swim' ? 0 : 1) + (u.sport === 'swim' ? ' m' : ' km') + ' · ' : '') + U.hm(u.sec), 'var(--c-' + (['swim', 'bike', 'run'].indexOf(u.sport) >= 0 ? u.sport : 'other') + ')']; }) : [['Ruhetag', '', 'var(--track)']]]; }); })(d, list, info);
      s.appendChild(rc);
      var dt = new Date(d * 864e5); if (dt.getUTCDate() <= 7 && r === 0 && dt.getUTCMonth() !== lastM) { lastM = dt.getUTCMonth(); txt(s, x, 9, U.MON[lastM], 'ax', 'start', 'font-size:' + Math.min(10.5, cell * 0.85 + 2) + 'px'); }
    }
  };

  /* ---------- Halbkreis-Tacho für akut zu chronisch ---------- */
  C.gauge = function (host, val) {
    U.clear(host);
    var s = sv('svg', { class: 'gauge', viewBox: '0 0 240 138', role: 'img', 'aria-label': 'Akut zu chronisch ' + U.num(val, 2) });
    var cx = 120, cy = 120, r = 94;
    function pt(v, rr) { var t = Math.PI * (1 - (v - 0.4) / 1.6); return [cx + (rr || r) * Math.cos(t), cy - (rr || r) * Math.sin(t)]; }
    function arc(a, b, style, wd) { var p1 = pt(a), p2 = pt(b); return sv('path', { d: 'M' + p1[0] + ' ' + p1[1] + 'A' + r + ' ' + r + ' 0 0 1 ' + p2[0] + ' ' + p2[1], fill: 'none', style: style, 'stroke-width': wd || 13 }); }
    [[0.4, 0.8, 'stroke:var(--track)'], [0.806, 1.3, 'stroke:var(--acc-bg2)'], [1.306, 1.5, 'stroke:var(--warn-bg2)'], [1.506, 2.0, 'stroke:var(--warn-bg3)']].forEach(function (z) { s.appendChild(arc(z[0], z[1], z[2])); });
    if (val != null) { var v = U.clamp(val, 0.4, 2), a = arc(0.4, v, 'stroke:var(--acc)', 4); a.setAttribute('stroke-linecap', 'round'); s.appendChild(a); var p = pt(v); s.appendChild(sv('circle', { cx: p[0], cy: p[1], r: 7, style: 'fill:var(--acc);stroke:var(--card)', 'stroke-width': 2.5 })); }
    [[0.4, '0,4'], [0.8, '0,8'], [1.3, '1,3'], [2, '2,0']].forEach(function (l) { var p = pt(l[0], r + 14); s.appendChild(sv('text', { x: p[0], y: p[1] + 3, class: 'ax', 'text-anchor': 'middle' }, l[1])); });
    host.appendChild(s);
  };

  /* ---------- Glockenkurve der Renntagszeit ---------- */
  C.bell = function (host, rt, sd, goal) {
    var g = svgIn(host, 210, 'Verteilung möglicher Zielzeiten'), s = g.s, w = g.w, ml = 8, mr = 8, mt = 26, mb = 40, h = 210;
    var a = rt - 3.2 * sd, b = rt + 3.2 * sd;
    function X(t) { return ml + (t - a) / (b - a) * (w - ml - mr); } function pdf(t) { var z = (t - rt) / sd; return Math.exp(-z * z / 2); } function Y(p) { return mt + (1 - p) * (h - mt - mb); }
    var base = Y(0), N = 100, pts = [], i, t;
    for (i = 0; i <= N; i++) { t = a + (b - a) * i / N; pts.push(X(t).toFixed(1) + ' ' + Y(pdf(t)).toFixed(1)); }
    s.appendChild(sv('path', { d: 'M' + X(a) + ' ' + base + 'L' + pts.join('L') + 'L' + X(b) + ' ' + base + 'Z', style: 'fill:var(--track);stroke:var(--neutral)', 'stroke-width': 1.2 }));
    var gc = U.clamp(goal, a, b);
    if (gc > a) { var lp = []; for (i = 0; i <= N; i++) { t = a + (gc - a) * i / N; lp.push(X(t).toFixed(1) + ' ' + Y(pdf(t)).toFixed(1)); } s.appendChild(sv('path', { d: 'M' + X(a) + ' ' + base + 'L' + lp.join('L') + 'L' + X(gc) + ' ' + base + 'Z', style: 'fill:var(--acc);fill-opacity:.4;stroke:var(--acc)', 'stroke-width': 1.5 })); }
    s.appendChild(sv('line', { x1: ml, x2: w - mr, y1: base, y2: base, style: 'stroke:var(--ink)', 'stroke-opacity': .2 }));
    var span = b - a, maxT = Math.max(3, Math.floor(w / 70)), cand = [30, 60, 120, 300, 600, 900, 1800, 3600], st = cand.filter(function (c) { return span / c <= maxT; })[0] || 3600;
    function tl(t) { return t >= 3600 ? Math.floor(t / 3600) + ':' + U.pad(Math.round(t % 3600 / 60)) + ' h' : U.time(t); }
    for (t = Math.ceil(a / st) * st; t <= b; t += st) txt(s, X(t), base + 14, tl(t), 'ax', 'middle');
    var rx = X(rt); s.appendChild(sv('line', { x1: rx, x2: rx, y1: Y(1), y2: base, style: 'stroke:var(--ink)', 'stroke-dasharray': '4 4' }));
    txt(s, rx, base + 30, U.time(rt) + ' Prognose', 'lbl', 'middle', 'fill:var(--ink)');
    if (goal >= a && goal <= b) { var gx = X(goal); s.appendChild(sv('line', { x1: gx, x2: gx, y1: mt - 8, y2: base, style: 'stroke:var(--acc-t)', 'stroke-width': 2 })); txt(s, U.clamp(gx, 40, w - 40), mt - 12, 'Ziel ' + U.time(goal), 'lbl', 'middle', 'fill:var(--acc-t)'); }
    var hit = sv('rect', { x: ml, y: 0, width: w - ml - mr, height: base, fill: 'transparent' }); s.appendChild(hit);
    U.hover(hit, function (e) { var r = s.getBoundingClientRect(), sx = (e.clientX - r.left) * w / r.width, tt = Math.round((a + (sx - ml) / (w - ml - mr) * (b - a)) / 5) * 5; return [U.time(tt) + ' oder schneller', [[Math.round(U.Phi((tt - rt) / sd) * 100) + ' %', 'Chance', 'var(--acc)']]]; });
  };
})(window.TL = window.TL || {});

/* TriLog · 3D-Jahr und schnelle Glockenkurve */
(function (TL) {
  'use strict';
  var U = TL.u, C = TL.chart, sv = U.sv;
  function shade(hex, f) { /* f<0 dunkler, f>0 heller */
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255;
    function m(c) { return Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f); }
    return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
  }
  var COL = { swim: '#2A8BC0', bike: '#D5702A', run: '#2A8659' };
  /* Tageswerte je Sportart und Modus */
  C.dayValues = function (R, sports, mode) {
    var days = {}, from = R.from;
    R.units.forEach(function (u) {
      if (u.d < from || sports.indexOf(u.sport) < 0) return;
      var o = days[u.d] || (days[u.d] = {}), v = 0;
      if (mode === 'load') v = u.load || 0;
      else if (mode === 'hours') v = u.sec / 3600;
      else if (mode === 'perf') {
        v = u.sport === 'run' ? (u.vdot && u.km >= 3 ? u.vdot : 0) : u.sport === 'bike' ? ((u.np || u.pow) && R.bike.powerMode ? (u.np || u.pow) : (u.speed && u.sub !== 'indoor' && u.sec >= 1200 ? u.speed : 0)) : (u.p100 && u.km >= 0.2 ? 100 / u.p100 * 60 : 0);
        o[u.sport] = Math.max(o[u.sport] || 0, v); return;
      } else v = u.km ? (u.sport === 'swim' ? u.km * 1000 : u.km) : 0;
      o[u.sport] = (o[u.sport] || 0) + v;
    });
    var act = {}; R.units.forEach(function (u) { if (u.d >= from) act[u.d] = 1; });
    return { days: days, act: act };
  };
  C.skyline = function (svg, R, o) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var sports = o.sports, mode = o.mode, dv = C.dayValues(R, sports, mode), FROM = R.from, TODAY = R.today, start = FROM - U.wday(FROM);
    var stacked = sports.length > 1, maxV = 0, minV = 1e9, maxD = null;
    for (var d = FROM; d <= TODAY; d++) { var x = dv.days[d]; if (!x) continue; var t = 0; sports.forEach(function (s) { t += x[s] || 0; }); if (t > maxV) { maxV = t; maxD = d; } if (t > 0 && t < minV) minV = t; }
    var perf = mode === 'perf', base = perf ? Math.max(0, minV - (maxV - minV) * 0.15) : 0;
    function H(v) { if (v <= 0) return 0; return Math.max(2.5, (v - base) / Math.max(1e-9, maxV - base) * 128); }
    function P(u, v, h) { return [8.2 * u + 5.0 * v, -1.8 * u + 3.1 * v - h]; }
    var items = [], minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (d = FROM; d <= TODAY; d++) {
      var u = Math.floor((d - start) / 7), vv = 6 - U.wday(d), x2 = dv.days[d], segs = [], tot = 0;
      if (x2) sports.forEach(function (s) { if (x2[s] > 0) { segs.push([s, x2[s]]); tot += x2[s]; } });
      var h = H(tot);
      items.push({ d: d, u: u, v: vv, h: h, tot: tot, segs: segs, act: dv.act[d], max: d === maxD, raw: x2 });
      [[u + .17, vv + .17, h], [u + .83, vv + .83, 0], [u + .17, vv + .83, 0], [u + .83, vv + .17, h]].forEach(function (q) { var p = P(q[0], q[1], q[2]); minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); });
    }
    items.sort(function (a, b) { return (a.v - .61 * a.u) - (b.v - .61 * b.u); });
    var pad = 6; svg.setAttribute('viewBox', (minx - pad) + ' ' + (miny - 22) + ' ' + (maxx - minx + 2 * pad) + ' ' + (maxy - miny + 36));
    var nodes = [];
    var light = o.dark; /* dunkler Hintergrund: farbige Säulen; farbiger Hintergrund: helle Säulen */
    items.forEach(function (it) {
      var g = sv('g', {}); svg.appendChild(g);
      if (!it.h) { g.appendChild(sv('polygon', { points: [P(it.u + .17, it.v + .17, 0), P(it.u + .83, it.v + .17, 0), P(it.u + .83, it.v + .83, 0), P(it.u + .17, it.v + .83, 0)].join(' '), fill: '#fff', 'fill-opacity': it.act ? .2 : .085 })); return; }
      var parts = [], acc = 0;
      if (perf || !stacked) parts.push([sports[0], it.h]);
      else it.segs.forEach(function (sg) { parts.push([sg[0], it.h * sg[1] / it.tot]); });
      var h0 = 0;
      parts.forEach(function (p, k) {
        var col = light ? COL[p[0]] : null, top = k === parts.length - 1;
        var cs = it.max && !light ? ['#FFE8A3', '#F0C766', '#D4A33A'] : light ? [shade(col, 0.35), col, shade(col, -0.28)] : ['#FFFFFF', 'rgba(255,255,255,.62)', 'rgba(255,255,255,.4)'];
        if (it.max && light) cs = ['#FFE8A3', '#F0C766', '#D4A33A'];
        var L = sv('polygon', { fill: cs[1] }), F = sv('polygon', { fill: cs[2] }), T = top ? sv('polygon', { fill: cs[0] }) : null;
        g.appendChild(L); g.appendChild(F); if (T) g.appendChild(T);
        nodes.push({ it: it, L: L, F: F, T: T, h0: h0, h1: h0 + p[1] });
        h0 += p[1];
      });
      U.hover(g, function () {
        var rows = [];
        if (it.raw) sports.forEach(function (s) { var v = it.raw[s]; if (!v) return; rows.push([mode === 'load' ? U.num(v, 0) + ' Punkte' : mode === 'hours' ? U.hm(v * 3600) : perf ? (s === 'run' ? 'VDOT ' + U.num(v, 1) : s === 'bike' ? (R.bike.powerMode ? U.num(v, 0) + ' W' : U.num(v, 1) + ' km/h') : U.pace(6000 / v) + ' /100 m') : (s === 'swim' ? U.num(v, 0) + ' m' : U.num(v, 1) + ' km'), TL.model.SPORTNAME[s], 'var(--c-' + s + ')']); });
        return [U.WDL[U.wday(it.d)] + ', ' + U.de(it.d), rows];
      });
    });
    function setH(n, k) {
      var it = n.it, u = it.u, v = it.v, a = n.h0 * k, b = n.h1 * k;
      n.L.setAttribute('points', [P(u + .17, v + .17, a), P(u + .17, v + .83, a), P(u + .17, v + .83, b), P(u + .17, v + .17, b)].join(' '));
      n.F.setAttribute('points', [P(u + .17, v + .83, a), P(u + .83, v + .83, a), P(u + .83, v + .83, b), P(u + .17, v + .83, b)].join(' '));
      if (n.T) n.T.setAttribute('points', [P(u + .17, v + .17, b), P(u + .83, v + .17, b), P(u + .83, v + .83, b), P(u + .17, v + .83, b)].join(' '));
    }
    var seen = {};
    for (d = FROM; d <= TODAY; d++) { var dt = new Date(d * 864e5); if (dt.getUTCDate() === 1) { var key = dt.getUTCMonth() + '-' + dt.getUTCFullYear(); if (seen[key]) continue; seen[key] = 1; var uu = Math.floor((d - start) / 7), p = P(uu + .5, 7.9, 0); svg.appendChild(sv('text', { x: p[0], y: p[1] + 5, 'font-size': 7, fill: 'rgba(255,255,255,.65)', 'text-anchor': 'middle' }, U.MON[dt.getUTCMonth()])); } }
    var mx = items.filter(function (i) { return i.max; })[0];
    if (mx) {
      var tp = P(mx.u + .5, mx.v + .5, mx.h), lx = Math.min(tp[0] + 14, maxx - 40), ly = tp[1] - 10;
      svg.appendChild(sv('line', { x1: tp[0], y1: tp[1], x2: lx, y2: ly, stroke: 'rgba(255,255,255,.75)', 'stroke-width': .6 }));
      var lab = mode === 'load' ? U.num(maxV, 0) + ' Punkte' : mode === 'hours' ? U.hm(maxV * 3600) : perf ? (sports[0] === 'run' ? 'VDOT ' + U.num(maxV, 1) : sports[0] === 'bike' ? (R.bike.powerMode ? U.num(maxV, 0) + ' W' : U.num(maxV, 1) + ' km/h') : U.pace(6000 / maxV) + ' /100 m') : (sports[0] === 'swim' && !stacked ? U.num(maxV, 0) + ' m' : U.num(maxV, 1) + ' km');
      svg.appendChild(sv('text', { x: lx + 2, y: ly - 2, 'font-size': 8.5, 'font-weight': 700, fill: '#fff' }, lab));
      svg.appendChild(sv('text', { x: lx + 2, y: ly + 7, 'font-size': 6.5, fill: 'rgba(255,255,255,.75)' }, U.de(mx.d)));
    }
    var anim = o.animate && U.MOTION, maxU = Math.floor((TODAY - start) / 7) || 1;
    if (anim) {
      var t0 = performance.now();
      nodes.forEach(function (n) { setH(n, 0); });
      (function f(t) { var done = true; nodes.forEach(function (n) { var p = Math.min(1, Math.max(0, (t - t0 - n.it.u / maxU * 650) / 750)); if (p < 1) done = false; var q = p >= 1 ? 1 : 1 + 2.15 * Math.pow(p - 1, 3) + 1.15 * Math.pow(p - 1, 2); setH(n, q); }); if (!done) requestAnimationFrame(f); else nodes.forEach(function (n) { setH(n, 1); }); })(t0);
      setTimeout(function () { nodes.forEach(function (n) { setH(n, 1); }); }, 2500);
    } else nodes.forEach(function (n) { setH(n, 1); });
    return { max: maxV, min: minV === 1e9 ? 0 : minV, base: base };
  };

  /* Glockenkurve, die sich beim Ziehen nur teilweise neu zeichnet */
  C.bellLive = function (host, rt, sd) {
    U.clear(host);
    var w = Math.max(260, host.clientWidth || 320), h = 200, ml = 8, mr = 8, mt = 26, mb = 40;
    var s = sv('svg', { class: 'chart', viewBox: '0 0 ' + w + ' ' + h, width: '100%', height: h, role: 'img', 'aria-label': 'Verteilung möglicher Zielzeiten' }); host.appendChild(s);
    var a = rt - 3.2 * sd, b = rt + 3.2 * sd;
    function X(t) { return ml + (t - a) / (b - a) * (w - ml - mr); } function pdf(t) { var z = (t - rt) / sd; return Math.exp(-z * z / 2); } function Y(p) { return mt + (1 - p) * (h - mt - mb); }
    var base = Y(0), N = 90, pts = [], i, t;
    for (i = 0; i <= N; i++) { t = a + (b - a) * i / N; pts.push(X(t).toFixed(1) + ' ' + Y(pdf(t)).toFixed(1)); }
    s.appendChild(sv('path', { d: 'M' + X(a) + ' ' + base + 'L' + pts.join('L') + 'L' + X(b) + ' ' + base + 'Z', style: 'fill:var(--track);stroke:var(--neutral)', 'stroke-width': 1.2 }));
    var fill = sv('path', { style: 'fill:var(--acc);fill-opacity:.42;stroke:var(--acc)', 'stroke-width': 1.5 }); s.appendChild(fill);
    s.appendChild(sv('line', { x1: ml, x2: w - mr, y1: base, y2: base, style: 'stroke:var(--ink)', 'stroke-opacity': .2 }));
    var span = b - a, maxT = Math.max(3, Math.floor(w / 72)), cand = [15, 30, 60, 120, 300, 600, 900, 1800, 3600], st = cand.filter(function (c) { return span / c <= maxT; })[0] || 3600;
    function tl(t) { return t >= 3600 ? Math.floor(t / 3600) + ':' + U.pad(Math.floor(t % 3600 / 60)) + ' h' : U.time(t); }
    for (t = Math.ceil(a / st) * st; t <= b; t += st) s.appendChild(sv('text', { x: X(t), y: base + 14, class: 'ax', 'text-anchor': 'middle' }, tl(t)));
    var rx = X(rt); s.appendChild(sv('line', { x1: rx, x2: rx, y1: Y(1), y2: base, style: 'stroke:var(--ink)', 'stroke-dasharray': '4 4' }));
    s.appendChild(sv('text', { x: U.clamp(rx, 50, w - 50), y: base + 31, class: 'lbl', 'text-anchor': 'middle', style: 'fill:var(--ink)' }, U.time(rt) + ' Prognose'));
    var gl = sv('line', { y1: mt - 8, y2: base, style: 'stroke:var(--acc-t)', 'stroke-width': 2 }), gt = sv('text', { y: mt - 12, class: 'lbl', 'text-anchor': 'middle', style: 'fill:var(--acc-t)' }), gd = sv('circle', { r: 5, style: 'fill:var(--acc-t);stroke:var(--card)', 'stroke-width': 2 });
    s.appendChild(gl); s.appendChild(gd); s.appendChild(gt);
    var hit = sv('rect', { x: ml, y: 0, width: w - ml - mr, height: base, fill: 'transparent' }); s.appendChild(hit);
    U.hover(hit, function (e) { var r = s.getBoundingClientRect(), sx = (e.clientX - r.left) * w / r.width, tt = Math.round((a + (sx - ml) / (w - ml - mr) * (b - a)) / 5) * 5; return [U.time(tt) + ' oder schneller', [[Math.round(U.Phi((tt - rt) / sd) * 100) + ' %', 'Chance', 'var(--acc)']]]; });
    return {
      set: function (goal) {
        var gc = U.clamp(goal, a, b), lp = [];
        for (var i = 0; i <= 50; i++) { var t = a + (gc - a) * i / 50; lp.push(X(t).toFixed(1) + ' ' + Y(pdf(t)).toFixed(1)); }
        fill.setAttribute('d', gc > a ? 'M' + X(a) + ' ' + base + 'L' + lp.join('L') + 'L' + X(gc) + ' ' + base + 'Z' : '');
        var on = goal >= a && goal <= b, gx = X(gc);
        [gl, gd, gt].forEach(function (n) { n.style.display = on ? '' : 'none'; });
        gl.setAttribute('x1', gx); gl.setAttribute('x2', gx); gd.setAttribute('cx', gx); gd.setAttribute('cy', Y(pdf(gc)));
        gt.setAttribute('x', U.clamp(gx, 46, w - 46)); gt.textContent = 'Ziel ' + U.time(goal);
      }
    };
  };

  /* Waagrechte Balken (HTML) */
  C.hbars = function (host, rows, o) {
    U.clear(host); o = o || {};
    var mx = Math.max.apply(null, rows.map(function (r) { return r.v || 0; }).concat([o.max || 0, 1e-9]));
    rows.forEach(function (r) {
      var d = U.el('div', { cls: 'hbar' });
      d.innerHTML = '<span>' + U.esc(r.label) + '</span><div class="track"><i class="' + (r.cls || '') + '" style="width:' + (r.v ? Math.max(2, r.v / mx * 100) : 0) + '%"></i></div><b>' + U.esc(r.txt) + '</b>';
      host.appendChild(d);
    });
    U.srTable(host, o.label || 'Balken', ['Name', 'Wert'], rows.map(function (r) { return [r.label, r.txt]; }));
  };
})(window.TL = window.TL || {});
