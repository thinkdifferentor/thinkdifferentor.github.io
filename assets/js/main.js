/* ═══════════════════════════════════════════════════════════════
   Jun Jiang · 个人主页 · 交互脚本
   依赖：无。全部使用原生 API，失败时页面仍可正常阅读。
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 提示条 ───────────────────────────────────────────────── */
  var toastEl = document.getElementById('toast');
  var toastTimer = null;

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('is-show');
    }, 2200);
  }

  /* ── 主题切换 ─────────────────────────────────────────────── */
  var themeBtn = document.getElementById('theme-toggle');

  function currentTheme() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = currentTheme() === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('jj-theme', next); } catch (e) {}
      toast(next === 'light' ? '已切换到浅色主题' : '已切换到深色主题');
    });
  }

  /* ── 打印 / 导出 PDF ──────────────────────────────────────── */
  var printBtn = document.getElementById('print-btn');
  if (printBtn) {
    printBtn.addEventListener('click', function () { window.print(); });
  }

  window.addEventListener('beforeprint', function () {
    document.querySelectorAll('details').forEach(function (d) { d.open = true; });
  });

  /* ── 复制邮箱 ─────────────────────────────────────────────── */
  var mailBtn = document.getElementById('copy-mail');

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        resolve();
      } catch (err) { reject(err); }
    });
  }

  if (mailBtn) {
    mailBtn.addEventListener('click', function () {
      var mail = mailBtn.getAttribute('data-mail') || '';
      copyText(mail).then(
        function () { toast('邮箱已复制 · ' + mail); },
        function () { toast('复制失败，请手动选择：' + mail); }
      );
    });
  }

  /* ── 复制 BibTeX ──────────────────────────────────────────── */
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var holder = btn.closest('.bibtex');
      var pre = holder ? holder.querySelector('pre') : null;
      if (!pre) return;
      copyText(pre.innerText.trim()).then(
        function () { toast('引用已复制到剪贴板'); },
        function () { toast('复制失败，请手动选择文本'); }
      );
    });
  });

  /* ── 图片放大 ─────────────────────────────────────────────── */
  var lightbox = document.getElementById('lightbox');

  if (lightbox) {
    try {
      var lbImg = lightbox.querySelector('img');
      var lastFocus = null;

      var openLightbox = function (img) {
        lastFocus = img;
        lbImg.src = img.currentSrc || img.src;
        lbImg.alt = img.alt || '';
        lightbox.classList.add('is-open');
        document.body.classList.add('is-locked');
        lightbox.querySelector('.lightbox-close').focus();
      };

      var closeLightbox = function () {
        lightbox.classList.remove('is-open');
        document.body.classList.remove('is-locked');
        lbImg.removeAttribute('src');
        if (lastFocus) lastFocus.focus();
      };

      document.querySelectorAll('.figure img, .plate img').forEach(function (img) {
        img.tabIndex = 0;
        img.setAttribute('role', 'button');
        img.addEventListener('click', function () { openLightbox(img); });
        img.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openLightbox(img);
          }
        });
      });

      lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox || e.target === lbImg) closeLightbox();
      });

      lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
      });
    } catch (e) {
      /* 放大功能失败不影响阅读 */
    }
  }

  /* ── 滚动入场 ─────────────────────────────────────────────── */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  if (reduced || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealObs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    root.classList.add('reveal-armed');
    revealEls.forEach(function (el) { revealObs.observe(el); });
  }

  /* ── 导航高亮（只在首页有效） ─────────────────────────────── */
  var navItems = Array.prototype.slice.call(document.querySelectorAll('.nav-item'));
  var sections = navItems
    .map(function (a) {
      var id = (a.getAttribute('href') || '').split('#')[1];
      var el = id ? document.getElementById(id) : null;
      return el ? { link: a, el: el } : null;
    })
    .filter(Boolean);

  if (sections.length && !reduced) {
    var ticking = false;

    function updateActive() {
      ticking = false;
      var line = window.scrollY + window.innerHeight * 0.32;
      var active = null;

      sections.forEach(function (s) {
        if (s.el.offsetTop <= line) active = s;
      });

      navItems.forEach(function (a) { a.classList.remove('is-active'); });
      if (active) active.link.classList.add('is-active');
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateActive);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updateActive();
  }

  /* ── 平滑滚动（带固定栏补偿） ─────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      if (!id) return;
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', '#' + id);
    });
  });
})();
