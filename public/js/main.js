/**
 * Dangcagan NHS Digital Herbarium — Client JavaScript
 * Handles: mobile nav, scroll reveal, search suggestions, QR codes, fuzzy search
 */

(function () {
  'use strict';

  /* ════════════════════════════════════════════════════════════
     1. Mobile navigation toggle
     ════════════════════════════════════════════════════════════ */
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close on nav link click (mobile)
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
        navMenu.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ════════════════════════════════════════════════════════════
     2. Header shadow on scroll
     ════════════════════════════════════════════════════════════ */
  const siteHeader = document.getElementById('siteHeader');
  if (siteHeader) {
    const handleScroll = () => {
      if (window.scrollY > 8) siteHeader.classList.add('is-scrolled');
      else siteHeader.classList.remove('is-scrolled');
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  /* ════════════════════════════════════════════════════════════
     3. Scroll reveal animations
     Uses IntersectionObserver for performance (no scroll listeners)
     ════════════════════════════════════════════════════════════ */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && revealEls.length) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.1
    });
    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    // Fallback: just show everything
    revealEls.forEach(el => el.classList.add('is-revealed'));
  }

  /* ════════════════════════════════════════════════════════════
     4. Load plant data (for search suggestions)
     ════════════════════════════════════════════════════════════ */
  let plantsData = null;
  let fuseInstance = null;

  async function loadPlants() {
    if (plantsData) return plantsData;
    try {
      const res = await fetch('/api/plants');
      const json = await res.json();
      plantsData = json.plants || [];

      // Initialize Fuse.js for fuzzy search
      if (window.Fuse && plantsData.length) {
        fuseInstance = new window.Fuse(plantsData, {
          keys: [
            { name: 'name', weight: 2 },
            { name: 'scientificName', weight: 1.5 },
            { name: 'otherNames', weight: 1.2 },
            { name: 'tags', weight: 1 },
            { name: 'category', weight: 1 },
            { name: 'shortDescription', weight: 0.5 },
            { name: 'medicinalUses', weight: 0.8 }
          ],
          threshold: 0.4,
          ignoreLocation: true,
          minMatchCharLength: 2,
          includeScore: true
        });
      }
      return plantsData;
    } catch (e) {
      console.error('Failed to load plants:', e);
      return [];
    }
  }

  /* ════════════════════════════════════════════════════════════
     5. Search suggestions (landing + home quick search bars)
     ════════════════════════════════════════════════════════════ */
  function initSearchSuggestions(inputId, suggestionsId, formId) {
    const input = document.getElementById(inputId);
    const suggestions = document.getElementById(suggestionsId);
    if (!input || !suggestions) return;

    let activeIndex = -1;
    let currentResults = [];

    const renderSuggestions = (results) => {
      currentResults = results;
      if (!results.length) {
        suggestions.hidden = true;
        suggestions.innerHTML = '';
        return;
      }
      suggestions.innerHTML = results.slice(0, 6).map((r, i) => {
        const p = r.item || r;
        const score = r.score ? ` · ${(100 - r.score * 100).toFixed(0)}% match` : '';
        return `
          <a href="/plant/${p.slug}" role="option" data-index="${i}" data-slug="${p.slug}">
            <img src="${p.image}" alt="" loading="lazy" />
            <div>
              <span class="ls-name">${highlight(p.name, input.value)}</span>
              <span class="ls-meta"><em>${p.scientificName}</em> · ${p.category}${score}</span>
            </div>
          </a>
        `;
      }).join('');
      suggestions.hidden = false;
    };

    const highlight = (text, query) => {
      if (!query) return text;
      const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(re, '<strong>$1</strong>');
    };

    const handleInput = async (q) => {
      if (!q || q.length < 2) {
        suggestions.hidden = true;
        return;
      }
      await loadPlants();
      if (fuseInstance) {
        const results = fuseInstance.search(q).slice(0, 6);
        renderSuggestions(results);
      } else {
        // Fallback: simple includes
        const q2 = q.toLowerCase();
        const results = plantsData
          .filter(p => (p.name + p.scientificName + (p.otherNames || []).join(' ')).toLowerCase().includes(q2))
          .slice(0, 6);
        renderSuggestions(results);
      }
    };

    let debounceTimer;
    input.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => handleInput(e.target.value), 150);
      activeIndex = -1;
    });

    input.addEventListener('focus', (e) => {
      if (e.target.value.length >= 2) handleInput(e.target.value);
    });

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
      const items = suggestions.querySelectorAll('a');
      if (!items.length || suggestions.hidden) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
        items.forEach((it, i) => it.classList.toggle('is-active', i === activeIndex));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        items.forEach((it, i) => it.classList.toggle('is-active', i === activeIndex));
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        const slug = items[activeIndex].getAttribute('data-slug');
        if (slug) window.location.href = `/plant/${slug}`;
      } else if (e.key === 'Escape') {
        suggestions.hidden = true;
        input.blur();
      }
    });

    // Hide on outside click
    document.addEventListener('click', (e) => {
      if (!suggestions.contains(e.target) && e.target !== input) {
        suggestions.hidden = true;
      }
    });
  }

  initSearchSuggestions('heroSearch', 'searchSuggestions', null);
  initSearchSuggestions('quickSearch', 'searchSuggestions', 'quickSearchForm');

  /* ════════════════════════════════════════════════════════════
     6. Search results page (fuzzy search with Fuse.js)
     ════════════════════════════════════════════════════════════ */
  async function renderSearchResults() {
    const grid = document.getElementById('plantGrid');
    const noResults = document.getElementById('noResults');
    const meta = document.getElementById('resultsMeta');
    const plantsDataScript = document.getElementById('plantsData');
    if (!grid) return;

    // Get query from URL or input
    const params = new URLSearchParams(window.location.search);
    const q = (params.get('q') || '').trim();
    if (!q) return;

    await loadPlants();
    let results = [];

    if (fuseInstance) {
      results = fuseInstance.search(q).map(r => ({ ...r.item, score: r.score }));
    } else {
      const q2 = q.toLowerCase();
      results = plantsData.filter(p =>
        [p.name, p.scientificName, p.family, p.category, p.shortDescription,
        ...(p.otherNames || []), ...(p.tags || []), ...(p.medicinalUses || [])]
        .join(' ').toLowerCase().includes(q2)
      );
    }

    if (!results.length) {
      grid.style.display = 'none';
      if (noResults) noResults.hidden = false;
      if (meta) meta.innerHTML = `No matches for "<strong>${q}</strong>". Try a different spelling.`;
      return;
    }

    if (meta) {
      meta.innerHTML = `Found <strong>${results.length}</strong> plant${results.length !== 1 ? 's' : ''} matching "<strong>${q}</strong>"`;
    }

    grid.innerHTML = results.map((p, i) => `
      <a href="/plant/${p.slug}" class="plant-card reveal is-revealed" style="--delay: ${(i % 12) * 60}ms">
        <div class="plant-card-media">
          <img src="${p.image}" alt="${p.name}" loading="lazy" />
          <span class="plant-card-tag">${p.category}</span>
        </div>
        <div class="plant-card-body">
          <h3 class="plant-card-title">${p.name}</h3>
          <p class="plant-card-latin"><em>${p.scientificName}</em></p>
          <p class="plant-card-desc">${p.shortDescription}</p>
          <span class="plant-card-link">View specimen &rarr;</span>
        </div>
      </a>
    `).join('');
  }

  // Run search if we're on the search page
  if (document.getElementById('plantsData')) {
    renderSearchResults();

    // Suggestion chips on search page
    document.querySelectorAll('[data-search]').forEach(chip => {
      chip.addEventListener('click', () => {
        const input = document.getElementById('searchInput');
        if (input) {
          input.value = chip.getAttribute('data-search');
          document.getElementById('searchForm').submit();
        }
      });
    });

    // Live suggestions on search page input
    initSearchSuggestions('searchInput', 'liveSuggestions', 'searchForm');
  }

  /* ════════════════════════════════════════════════════════════
     7. QR Code generation
     Uses QRCode.js (loaded from CDN in footer)
     ════════════════════════════════════════════════════════════ */
  function renderQRCode(element, url, size) {
    if (!element || !window.QRCode) return;
    element.innerHTML = '';
    // eslint-disable-next-line no-new
    new window.QRCode(element, {
      text: url,
      width: size || 128,
      height: size || 128,
      colorDark: '#2d5a3d',
      colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel.M
    });
  }

  // Plant detail sidebar QR
  const qrBox = document.getElementById('qrBox');
  if (qrBox) {
    const url = qrBox.getAttribute('data-url');
    renderQRCode(qrBox, url, 180);

    // Download QR as a print-ready label image (with quiet zone + plant name)
    const qrDownload = document.getElementById('qrDownload');
    if (qrDownload) {
      qrDownload.addEventListener('click', () => {
        const srcCanvas = qrBox.querySelector('canvas');
        if (!srcCanvas) return;

        const plantNameEl = document.querySelector('.plant-title');
        const latinNameEl = document.querySelector('.plant-scientific');
        const plantName = plantNameEl ? plantNameEl.textContent.trim() : 'Plant';
        const latinName = latinNameEl ? latinNameEl.textContent.trim() : '';
        const slug = url.split('/').pop();

        // Compose a larger canvas with:
        //   ┌──────────────────────────────┐
        //   │  Plant Name (serif, bold)     │  ← header label
        //   │  Scientific name (italic)     │
        //   │  ┌──────────────────────┐    │
        //   │  │                      │    │
        //   │  │   QR CODE (centered) │    │  ← quiet zone margin around QR
        //   │  │                      │    │
        //   │  └──────────────────────┘    │
        //   │  /plant/slug                  │  ← URL footer
        //   └──────────────────────────────┘
        const qrSize = srcCanvas.width;            // 180
        const quietZone = Math.max(20, Math.round(qrSize * 0.12)); // ~22px margin (≈ 4 QR modules)
        const padX = 40;
        const padTop = 90;
        const padBottom = 60;
        const outW = qrSize + quietZone * 2 + padX * 2;
        const outH = qrSize + quietZone * 2 + padTop + padBottom;

        const out = document.createElement('canvas');
        out.width = outW;
        out.height = outH;
        const ctx = out.getContext('2d');

        // 1. White background (essential for QR scanners)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outW, outH);

        // 2. Plant name header (serif, bold, dark green)
        ctx.fillStyle = '#2d5a3d';
        ctx.font = 'bold 30px "Cormorant Garamond", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(plantName, outW / 2, 20);

        // 3. Scientific name (italic, gray)
        if (latinName) {
          ctx.fillStyle = '#6b7a6b';
          ctx.font = 'italic 16px "Inter", sans-serif';
          ctx.fillText(latinName, outW / 2, 58);
        }

        // 4. QR code centered with quiet zone
        const qrX = (outW - qrSize) / 2;
        const qrY = padTop;
        ctx.drawImage(srcCanvas, qrX, qrY);

        // 5. URL footer
        ctx.fillStyle = '#6b7a6b';
        ctx.font = '13px "SF Mono", Monaco, monospace';
        ctx.fillText(`/plant/${slug}`, outW / 2, outH - 30);

        // 6. Download
        const link = document.createElement('a');
        link.download = `qr-${slug}.png`;
        link.href = out.toDataURL('image/png');
        link.click();
      });
    }

    // Copy link
    const qrCopy = document.getElementById('qrCopy');
    if (qrCopy) {
      qrCopy.addEventListener('click', async () => {
        const urlToCopy = qrCopy.getAttribute('data-url');
        try {
          await navigator.clipboard.writeText(urlToCopy);
          const originalText = qrCopy.textContent;
          qrCopy.textContent = '✓ Copied!';
          qrCopy.classList.add('btn-primary');
          qrCopy.classList.remove('btn-ghost');
          setTimeout(() => {
            qrCopy.textContent = originalText;
            qrCopy.classList.remove('btn-primary');
            qrCopy.classList.add('btn-ghost');
          }, 1800);
        } catch (e) {
          // Fallback
          const tmp = document.createElement('input');
          tmp.value = urlToCopy;
          document.body.appendChild(tmp);
          tmp.select();
          document.execCommand('copy');
          document.body.removeChild(tmp);
          qrCopy.textContent = '✓ Copied!';
          setTimeout(() => { qrCopy.textContent = 'Copy link'; }, 1800);
        }
      });
    }
  }

  // QR codes index page — render all
  const qrCards = document.querySelectorAll('.qr-card-qr');
  if (qrCards.length && window.QRCode) {
    qrCards.forEach(el => {
      const url = el.getAttribute('data-url');
      renderQRCode(el, url, 120);
    });
  }

  // Re-render QR codes when the QRCode library finishes loading
  // (handles the case where main.js runs before CDN script)
  window.addEventListener('load', () => {
    if (window.QRCode) {
      if (qrBox) {
        const url = qrBox.getAttribute('data-url');
        if (!qrBox.querySelector('canvas')) renderQRCode(qrBox, url, 180);
      }
      qrCards.forEach(el => {
        if (!el.querySelector('canvas')) {
          renderQRCode(el, el.getAttribute('data-url'), 120);
        }
      });
    }
  });

})();
