(() => {
  const buttons = document.querySelectorAll('[data-header-popover]');
  const popovers = document.querySelectorAll('.sg-header-popover');

  function closeAll(except) {
    popovers.forEach(pop => {
      if (pop !== except) pop.classList.remove('is-open');
    });
    buttons.forEach(btn => {
      const target = document.getElementById(btn.dataset.headerPopover || '');
      btn.setAttribute('aria-expanded', target && target.classList.contains('is-open') ? 'true' : 'false');
    });
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.headerPopover || '');
      if (!target) return;
      const opening = !target.classList.contains('is-open');
      closeAll(target);
      target.classList.toggle('is-open', opening);
      btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
      if (opening && target.id === 'shopSearchPopover') {
        setTimeout(() => target.querySelector('input')?.focus(), 50);
      }
    });
  });

  document.querySelectorAll('[data-popover-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.sg-header-popover')?.classList.remove('is-open');
      closeAll();
    });
  });

  document.addEventListener('click', event => {
    if (event.target.closest('.sg-header-popover') || event.target.closest('[data-header-popover]')) return;
    closeAll();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeAll();
  });

  const searchInput = document.querySelector('[data-shop-search]');
  const searchButton = document.querySelector('[data-shop-search-submit]');
  const emptyMessage = document.querySelector('[data-search-empty]');

  function runSearch() {
    const query = (searchInput?.value || '').trim().toLowerCase();
    const cards = [...document.querySelectorAll('[data-product-grid] > *')].filter(el => !el.classList.contains('catalog-loading'));
    if (!cards.length) return;

    let matches = 0;
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      const hit = !query || text.includes(query);
      card.style.display = hit ? '' : 'none';
      if (hit) matches += 1;
    });

    if (emptyMessage) emptyMessage.style.display = query && matches === 0 ? 'block' : 'none';
    if (matches > 0 || !query) {
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.getElementById('shopSearchPopover')?.classList.remove('is-open');
      closeAll();
    }
  }

  searchButton?.addEventListener('click', runSearch);
  searchInput?.addEventListener('keydown', event => {
    if (event.key === 'Enter') runSearch();
  });

  const observer = new MutationObserver(() => {
    if (!searchInput || !searchInput.value.trim()) return;
    runSearch();
  });
  const grid = document.querySelector('[data-product-grid]');
  if (grid) observer.observe(grid, { childList: true });
})();
