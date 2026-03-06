/* ================================================================
   Homepage Interactions — Typing Effect, Scroll Reveal
   Vanilla JS, no dependencies. Wave canvas handled by <a-waves>.
   ================================================================ */

(function () {
  'use strict';

  /* ---------- Typing Effect ---------- */
  var keywords = [
    'Efficient AI',
    'Diffusion Models',
    'Sparse Attention',
    'Token Merging',
    'Model Acceleration',
    'Generative Models'
  ];

  function initTyping() {
    var el = document.getElementById('typing-text');
    if (!el) return;

    var wordIdx = 0;
    var charIdx = 0;
    var deleting = false;
    var pauseEnd = 0;

    function tick() {
      var word = keywords[wordIdx];
      var now = Date.now();

      if (now < pauseEnd) {
        requestAnimationFrame(tick);
        return;
      }

      if (!deleting) {
        charIdx++;
        el.textContent = word.slice(0, charIdx);
        if (charIdx === word.length) {
          deleting = true;
          pauseEnd = now + 1800;
        }
      } else {
        charIdx--;
        el.textContent = word.slice(0, charIdx);
        if (charIdx === 0) {
          deleting = false;
          wordIdx = (wordIdx + 1) % keywords.length;
          pauseEnd = now + 400;
        }
      }

      var speed = deleting ? 40 : 80;
      setTimeout(function () { requestAnimationFrame(tick); }, speed);
    }

    tick();
  }

  /* ---------- Scroll Reveal ---------- */
  function initReveal() {
    var elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal--visible');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });

      elements.forEach(function (el) { obs.observe(el); });
    } else {
      /* Fallback: show everything */
      elements.forEach(function (el) { el.classList.add('reveal--visible'); });
    }
  }

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    initTyping();
    initReveal();
  });
})();
