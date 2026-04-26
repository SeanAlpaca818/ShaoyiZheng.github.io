/* ================================================================
   Timeline scroll-draw — fills the central line as the user scrolls
   through the section. Vanilla, no dependencies.
   ================================================================ */

(function () {
  'use strict';

  function init() {
    var tl = document.getElementById('js-timeline');
    if (!tl) return;

    var ticking = false;

    function update() {
      ticking = false;
      var rect = tl.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      // "cursor" sits at 55% of viewport height; progress = how far that
      // cursor is into the timeline element, clamped 0..1.
      var cursor = vh * 0.55;
      var dist = cursor - rect.top;
      var p = dist / rect.height;
      if (p < 0) p = 0;
      if (p > 1) p = 1;
      tl.style.setProperty('--tl-progress', (p * 100).toFixed(2) + '%');
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
