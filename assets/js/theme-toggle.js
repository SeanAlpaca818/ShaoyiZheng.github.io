/* ==========================================================================
   Theme toggle — flips <html data-theme> between light and dark and persists
   the choice in localStorage under 'color-mode'.

   The initial value is settled by the inline script in _includes/head/custom.html
   (it must run before first paint); this file only wires up the button.
   ========================================================================== */
(function () {
  'use strict';

  var STORAGE_KEY = 'color-mode';

  function currentMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark'
      ? 'dark'
      : 'light';
  }

  /* Show the icon for the mode the click would switch TO. */
  function paintIcon(btn, mode) {
    var icon = btn.querySelector('i');
    if (!icon) return;
    var goingTo = mode === 'dark' ? 'light' : 'dark';
    icon.classList.remove('fa-moon', 'fa-sun');
    icon.classList.add(goingTo === 'dark' ? 'fa-moon' : 'fa-sun');
    btn.setAttribute('title', goingTo === 'dark' ? 'Switch to dark mode' : 'Switch to light mode');
  }

  function apply(mode) {
    if (mode === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    try { localStorage.setItem(STORAGE_KEY, mode); } catch (e) {}
  }

  function init() {
    var btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;

    paintIcon(btn, currentMode());

    function toggle(e) {
      e.preventDefault();
      var next = currentMode() === 'dark' ? 'light' : 'dark';
      apply(next);
      paintIcon(btn, next);
    }

    btn.addEventListener('click', toggle);
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') toggle(e);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
