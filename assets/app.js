(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const menuButton = $('.menu-toggle');
  const mobileMenu = $('.mobile-nav');
  if (menuButton && mobileMenu) {
    menuButton.addEventListener('click', () => {
      const open = !mobileMenu.classList.contains('is-open');
      mobileMenu.classList.toggle('is-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.textContent = open ? '✕' : '☰';
    });
    $$('.mobile-nav a').forEach(a => a.addEventListener('click', () => {
      mobileMenu.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.textContent = '☰';
    }));
  }
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
  const header = $('.site-header');
  if (header) {
    const setShadow = () => header.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', setShadow, { passive: true }); setShadow();
  }

  const cards = $$('.property-card', $('#property-grid') || document);
  const locationSelect = $('#search-location');
  const typeSelect = $('#search-type');
  const budgetSelect = $('#search-budget');
  const count = $('#result-count');
  const empty = $('#empty-state');
  const plural = n => n === 1 ? 'وحدة واحدة' : n === 2 ? 'وحدتان' : `${n} وحدات`;
  function filterCards() {
    if (!cards.length) return;
    const location = locationSelect?.value || 'all';
    const type = typeSelect?.value || 'all';
    const budget = Number(budgetSelect?.value || 0);
    let shown = 0;
    for (const card of cards) {
      const matches = (location === 'all' || card.dataset.location === location) &&
        (type === 'all' || card.dataset.type === type) &&
        (!budget || Number(card.dataset.price) <= budget);
      card.hidden = !matches;
      if (matches) shown++;
    }
    if (count) count.textContent = `${plural(shown)} مطابقة للبحث`;
    if (empty) empty.hidden = shown !== 0;
    $$('.filter-chip').forEach(chip => chip.classList.toggle('active', chip.dataset.typeFilter === type));
  }
  $('#search-form')?.addEventListener('submit', event => {
    event.preventDefault(); filterCards();
    $('#properties')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $$('.filter-chip').forEach(chip => chip.addEventListener('click', () => {
    if (typeSelect) typeSelect.value = chip.dataset.typeFilter || 'all';
    filterCards();
  }));
  $('#reset-filters')?.addEventListener('click', () => {
    if (locationSelect) locationSelect.value = 'all';
    if (typeSelect) typeSelect.value = 'all';
    if (budgetSelect) budgetSelect.value = '0';
    filterCards();
  });
  filterCards();

  const form = $('#lead-form');
  const propertySelect = $('#lead-property');
  const queryProperty = new URLSearchParams(location.search).get('property');
  if (propertySelect && queryProperty && [...propertySelect.options].some(option => option.value === queryProperty)) {
    propertySelect.value = queryProperty;
  }
  $$('[data-inquire]').forEach(button => button.addEventListener('click', () => {
    const p = button.dataset.inquire;
    window.location.href = `/?property=${encodeURIComponent(p)}#contact`;
  }));
  if (form) {
    const button = $('#lead-submit');
    const status = $('#form-status');
    function showStatus(message, kind) {
      status.textContent = message;
      status.className = `form-status visible ${kind}`;
    }
    form.addEventListener('submit', async event => {
      event.preventDefault();
      status.className = 'form-status';
      const name = form.elements.namedItem('name').value.trim();
      const phone = form.elements.namedItem('phone').value.trim();
      const consent = form.elements.namedItem('consent').checked;
      const digits = phone.replace(/[^\d]/g, '');
      if (name.length < 2) { showStatus('من فضلك اكتب اسمك (حرفين على الأقل).', 'error'); $('#lead-name').focus(); return; }
      if (digits.length < 10 || digits.length > 15) { showStatus('من فضلك اكتب رقم موبايل صحيح، يشمل كود الدولة لو خارج مصر.', 'error'); $('#lead-phone').focus(); return; }
      if (!consent) { showStatus('لازم توافق على استخدام بياناتك للتواصل بخصوص الطلب.', 'error'); return; }
      const data = {
        name, phone,
        intent: form.elements.namedItem('intent').value,
        budget: form.elements.namedItem('budget').value,
        location: form.elements.namedItem('location').value,
        timeline: form.elements.namedItem('timeline').value,
        visitDate: form.elements.namedItem('visitDate').value,
        propertyId: form.elements.namedItem('propertyId').value,
        message: form.elements.namedItem('message').value.trim(),
        consent, website: form.elements.namedItem('website').value,
        source: 'website'
      };
      button.disabled = true;
      const original = button.innerHTML;
      button.textContent = 'جاري تسجيل الطلب...';
      try {
        const response = await fetch('/api/leads', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) throw new Error(result.message || 'تعذر إرسال الطلب. جرّب مرة تانية.');
        showStatus(`تم تسجيل طلبك بنجاح ✅ رقم المتابعة: ${result.reference}. إرسال الطلب لا يعني حجز الوحدة.`, 'success');
        form.reset();
        if (queryProperty && propertySelect) propertySelect.value = queryProperty;
      } catch (error) {
        showStatus(error.message === 'Failed to fetch' ? 'تعذر الاتصال بالخادم. لازم تشغّل الموقع عن طريق السيرفر المرفق، مش تفتح ملف HTML مباشرة.' : error.message, 'error');
      } finally { button.disabled = false; button.innerHTML = original; }
    });
  }
})();
