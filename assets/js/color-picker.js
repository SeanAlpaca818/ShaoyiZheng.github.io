/* ==========================================================================
   Color Cycle — auto-cycles every 60s with smooth gradient transitions.
   Click the palette icon to jump to the next color instantly.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Palette definitions — stored as raw params for smooth lerping      */
  /*  [baseHex, deepHex, lightHex, hue, sat, tlEdu,tlPub,tlInd, tlEduD,tlPubD,tlIndD] */
  /* ------------------------------------------------------------------ */
  var RAW = [
    ['#38bdf8','#0284c7','#7dd3fc', 195,90, '#14b8a6','#3b82f6','#f97316','#2dd4bf','#60a5fa','#fb923c'],
    ['#0ea5e9','#0369a1','#38bdf8', 199,90, '#06b6d4','#0284c7','#f59e0b','#22d3ee','#38bdf8','#fbbf24'],
    ['#3b82f6','#1d4ed8','#93c5fd', 217,90, '#6366f1','#3b82f6','#f97316','#818cf8','#60a5fa','#fb923c'],
    ['#6366f1','#4338ca','#a5b4fc', 239,84, '#8b5cf6','#6366f1','#ec4899','#a78bfa','#818cf8','#f472b6'],
    ['#a78bfa','#7c3aed','#c4b5fd', 263,90, '#6366f1','#a78bfa','#f472b6','#818cf8','#c4b5fd','#f9a8d4'],
    ['#8b5cf6','#6d28d9','#c4b5fd', 258,90, '#6366f1','#8b5cf6','#ec4899','#818cf8','#a78bfa','#f472b6'],
    ['#d946ef','#a21caf','#e879f9', 292,84, '#a855f7','#d946ef','#f472b6','#c084fc','#e879f9','#f9a8d4'],
    ['#ec4899','#be185d','#f9a8d4', 330,82, '#d946ef','#ec4899','#f97316','#e879f9','#f472b6','#fb923c'],
    ['#f472b6','#db2777','#f9a8d4', 340,82, '#e879f9','#f472b6','#fb923c','#f0abfc','#f9a8d4','#fdba74'],
    ['#fb7185','#e11d48','#fda4af', 350,90, '#f472b6','#fb7185','#fbbf24','#f9a8d4','#fda4af','#fde68a'],
    ['#ef4444','#b91c1c','#fca5a5',   0,72, '#f97316','#ef4444','#fbbf24','#fb923c','#f87171','#fde68a'],
    ['#14b8a6','#0f766e','#5eead4', 174,80, '#06b6d4','#14b8a6','#f97316','#22d3ee','#2dd4bf','#fb923c'],
    ['#34d399','#059669','#6ee7b7', 160,72, '#2dd4bf','#34d399','#fbbf24','#5eead4','#6ee7b7','#fde047'],
    ['#22c55e','#15803d','#86efac', 142,72, '#14b8a6','#22c55e','#f97316','#2dd4bf','#4ade80','#fb923c'],
    ['#84cc16','#4d7c0f','#bef264',  84,80, '#22c55e','#84cc16','#f97316','#4ade80','#a3e635','#fb923c'],
    ['#fbbf24','#d97706','#fde68a',  43,96, '#fb923c','#fbbf24','#34d399','#fdba74','#fde68a','#6ee7b7'],
    ['#f97316','#c2410c','#fdba74',  25,95, '#fbbf24','#f97316','#34d399','#fde68a','#fb923c','#6ee7b7'],
    ['#eab308','#a16207','#fde047',  50,92, '#f97316','#eab308','#22c55e','#fb923c','#facc15','#4ade80'],
    ['#64748b','#475569','#94a3b8', 215,16, '#14b8a6','#6366f1','#f97316','#2dd4bf','#818cf8','#fb923c']
  ];

  var CYCLE_MS = 10000;   // time between transitions (10s)
  var FADE_MS  = 2000;    // transition duration (2s fade)

  /* ------------------------------------------------------------------ */
  /*  Color math helpers                                                 */
  /* ------------------------------------------------------------------ */
  function hex2rgb(hex) {
    return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
  }
  function rgb2hex(r,g,b) {
    return '#' + ((1<<24)+(Math.round(r)<<16)+(Math.round(g)<<8)+Math.round(b)).toString(16).slice(1);
  }
  function lerpN(a, b, t) { return a + (b - a) * t; }
  function lerpHex(a, b, t) {
    var ca = hex2rgb(a), cb = hex2rgb(b);
    return rgb2hex(lerpN(ca[0],cb[0],t), lerpN(ca[1],cb[1],t), lerpN(ca[2],cb[2],t));
  }
  function lerpHue(a, b, t) {
    // Shortest path around the hue wheel
    var d = b - a;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return ((a + d * t) % 360 + 360) % 360;
  }
  function hexToRgbStr(hex) {
    var c = hex2rgb(hex);
    return c[0]+','+c[1]+','+c[2];
  }
  function hsl(h,s,l) { return 'hsl('+h+','+s+'%,'+l+'%)'; }

  /* ------------------------------------------------------------------ */
  /*  Build a full set of CSS values from interpolated params            */
  /* ------------------------------------------------------------------ */
  function buildVars(accent, deep, light, h, s, isDark) {
    var a = hexToRgbStr(accent);
    var glow = isDark ? 'rgba('+a+',0.22)' : 'rgba('+a+',0.30)';
    var bg;
    if (isDark) {
      bg = {
        heroBg: hsl(h,Math.min(s,60),6), sectionBg: hsl(h,Math.min(s,40),9),
        sectionAltBg: hsl(h,Math.min(s,30),14), cardBg: hsl(h,Math.min(s,25),17),
        cardBorder: hsl(h,Math.min(s,20),22), cardShadow: 'rgba(0,0,0,0.30)',
        timelineLine: hsl(h,15,32), surface: hsl(h,Math.min(s,25),17),
        surfaceRaised: hsl(h,Math.min(s,40),9),
        globalBg: hsl(h,Math.min(s,40),9), footerBg: hsl(h,Math.min(s,40),9)
      };
    } else {
      bg = {
        heroBg: hsl(h,s,8), sectionBg: hsl(h,Math.min(s,30),97),
        sectionAltBg: '#fff', cardBg: '#fff',
        cardBorder: hsl(h,Math.min(s,25),90), cardShadow: 'rgba('+a+',0.06)',
        timelineLine: hsl(h,15,80), surface: '#fff',
        surfaceRaised: hsl(h,Math.min(s,20),97),
        globalBg: '#fff', footerBg: hsl(h,Math.min(s,20),97)
      };
    }
    return { accent: accent, deep: deep, light: light, glow: glow, wave: 'rgba('+a+',0.55)', bg: bg };
  }

  function setVars(v, tlEdu, tlPub, tlInd) {
    var root = document.documentElement;
    root.style.setProperty('--home-accent', v.accent);
    root.style.setProperty('--home-accent-glow', v.glow);
    root.style.setProperty('--gt-accent', v.accent);
    root.style.setProperty('--gt-accent-glow', v.glow);
    root.style.setProperty('--global-link-color', v.accent);
    root.style.setProperty('--global-link-color-visited', v.accent);
    root.style.setProperty('--global-link-color-hover', v.deep);
    root.style.setProperty('--global-base-color', v.accent);
    root.style.setProperty('--global-masthead-link-color-hover', v.accent);
    root.style.setProperty('--home-hero-bg', v.bg.heroBg);
    root.style.setProperty('--home-section-bg', v.bg.sectionBg);
    root.style.setProperty('--home-section-alt-bg', v.bg.sectionAltBg);
    root.style.setProperty('--home-card-bg', v.bg.cardBg);
    root.style.setProperty('--home-card-border', v.bg.cardBorder);
    root.style.setProperty('--home-card-shadow', v.bg.cardShadow);
    root.style.setProperty('--home-timeline-line', v.bg.timelineLine);
    root.style.setProperty('--gt-surface', v.bg.surface);
    root.style.setProperty('--gt-surface-raised', v.bg.surfaceRaised);
    root.style.setProperty('--global-bg-color', v.bg.globalBg);
    root.style.setProperty('--global-footer-bg-color', v.bg.footerBg);
    root.style.setProperty('--home-tl-edu', tlEdu);
    root.style.setProperty('--home-tl-pub', tlPub);
    root.style.setProperty('--home-tl-ind', tlInd);
    root.style.setProperty('--color-hero-border', v.light);
    var waves = document.querySelectorAll('a-waves');
    for (var i = 0; i < waves.length; i++) waves[i]._strokeColor = v.wave;
  }

  /* ------------------------------------------------------------------ */
  /*  Apply a palette index instantly                                    */
  /* ------------------------------------------------------------------ */
  function applyInstant(idx) {
    var p = RAW[idx];
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var v = buildVars(p[0], p[1], p[2], p[3], p[4], isDark);
    var tl = isDark ? [p[8],p[9],p[10]] : [p[5],p[6],p[7]];
    setVars(v, tl[0], tl[1], tl[2]);
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
      // Ease in-out
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
  var currentIndex = 0;
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
      fadeToIndex(from, to);
      try { localStorage.setItem('accent-color-index', to); } catch(e) {}
    }, CYCLE_MS);
  }

  /* ------------------------------------------------------------------ */
  /*  Init — apply saved color immediately                               */
  /* ------------------------------------------------------------------ */
  var saved = null;
  try { saved = localStorage.getItem('accent-color-index'); } catch (e) {}
  if (saved !== null && RAW[parseInt(saved, 10)]) {
    currentIndex = parseInt(saved, 10);
  }
  applyInstant(currentIndex);

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
      applyInstant(next);
      try { localStorage.setItem('accent-color-index', next); } catch(e) {}
      // Reset the auto-cycle timer
      startCycle();
    });
  });
})();
