/* =================================================================
   <a-waves> — Perlin-noise wave canvas Web Component
   Inspired by wodniack.dev. Configurable via HTML attributes:
     data-lines  = "high" | "low"   (line density)
     data-mouse  = "true" | "false" (mouse/touch interaction)
     data-color  = CSS color        (optional; omit to track the --wave-color
                                    CSS property, which flips with the theme)
   ================================================================= */

(function () {
  'use strict';

  /* Fallback only — the live value comes from the --wave-color CSS property. */
  var DEFAULT_COLOR = 'rgba(167,193,217,0.38)';

  /* ---------- Color conversion helpers ---------- */
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return [h * 360, s * 100, l * 100];
  }

  function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    var r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      function hue2rgb(p, q, t) {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      }
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  /* ---------- Perlin Noise (classic 2-D, self-contained) ---------- */
  var perm = new Uint8Array(512);
  var grad = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [0, 1], [0, -1]
  ];

  // Seed the permutation table once
  (function seedPerm() {
    var p = [];
    for (var i = 0; i < 256; i++) p[i] = i;
    // Fisher-Yates
    for (var i = 255; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    for (var i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + t * (b - a); }

  function noise2D(x, y) {
    var X = Math.floor(x) & 255;
    var Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    var u = fade(x);
    var v = fade(y);

    var aa = perm[perm[X] + Y] & 7;
    var ab = perm[perm[X] + Y + 1] & 7;
    var ba = perm[perm[X + 1] + Y] & 7;
    var bb = perm[perm[X + 1] + Y + 1] & 7;

    function dot(gi, fx, fy) { return grad[gi][0] * fx + grad[gi][1] * fy; }

    var x1 = lerp(dot(aa, x, y), dot(ba, x - 1, y), u);
    var x2 = lerp(dot(ab, x, y - 1), dot(bb, x - 1, y - 1), u);
    return lerp(x1, x2, v);
  }

  /* ---------- Web Component ---------- */
  function AWaves() {
    var el = Reflect.construct(HTMLElement, [], AWaves);
    el._canvas = null;
    el._ctx = null;
    el._animId = null;
    el._time = 0;
    el._mouseX = -9999;
    el._mouseY = -9999;
    el._lines = [];
    el._isVisible = true;
    el._baseGap = 15;
    el._gap = 15;
    el._lineWidth = 1;
    el._mouseEnabled = false;
    el._strokeColor = DEFAULT_COLOR;
    el._lastColor = '';
    el._themeObserver = null;
    el._resizeTimer = null;
    return el;
  }

  AWaves.prototype = Object.create(HTMLElement.prototype);
  AWaves.prototype.constructor = AWaves;

  /* Pull stroke color, line width and line density from CSS custom properties
     so the canvas re-tunes itself when the theme flips: dark lines on the white
     hero, and thicker + sparser white lines on the black one. An explicit
     data-color attribute still wins for color. */
  AWaves.prototype._refreshStyle = function () {
    var cs;
    try { cs = getComputedStyle(document.documentElement); } catch (e) { return; }

    function num(prop, fallback) {
      var n = parseFloat(cs.getPropertyValue(prop));
      return (isFinite(n) && n > 0) ? n : fallback;
    }

    var attr = this.getAttribute('data-color');
    this._strokeColor = attr || (cs.getPropertyValue('--wave-color').trim() || DEFAULT_COLOR);
    this._lineWidth = num('--wave-line-width', 1);

    // Density: scale the base gap. Bigger gap => fewer lines.
    var gap = Math.max(4, Math.round(this._baseGap * num('--wave-gap-scale', 1)));
    if (gap !== this._gap) {
      this._gap = gap;
      if (this._canvas) this._buildLines();   // geometry changed, rebuild
    }
  };

  AWaves.prototype.connectedCallback = function () {
    var self = this;

    // Read attributes
    var linesAttr = this.getAttribute('data-lines') || 'high';
    this._baseGap = linesAttr === 'low' ? 24 : 12;
    this._gap = this._baseGap;
    this._mouseEnabled = this.getAttribute('data-mouse') === 'true';
    this._refreshStyle();

    // The hero background flips with the theme, so re-read --wave-color
    // whenever data-theme changes or the lines vanish against the new bg.
    if (!this.getAttribute('data-color') && 'MutationObserver' in window) {
      this._themeObserver = new MutationObserver(function () {
        self._refreshStyle();
      });
      this._themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      });
    }

    // Create canvas
    this._canvas = document.createElement('canvas');
    this._canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    this.appendChild(this._canvas);
    this._ctx = this._canvas.getContext('2d');

    this._resize();

    // Events
    window.addEventListener('resize', function () {
      clearTimeout(self._resizeTimer);
      self._resizeTimer = setTimeout(function () { self._resize(); }, 150);
    });

    if (this._mouseEnabled) {
      this.addEventListener('mousemove', function (e) {
        var r = self._canvas.getBoundingClientRect();
        self._mouseX = e.clientX - r.left;
        self._mouseY = e.clientY - r.top;
      });
      this.addEventListener('mouseleave', function () {
        self._mouseX = -9999;
        self._mouseY = -9999;
      });
      this.addEventListener('touchmove', function (e) {
        var r = self._canvas.getBoundingClientRect();
        var t = e.touches[0];
        self._mouseX = t.clientX - r.left;
        self._mouseY = t.clientY - r.top;
      }, { passive: true });
      this.addEventListener('touchend', function () {
        self._mouseX = -9999;
        self._mouseY = -9999;
      });
    }

    // IntersectionObserver — pause when out of viewport
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        self._isVisible = entries[0].isIntersecting;
        if (self._isVisible && !self._animId) {
          self._animId = requestAnimationFrame(function () { self._draw(); });
        }
      }, { threshold: 0.05 });
      obs.observe(this);
    }

    // Start
    this._animId = requestAnimationFrame(function () { self._draw(); });
  };

  AWaves.prototype._resize = function () {
    var w = this.offsetWidth || this.parentElement.offsetWidth;
    var h = this.offsetHeight || this.parentElement.offsetHeight;
    this._canvas.width = w;
    this._canvas.height = h;
    this._buildLines();
  };

  AWaves.prototype._buildLines = function () {
    this._lines = [];
    var w = this._canvas.width;
    var h = this._canvas.height;
    var gap = this._gap;
    var numLines = Math.ceil(w / gap);
    for (var i = 0; i <= numLines; i++) {
      var x = i * gap;
      var segments = [];
      var segCount = Math.ceil(h / 4);
      for (var j = 0; j <= segCount; j++) {
        segments.push({ x: x, y: j * 4, ox: 0 });
      }
      this._lines.push(segments);
    }
  };

  AWaves.prototype._draw = function () {
    var self = this;
    if (!this._isVisible) {
      this._animId = null;
      return;
    }

    var ctx = this._ctx;
    var w = this._canvas.width;
    var h = this._canvas.height;
    ctx.clearRect(0, 0, w, h);

    this._time += 0.003;

    var mouseX = this._mouseX;
    var mouseY = this._mouseY;
    var mouseActive = this._mouseEnabled && mouseX > -9000;
    var mouseRadius = 160;

    ctx.lineWidth = this._lineWidth || 1;

    var sc = this._strokeColor;

    // Parse base stroke color
    var bR = 56, bG = 189, bB = 248, baseAlpha = 0.4;
    var rgbaMatch = sc.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
    if (rgbaMatch) {
      bR = parseInt(rgbaMatch[1]); bG = parseInt(rgbaMatch[2]); bB = parseInt(rgbaMatch[3]);
      baseAlpha = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
    }

    // Convert base to HSL for hue shifting
    var baseHSL = rgbToHsl(bR, bG, bB);
    var totalLines = this._lines.length;
    var center = (totalLines - 1) / 2;
    var hueSpread = 50;

    for (var i = 0; i < totalLines; i++) {
      // -1 at left edge, 0 at center, +1 at right edge
      var pos = (i - center) / center;
      var distFromCenter = Math.abs(pos); // 0 at center, 1 at edge

      // Hue shifts across the spread
      var h = (baseHSL[0] + pos * hueSpread + 360) % 360;
      var rgb = hslToRgb(h, baseHSL[1], baseHSL[2]);

      // Base alpha: bright center, dim edges
      var ratio = 1 - distFromCenter;
      var alpha = baseAlpha * (0.15 + 0.85 * ratio * ratio);

      ctx.strokeStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha.toFixed(3) + ')';

      var segs = this._lines[i];
      ctx.beginPath();
      for (var j = 0; j < segs.length; j++) {
        var seg = segs[j];
        var baseX = seg.x;
        var baseY = seg.y;

        // Perlin noise displacement
        var noiseVal = noise2D(baseX * 0.006 + this._time, baseY * 0.008 + this._time * 0.5);
        var displacement = noiseVal * 25;

        // Mouse interaction
        if (mouseActive) {
          var dx = baseX - mouseX;
          var dy = baseY - mouseY;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouseRadius && dist > 0) {
            var force = (1 - dist / mouseRadius) * 50;
            displacement += (dx / dist) * force;
          }
        }

        var px = baseX + displacement;
        var py = baseY;

        if (j === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    }

    this._animId = requestAnimationFrame(function () { self._draw(); });
  };

  AWaves.prototype.disconnectedCallback = function () {
    if (this._themeObserver) { this._themeObserver.disconnect(); this._themeObserver = null; }
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
  };

  // Register custom element
  if (!customElements.get('a-waves')) {
    customElements.define('a-waves', AWaves);
  }
})();
