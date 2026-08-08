/* veqiels — seamless page navigation + persistent music player */
(function () {
  'use strict';

  var audio = document.getElementById('bg-audio');
  var btn = document.getElementById('play-btn');
  var fill = document.getElementById('progress-fill');
  var content = document.getElementById('page-content');
  var navigating = false;

  function updatePlayerUI() {
    if (!audio || !btn) return;
    btn.innerHTML = audio.paused ? '&#9654;' : '&#10074;&#10074;';
  }

  if (audio && btn) {
    btn.addEventListener('click', function () {
      if (audio.paused) {
        audio.play().then(updatePlayerUI).catch(function () {});
      } else {
        audio.pause();
        updatePlayerUI();
      }
    });

    audio.addEventListener('timeupdate', function () {
      if (audio.duration && fill) {
        fill.style.width = (audio.currentTime / audio.duration * 100) + '%';
      }
    });

    audio.addEventListener('ended', updatePlayerUI);
    audio.addEventListener('pause', updatePlayerUI);
    audio.addEventListener('play', updatePlayerUI);
    updatePlayerUI();
  }

  function setActiveLink(path) {
    var links = document.querySelectorAll('a[data-page]');
    links.forEach(function (link) {
      var isActive = link.getAttribute('href') === path;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  async function loadPage(url, pushHistory) {
    if (!content || navigating) return;

    var target = new URL(url, window.location.origin);
    var current = new URL(window.location.href);

    if (target.origin !== current.origin) return;
    if (target.pathname === current.pathname && target.search === current.search && target.hash === current.hash) return;

    navigating = true;

    try {
      var response = await fetch(target.href, {
        headers: { 'X-Requested-With': 'fetch' }
      });

      if (!response.ok) throw new Error('Could not load page: ' + response.status);

      var html = await response.text();
      var parser = new DOMParser();
      var doc = parser.parseFromString(html, 'text/html');
      var newContent = doc.querySelector('#page-content');

      if (!newContent) throw new Error('Page content container not found.');

      // Replace ONLY the page area. The audio player remains untouched.
      content.innerHTML = newContent.innerHTML;

      if (pushHistory) {
        window.history.pushState({}, '', target.pathname + target.search + target.hash);
      }

      // Keep the browser title in sync if a page ever gets a different title.
      if (doc.title) document.title = doc.title;

      setActiveLink(window.location.pathname);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Seamless navigation failed:', error);
      // If the site is being opened directly as files, fetch may be blocked.
      // Fall back to normal navigation instead of leaving the user stuck.
      if (pushHistory) window.location.href = target.href;
    } finally {
      navigating = false;
    }
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[data-page]');
    if (!link) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;

    var url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;

    event.preventDefault();
    loadPage(url.href, true);
  });

  window.addEventListener('popstate', function () {
    loadPage(window.location.href, false);
  });

  setActiveLink(window.location.pathname);
})();
