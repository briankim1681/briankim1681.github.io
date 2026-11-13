/* Brian Kim — portfolio interactions (vanilla, no dependencies)
   1. footer year + active top-bar link
   2. background: ASCII contour field (a drifting height map drawn as -, |, /, \ contour
      strokes). The pointer adds a smooth peak to the map, so contour rings gather around
      it, and nearby characters get denser and darker. A soft light follows the pointer.
   3. hero feature: the article image rendered as ASCII; hover/focus reveals the photo. */
(function () {
  "use strict";

  var doc = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  

  /* ---------- 1. year + active link ---------- */
  var y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());

  var links = Array.prototype.slice.call(document.querySelectorAll(".bar__links a[href^='#']"));
  var map = {};
  links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var a = map[e.target.id === "skills" ? "education" : e.target.id];
        links.forEach(function (l) { l.classList.remove("is-active"); l.removeAttribute("aria-current"); });
        if (a) { a.classList.add("is-active"); a.setAttribute("aria-current", "true"); }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["top", "work", "experience", "education", "skills"].forEach(function (id) {
      var s = document.getElementById(id); if (s) io.observe(s);
    });
  }

  /* ---------- 2. ascii contour field ---------- */
  var canvas = document.getElementById("field");
  var light = document.querySelector(".bg__light");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var CW = 11, CH = 18, FONT = 12;          // cell size (css px)
    var cols = 0, rows = 0, w = 0, h = 0, dpr = 1;
    var H = new Float32Array(0);
    var M = new Uint8Array(0);                 // quiet mask: no glyphs behind text blocks
    var quiet = Array.prototype.slice.call(document.querySelectorAll(
      ".hero__text > *, .feature__cap, .sec__head, .row__when, .row__role, .row__org, .row__list li, .row__sub, .tags, .skills dt, .skills dd, .footer__links, .footer__tag"));
    var coarse = window.matchMedia("(pointer: coarse)").matches;
    var levels = 7;                            // contour spacing
    var ptr = { x: 0, y: 0, tx: 0, ty: 0, amp: 0, tamp: 0, active: false, last: 0 };
    var t0 = performance.now(), raf = 0, lastDraw = 0, running = false;
    var FRAME = 1000 / 30;                     // ~30fps is plenty for a background
    var BUCKETS = 6;
    var buckets = [];
    for (var b = 0; b < BUCKETS; b++) buckets.push([]);

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = "400 " + FONT + "px 'Geist Mono', ui-monospace, Menlo, monospace";
      ctx.textBaseline = "middle"; ctx.textAlign = "center";
      cols = Math.ceil(w / CW) + 2; rows = Math.ceil(h / CH) + 2;
      H = new Float32Array(cols * rows); M = new Uint8Array(cols * rows);
      if (!ptr.active) { ptr.x = ptr.tx = w * 0.72; ptr.y = ptr.ty = h * 0.42; }
    }

    // smooth pseudo-noise from a few rotated sine waves (cheap, seamless, no deps)
    function field(x, y, t) {
      var a = Math.sin(x * 0.0041 + t * 0.07) + Math.sin(y * 0.0057 - t * 0.05);
      var c = Math.sin((x * 0.6 + y * 0.8) * 0.0033 + t * 0.04) * 0.9;
      var d = Math.sin((x * -0.7 + y * 0.5) * 0.0062 - t * 0.06) * 0.55;
      var e = Math.sin(Math.hypot(x - w * 0.3, y - h * 0.65) * 0.0045 - t * 0.08) * 0.5;
      return (a + c + d + e) * 0.22;
    }

    function idlePointer(t) {
      // gentle Lissajous drift used on touch devices and before the pointer arrives
      ptr.tx = w * (0.62 + 0.22 * Math.sin(t * 0.13));
      ptr.ty = h * (0.45 + 0.22 * Math.sin(t * 0.09 + 1.3));
      ptr.tamp = 0.75;
    }

    function draw(now) {
      var t = (now - t0) / 1000;
      if (!ptr.active) idlePointer(t);
      else if (now - ptr.last > 2500) ptr.tamp = 0.85;     // settle when still
      // ease pointer + amplitude
      ptr.x += (ptr.tx - ptr.x) * 0.12; ptr.y += (ptr.ty - ptr.y) * 0.12;
      ptr.amp += (ptr.tamp - ptr.amp) * 0.06;

      var px = ptr.x, py = ptr.y, sig2 = 2 * 170 * 170, amp = ptr.amp;
      var i, j, k, x, y, dx, dy;
      for (j = 0; j < rows; j++) {
        y = j * CH;
        for (i = 0; i < cols; i++) {
          x = i * CW; dx = x - px; dy = y - py;
          H[j * cols + i] = field(x, y, t) + amp * Math.exp(-(dx * dx + dy * dy) / sig2);
        }
      }

      // rasterize the visible text blocks into the quiet mask
      M.fill(0);
      for (var q = 0; q < quiet.length; q++) {
        var r = quiet[q].getBoundingClientRect();
        if (r.bottom < -20 || r.top > h + 20 || !r.width) continue;
        var i0 = Math.max(0, Math.floor((r.left - 8) / CW)), i1 = Math.min(cols - 1, Math.ceil((r.right + 8) / CW));
        var j0 = Math.max(0, Math.floor((r.top - 6) / CH)), j1 = Math.min(rows - 1, Math.ceil((r.bottom + 6) / CH));
        for (j = j0; j <= j1; j++) for (i = i0; i <= i1; i++) M[j * cols + i] = 1;
      }

      for (b = 0; b < BUCKETS; b++) buckets[b].length = 0;
      for (j = 1; j < rows - 1; j++) {
        for (i = 1; i < cols - 1; i++) {
          k = j * cols + i;
          if (M[k]) continue;
          var lv = Math.floor(H[k] * levels);
          x = i * CW; y = j * CH; dx = x - px; dy = y - py;
          var near = Math.exp(-(dx * dx + dy * dy) / (2 * 210 * 210)); // 0..1 proximity
          var ch = null, s = 0;
          // a contour passes through this cell when a level boundary is crossed to the right or below
          if (Math.floor(H[k + 1] * levels) !== lv || Math.floor(H[k + cols] * levels) !== lv) {
            var gx = H[k + 1] - H[k - 1], gy = H[k + cols] - H[k - cols];
            // stroke runs perpendicular to the gradient; pick the glyph closest to that direction
            var ang = Math.atan2(gy / CH, gx / CW);
            var o = Math.round(((ang % Math.PI) + Math.PI) % Math.PI / (Math.PI / 4)) % 4;
            ch = o === 0 ? "|" : o === 1 ? "/" : o === 2 ? "-" : "\\";
            s = 0.55 + 0.45 * near;
          } else if (near > 0.22 && (lv & 1) && ((i + j) & 1)) {
            // alternate bands pick up a light hatch near the pointer: reads as density
            ch = "."; s = near * 0.75;
          } else if ((i % 4 === 0) && (j % 3 === 0)) {
            ch = "·"; s = 0.1;                             // faint graph-paper dots
          }
          if (!ch) continue;
          var lum = Math.min(1, s * (0.45 + 0.75 * near)) * (coarse ? 0.7 : 1);
          var bi = Math.min(BUCKETS - 1, (lum * BUCKETS) | 0);
          buckets[bi].push(ch, x, y);
        }
      }

      ctx.clearRect(0, 0, w, h);
      for (b = 0; b < BUCKETS; b++) {
        var list = buckets[b]; if (!list.length) continue;
        var alpha = 0.06 + (b / (BUCKETS - 1)) * 0.36;
        ctx.fillStyle = "rgba(22,20,19," + alpha.toFixed(3) + ")";
        for (k = 0; k < list.length; k += 3) ctx.fillText(list[k], list[k + 1], list[k + 2]);
      }

      if (light) {
        light.style.setProperty("--mx", px.toFixed(1) + "px");
        light.style.setProperty("--my", py.toFixed(1) + "px");
      }
    }

    function loop(now) {
      raf = 0;
      if (!running) return;
      if (now - lastDraw >= FRAME) { lastDraw = now; draw(now); }
      raf = requestAnimationFrame(loop);
    }
    function start() {
      if (running || reduce.matches || document.hidden) return;
      running = true; raf = requestAnimationFrame(loop);
    }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    function staticFrame() {
      // reduced motion: one still composition, no pointer tracking
      ptr.active = false; ptr.x = ptr.tx = w * 0.72; ptr.y = ptr.ty = h * 0.4; ptr.amp = ptr.tamp = 0.7;
      draw(t0 + 40000);
    }

    resize();
    if (reduce.matches) staticFrame(); else { draw(performance.now()); start(); }

    var rT;
    window.addEventListener("resize", function () {
      clearTimeout(rT);
      rT = setTimeout(function () { resize(); if (reduce.matches) staticFrame(); else draw(performance.now()); }, 120);
    });
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
    var onReduce = function () { if (reduce.matches) { stop(); staticFrame(); } else start(); };
    if (reduce.addEventListener) reduce.addEventListener("change", onReduce); else if (reduce.addListener) reduce.addListener(onReduce);

    // reduced motion: the field stays still, but re-mask behind text as the page scrolls
    var sQ = 0;
    window.addEventListener("scroll", function () {
      if (!reduce.matches || sQ) return;
      sQ = requestAnimationFrame(function () { sQ = 0; staticFrame(); });
    }, { passive: true });

    window.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch" || reduce.matches) return;
      var dx = e.clientX - ptr.tx, dy = e.clientY - ptr.ty;
      ptr.tx = e.clientX; ptr.ty = e.clientY; ptr.active = true; ptr.last = performance.now();
      ptr.tamp = Math.min(1.35, 0.95 + Math.hypot(dx, dy) * 0.004);   // a quick move lifts the peak
    }, { passive: true });
    document.addEventListener("pointerleave", function () { ptr.active = false; });
    window.addEventListener("blur", function () { ptr.active = false; });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { resize(); if (reduce.matches) staticFrame(); });
  }

  /* ---------- 3. hero feature as ascii ---------- */
  var feat = document.querySelector(".feature__frame");
  var img = feat && feat.querySelector(".feature__img");
  var fc = feat && feat.querySelector(".feature__ascii");
  if (feat && img && fc && fc.getContext) {
    var RAMP = " .:-=+*#%@";
    var renderFeature = function () {
      try {
        var r = feat.getBoundingClientRect(); if (!r.width) return;
        var d = Math.min(window.devicePixelRatio || 1, 2);
        var fw = r.width, fh = r.height, cw = fw < 500 ? 5.4 : 7.2, chh = cw * 1.62;
        var cc = Math.floor(fw / cw), rr = Math.floor(fh / chh);
        var off = document.createElement("canvas"); off.width = cc; off.height = rr;
        var o = off.getContext("2d");
        // cover-fit the image like object-fit: cover; object-position 50% 30%
        var iw = img.naturalWidth, ih = img.naturalHeight, s = Math.max(cc / iw, (rr * chh / cw) / ih);
        var sw = cc / s, sh = (rr * chh / cw) / s, sx = (iw - sw) / 2, sy = (ih - sh) * 0.3;
        o.drawImage(img, sx, sy, sw, sh, 0, 0, cc, rr);
        var px = o.getImageData(0, 0, cc, rr).data;     // throws on a tainted canvas (file://)
        var lums = new Float32Array(cc * rr), sorted;
        for (var n = 0; n < cc * rr; n++) lums[n] = (0.2126 * px[n * 4] + 0.7152 * px[n * 4 + 1] + 0.0722 * px[n * 4 + 2]) / 255;
        sorted = Array.prototype.slice.call(lums).sort(function (a, b) { return a - b; });
        var lo = sorted[(sorted.length * 0.42) | 0], hi = sorted[(sorted.length * 0.995) | 0] || 1;
        fc.width = Math.round(fw * d); fc.height = Math.round(fh * d);
        var c = fc.getContext("2d"); c.setTransform(d, 0, 0, d, 0, 0);
        c.fillStyle = "#161413"; c.fillRect(0, 0, fw, fh);
        c.font = "500 " + (cw * 1.5).toFixed(1) + "px 'Geist Mono', ui-monospace, monospace";
        c.textBaseline = "top";
        var ox = (fw - cc * cw) / 2, oy = (fh - rr * chh) / 2;
        for (var j = 0; j < rr; j++) {
          for (var i = 0; i < cc; i++) {
            var q = (j * cc + i) * 4;
            var L = Math.max(0, Math.min(1, (lums[j * cc + i] - lo) / (hi - lo)));
            L = Math.pow(L, 0.75);
            var idx = Math.min(RAMP.length - 1, (L * RAMP.length) | 0);
            if (!idx) continue;
            var g = px[q + 1] > px[q] * 1.35 && px[q + 1] > 90;   // keep the green streak as an accent
            c.fillStyle = g ? "rgba(160,235,170," + (0.35 + L * 0.65).toFixed(2) + ")"
                            : "rgba(236,241,241," + (0.25 + L * 0.75).toFixed(2) + ")";
            c.fillText(RAMP[idx], ox + i * cw, oy + j * chh);
          }
        }
        doc.classList.add("has-ascii");
      } catch (err) { doc.classList.remove("has-ascii"); }
    };
    var go = function () {
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(renderFeature); else renderFeature();
    };
    if (img.complete && img.naturalWidth) go(); else img.addEventListener("load", go);
    var fT;
    window.addEventListener("resize", function () { clearTimeout(fT); fT = setTimeout(renderFeature, 150); });
  }
})();
