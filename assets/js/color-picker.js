/* ==========================================================================
   Color Cycle Runtime — auto-cycles every 10s with smooth gradient transitions.
   Click the palette icon to jump to the next color instantly.
   Requires window.__cp (set by inline <script> in <head>).
   ========================================================================== */
(function () {
  'use strict';

  var cp = window.__cp;
  if (!cp) return;

  var RAW = cp.RAW;
  var hex2rgb = cp.hex2rgb;
  var rgb2hex = cp.rgb2hex;
  var buildVars = cp.buildVars;
  var setVars = cp.setVars;
  var applyInstant = cp.applyInstant;

  var CYCLE_MS = 10000;
  var FADE_MS  = 2000;

  /* ------------------------------------------------------------------ */
  /*  Interpolation helpers                                              */
  /* ------------------------------------------------------------------ */
  function lerpN(a, b, t) { return a + (b - a) * t; }
  function lerpHex(a, b, t) {
    var ca = hex2rgb(a), cb = hex2rgb(b);
    return rgb2hex(lerpN(ca[0],cb[0],t), lerpN(ca[1],cb[1],t), lerpN(ca[2],cb[2],t));
  }
  function lerpHue(a, b, t) {
    var d = b - a;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return ((a + d * t) % 360 + 360) % 360;
  }

  /* ------------------------------------------------------------------ */
  /*  Smooth transition from one palette index to another                */
  /* ------------------------------------------------------------------ */
  var fadeRaf = null;

  function fadeToIndex(fromIdx, toIdx, onDone) {
    if (fadeRaf) cancelAnimationFrame(fadeRaf);

    var pA = RAW[fromIdx], pB = RAW[toIdx];
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var start = null;

    function tick(ts) {
      if (!start) start = ts;
      var t = Math.min((ts - start) / FADE_MS, 1);
      t = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2;

      var accent = lerpHex(pA[0], pB[0], t);
      var deep   = lerpHex(pA[1], pB[1], t);
      var light  = lerpHex(pA[2], pB[2], t);
      var h      = lerpHue(pA[3], pB[3], t);
      var s      = lerpN(pA[4], pB[4], t);

      var v = buildVars(accent, deep, light, h, s, isDark);

      var tlEdu = lerpHex(isDark?pA[8]:pA[5],  isDark?pB[8]:pB[5],  t);
      var tlPub = lerpHex(isDark?pA[9]:pA[6],  isDark?pB[9]:pB[6],  t);
      var tlInd = lerpHex(isDark?pA[10]:pA[7], isDark?pB[10]:pB[7], t);

      setVars(v, tlEdu, tlPub, tlInd);

      if (t < 1) {
        fadeRaf = requestAnimationFrame(tick);
      } else {
        fadeRaf = null;
        if (onDone) onDone();
      }
    }

    fadeRaf = requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------ */
  /*  State                                                              */
  /* ------------------------------------------------------------------ */
  var currentIndex = cp.idx;
  var cycleTimer = null;

  function nextIndex() {
    return (currentIndex + 1) % RAW.length;
  }

  function startCycle() {
    if (cycleTimer) clearInterval(cycleTimer);
    cycleTimer = setInterval(function () {
      var from = currentIndex;
      var to = nextIndex();
      currentIndex = to;
      cp.idx = to;
      fadeToIndex(from, to);
      try { localStorage.setItem('accent-color-index', to); } catch(e) {}
    }, CYCLE_MS);
  }

  // Re-apply on theme change
  new MutationObserver(function () {
    applyInstant(currentIndex);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // Start auto-cycle
  startCycle();

  /* ------------------------------------------------------------------ */
  /*  Click handler — instant jump to next color, reset cycle timer      */
  /* ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('color-cycle-btn');
    if (!btn) return;

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (fadeRaf) { cancelAnimationFrame(fadeRaf); fadeRaf = null; }
      var next = nextIndex();
      currentIndex = next;
      cp.idx = next;
      applyInstant(next);
      try { localStorage.setItem('accent-color-index', next); } catch(e) {}
      startCycle();
    });
  });
})();
