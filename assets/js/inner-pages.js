/* =================================================================
   Inner Page Interactions — Scroll Reveal + Smooth Scroll
   Loaded on cv, publications, and publication layouts.
   ================================================================= */

(function () {
  'use strict';

  /* ---------- Scroll Reveal ---------- */
  function initReveal() {
    var elements = document.querySelectorAll('.reveal, .reveal--left, .reveal--right');
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
      elements.forEach(function (el) { el.classList.add('reveal--visible'); });
    }
  }

  /* ---------- Smooth Scroll for Anchor Links ---------- */
  function initSmoothScroll() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;
      var target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    initReveal();
    initSmoothScroll();
  });
})();
