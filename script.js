(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Sticky header state ---------- */
  var header = document.getElementById('site-header');
  if (header) {
    var headerTicking = false;
    function updateHeader() {
      headerTicking = false;
      header.classList.toggle('is-scrolled', window.scrollY > 12);
    }
    window.addEventListener('scroll', function () {
      if (!headerTicking) { requestAnimationFrame(updateHeader); headerTicking = true; }
    }, { passive: true });
    updateHeader();
  }

  /* ---------- Mobile nav ---------- */
  var menuToggle = document.getElementById('menu-toggle');
  var menuClose = document.getElementById('menu-close');
  var mobileNav = document.getElementById('mobile-nav');
  if (menuToggle && mobileNav) {
    function openNav() {
      mobileNav.classList.add('is-open');
      menuToggle.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('nav-open');
      var firstLink = mobileNav.querySelector('a');
      if (firstLink) firstLink.focus();
    }
    function closeNav() {
      mobileNav.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('nav-open');
      menuToggle.focus();
    }
    menuToggle.addEventListener('click', function () {
      if (mobileNav.classList.contains('is-open')) closeNav(); else openNav();
    });
    if (menuClose) menuClose.addEventListener('click', closeNav);
    mobileNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeNav);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileNav.classList.contains('is-open')) closeNav();
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    } else {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
      revealEls.forEach(function (el) { revealObserver.observe(el); });
    }
  }

  /* ==========================================================================
     TRABAJOS — gallery carousel

     BUG FIX: this previously switched to display:grid at desktop widths,
     which showed all six tiles at once with overflow:visible — meaning
     there was nothing left to scroll, so scrollBy() (what the prev/next
     buttons called) silently did nothing. The CSS no longer does that;
     .work-gallery stays a real scroll container at every width, and
     .work-track (the inner flex row) is what desktop now animates via
     transform instead of relying on native scrolling.

     Mobile/tablet: native scroll + scroll-snap handles everything, the
     buttons just nudge scrollLeft by one tile as a progressive enhancement.
     Desktop (>=1024px, matching the CSS breakpoint that switches the
     gallery to overflow:hidden): JS tracks a currentIndex and slides
     .work-track with a CSS transition, clamped so it can never scroll past
     the last tile — which is also how the buttons know when to disable.
     ========================================================================== */
  var workGallery = document.getElementById('work-gallery');
  var workTrack = document.getElementById('work-track');
  var workPrev = document.getElementById('work-prev');
  var workNext = document.getElementById('work-next');
  if (workGallery && workTrack && workPrev && workNext) {
    var workItems = Array.prototype.slice.call(workTrack.querySelectorAll('.work-item'));
    var workIndex = 0;
    var desktopQuery = window.matchMedia('(min-width: 1024px)');

    function workTileStep() {
      var trackStyle = getComputedStyle(workTrack);
      var gap = parseFloat(trackStyle.columnGap || trackStyle.gap || '0') || 0;
      var item = workItems[0];
      return item ? item.getBoundingClientRect().width + gap : 0;
    }

    function updateDesktopCarousel(instantSnap) {
      if (!desktopQuery.matches) {
        workTrack.style.transform = '';
        return;
      }
      var step = workTileStep();
      var maxScroll = Math.max(0, workTrack.scrollWidth - workGallery.clientWidth);
      var maxIndex = step ? Math.ceil(maxScroll / step) : 0;
      if (workIndex > maxIndex) workIndex = maxIndex;
      if (workIndex < 0) workIndex = 0;
      var translate = -Math.min(workIndex * step, maxScroll);
      if (instantSnap) {
        // The wrap-around jump (last group -> first, or first -> last) is
        // deliberately NOT animated — sliding the transform across the
        // entire track would look like a long reverse-scroll through
        // every image, which reads as more "broken" than a clean instant
        // cut. Every other move keeps the normal CSS transition.
        workTrack.style.transition = 'none';
        workTrack.style.transform = 'translateX(' + translate + 'px)';
        void workTrack.offsetWidth; // force reflow before restoring the transition
        workTrack.style.transition = '';
      } else {
        workTrack.style.transform = 'translateX(' + translate + 'px)';
      }
    }

    function goWork(direction) {
      if (desktopQuery.matches) {
        var step = workTileStep();
        var maxScroll = Math.max(0, workTrack.scrollWidth - workGallery.clientWidth);
        var maxIndex = step ? Math.ceil(maxScroll / step) : 0;
        var atEnd = direction > 0 && workIndex >= maxIndex;
        var atStart = direction < 0 && workIndex <= 0;

        if (atEnd) {
          workIndex = 0;
          updateDesktopCarousel(true);
        } else if (atStart) {
          workIndex = maxIndex;
          updateDesktopCarousel(true);
        } else {
          workIndex += direction;
          updateDesktopCarousel(false);
        }
      } else {
        // Mobile/tablet: native scroll container. Loop the same way — an
        // instant jump only at the boundary, a normal smooth nudge otherwise.
        var step = workTileStep();
        var maxScrollMobile = workGallery.scrollWidth - workGallery.clientWidth;
        var atEndScroll = direction > 0 && workGallery.scrollLeft >= maxScrollMobile - 1;
        var atStartScroll = direction < 0 && workGallery.scrollLeft <= 1;

        if (atEndScroll) {
          workGallery.scrollTo({ left: 0, behavior: 'auto' });
        } else if (atStartScroll) {
          workGallery.scrollTo({ left: maxScrollMobile, behavior: 'auto' });
        } else {
          workGallery.scrollBy({ left: step * direction, behavior: reduceMotion ? 'auto' : 'smooth' });
        }
      }
    }

    workPrev.addEventListener('click', function () { goWork(-1); });
    workNext.addEventListener('click', function () { goWork(1); });

    var resizeTicking = false;
    window.addEventListener('resize', function () {
      if (!resizeTicking) {
        resizeTicking = true;
        requestAnimationFrame(function () { updateDesktopCarousel(); resizeTicking = false; });
      }
    });
    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener('change', function () { workIndex = 0; updateDesktopCarousel(); });
    }
    updateDesktopCarousel();
  }

  /* ==========================================================================
     SERVICES + TIME SLOTS — single source of truth for the booking modal.
     The visible service cards keep their own hand-written HTML (needed for
     SEO / no-JS legibility); this array is what the modal's step 1 list and
     the WhatsApp message are built from, referenced by the same ids the
     cards carry in data-service-id, so nothing is duplicated beyond
     necessity — one canonical place per representation.
     ========================================================================== */
  var SERVICES = [
    { id: 'corte', name: 'Corte', price: '₡4.500', duration: '45 min' },
    { id: 'corte-lavado', name: 'Corte + Lavado', price: '₡6.500', duration: '60 min' },
    { id: 'corte-barba', name: 'Corte + Barba', price: '₡7.000', duration: '75 min' },
    { id: 'barba', name: 'Barba', price: '₡4.000', duration: '45 min' },
    { id: 'corte-nino', name: 'Corte de niño', price: '₡4.000', duration: '45 min' },
    { id: 'corte-diseno', name: 'Corte + Diseño', price: '₡7.500', duration: '60 min' },
    { id: 'cejas', name: 'Cejas', price: '₡1.500', duration: '15 min' }
  ];
  var TIME_SLOTS = ['9:00 a.m.', '10:00 a.m.', '11:00 a.m.', '1:00 p.m.', '2:00 p.m.', '3:00 p.m.', '4:00 p.m.', '5:00 p.m.'];

  function findService(id) {
    for (var i = 0; i < SERVICES.length; i++) { if (SERVICES[i].id === id) return SERVICES[i]; }
    return null;
  }

  /* ============================================================
     WhatsApp number — LIVE.
     ============================================================ */
  var WHATSAPP_NUMBER = '50671145245';

  // Real value supplied this round.
  var MAPS_URL = 'https://maps.app.goo.gl/m4Y7idLmGQZssczp9?g_st=aw';

  /* ---------- Booking modal ---------- */
  var bookingModal = document.getElementById('booking-modal');
  var bookingBackdrop = document.getElementById('booking-modal-backdrop');
  if (bookingModal && bookingBackdrop) {
    var modalBody = document.getElementById('booking-modal-body');
    var modalSteps = Array.prototype.slice.call(modalBody.querySelectorAll('.booking-step'));
    var stepLabel = document.getElementById('booking-modal-step-label');
    var backBtn = document.getElementById('booking-modal-back');
    var nextBtn = document.getElementById('booking-modal-next');
    var closeBtn = document.getElementById('booking-modal-close');
    var errorEl = document.getElementById('booking-modal-error');
    var serviceList = document.getElementById('booking-service-list');
    var timeList = document.getElementById('booking-time-list');
    var dateInput = document.getElementById('booking-date-input');
    var nameInput = document.getElementById('booking-name-input');
    var summaryEl = document.getElementById('booking-summary');
    var whatsappNote = document.getElementById('booking-whatsapp-note');

    var TOTAL_STEPS = modalSteps.length;
    var currentStep = 1;
    var lastFocusedEl = null;
    var state = { serviceId: '', dateValue: '', dateLabel: '', time: '', name: '' };

    SERVICES.forEach(function (svc) {
      var opt = document.createElement('button');
      opt.type = 'button';
      opt.className = 'booking-option';
      opt.setAttribute('role', 'radio');
      opt.setAttribute('aria-checked', 'false');
      opt.dataset.serviceId = svc.id;
      opt.innerHTML = '<span class="booking-option-name">' + svc.name + '</span>' +
        '<span class="booking-option-meta">' + svc.duration + ' · ' + svc.price + '</span>';
      opt.addEventListener('click', function () {
        state.serviceId = svc.id;
        refreshOptionSelection(serviceList, svc.id, 'serviceId');
        clearError();
      });
      serviceList.appendChild(opt);
    });

    TIME_SLOTS.forEach(function (t) {
      var opt = document.createElement('button');
      opt.type = 'button';
      opt.className = 'booking-option';
      opt.setAttribute('role', 'radio');
      opt.setAttribute('aria-checked', 'false');
      opt.dataset.time = t;
      opt.innerHTML = '<span class="mono">' + t + '</span>';
      opt.addEventListener('click', function () {
        state.time = t;
        refreshOptionSelection(timeList, t, 'time');
        clearError();
      });
      timeList.appendChild(opt);
    });

    function refreshOptionSelection(listEl, value, stateKey) {
      Array.prototype.forEach.call(listEl.children, function (opt) {
        var matches = stateKey === 'serviceId' ? opt.dataset.serviceId === value : opt.dataset.time === value;
        opt.setAttribute('aria-checked', matches ? 'true' : 'false');
      });
    }

    dateInput.min = new Date().toISOString().slice(0, 10);
    dateInput.addEventListener('input', function () {
      state.dateValue = dateInput.value;
      if (dateInput.value) {
        var d = new Date(dateInput.value + 'T00:00:00');
        var formatted = new Intl.DateTimeFormat('es-CR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
        state.dateLabel = formatted.charAt(0).toUpperCase() + formatted.slice(1);
      } else {
        state.dateLabel = '';
      }
      clearError();
    });

    nameInput.addEventListener('input', function () { state.name = nameInput.value; clearError(); });

    function clearError() { errorEl.hidden = true; errorEl.textContent = ''; }
    function showError(msg) { errorEl.textContent = msg; errorEl.hidden = false; }

    function validateStep(step) {
      if (step === 1 && !state.serviceId) { showError('Elegí un servicio para continuar.'); return false; }
      if (step === 2 && !state.dateValue) { showError('Elegí una fecha para continuar.'); return false; }
      if (step === 3 && !state.time) { showError('Elegí una hora para continuar.'); return false; }
      if (step === 4 && !state.name.trim()) { showError('Ingresá tu nombre para continuar.'); return false; }
      return true;
    }

    function escapeHtml(str) {
      var div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function renderSummary() {
      var svc = findService(state.serviceId);
      summaryEl.innerHTML = '';
      [
        ['Servicio', svc ? svc.name : '—'],
        ['Fecha', state.dateLabel || '—'],
        ['Hora', state.time || '—'],
        ['Nombre', state.name || '—']
      ].forEach(function (pair) {
        var row = document.createElement('div');
        row.className = 'booking-summary-row';
        row.innerHTML = '<dt>' + pair[0] + '</dt><dd>' + escapeHtml(pair[1]) + '</dd>';
        summaryEl.appendChild(row);
      });
      whatsappNote.hidden = !!WHATSAPP_NUMBER;
    }

    function showStep(step) {
      currentStep = step;
      modalSteps.forEach(function (el) {
        el.hidden = parseInt(el.dataset.step, 10) !== step;
      });
      stepLabel.textContent = 'PASO ' + step + ' DE ' + TOTAL_STEPS;
      backBtn.hidden = step === 1;
      nextBtn.textContent = step === TOTAL_STEPS ? 'Confirmar y enviar por WhatsApp' : 'Siguiente';
      clearError();
      if (step === TOTAL_STEPS) renderSummary();
      var firstFocusable = modalBody.querySelector('.booking-step:not([hidden]) button, .booking-step:not([hidden]) input');
      if (firstFocusable) firstFocusable.focus({ preventScroll: true });
      modalBody.scrollTop = 0;
    }

    function buildWhatsAppMessage() {
      var svc = findService(state.serviceId);
      return [
        'Hola Andrés, quiero reservar una cita.',
        '',
        'Servicio: ' + (svc ? svc.name : '—'),
        'Fecha: ' + (state.dateLabel || '—'),
        'Hora: ' + (state.time || '—'),
        'Nombre: ' + (state.name || '—')
      ].join('\n');
    }

    nextBtn.addEventListener('click', function () {
      if (!validateStep(currentStep)) return;
      if (currentStep < TOTAL_STEPS) {
        showStep(currentStep + 1);
        return;
      }
      if (!WHATSAPP_NUMBER) {
        showError('No pudimos abrir WhatsApp. Intentá de nuevo en un momento.');
        return;
      }
      var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(buildWhatsAppMessage());
      window.open(url, '_blank', 'noopener,noreferrer');
      closeBooking();
    });

    backBtn.addEventListener('click', function () {
      if (currentStep > 1) showStep(currentStep - 1);
    });

    function getFocusable() {
      return Array.prototype.slice.call(
        bookingModal.querySelectorAll('button:not([hidden]):not([disabled]), input:not([hidden]), a[href]')
      ).filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
    }

    function trapFocus(e) {
      if (e.key !== 'Tab') return;
      var focusable = getFocusable();
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }

    function onKeydown(e) {
      if (e.key === 'Escape') { closeBooking(); return; }
      trapFocus(e);
    }

    function openBooking(preselectServiceId, triggerEl) {
      lastFocusedEl = triggerEl || document.activeElement;
      state = { serviceId: preselectServiceId || '', dateValue: '', dateLabel: '', time: '', name: '' };
      dateInput.value = '';
      nameInput.value = '';
      refreshOptionSelection(serviceList, state.serviceId, 'serviceId');
      refreshOptionSelection(timeList, '', 'time');

      bookingBackdrop.hidden = false;
      bookingModal.hidden = false;
      document.documentElement.classList.add('booking-open');
      void bookingModal.offsetWidth; // force reflow so the open transition runs
      bookingBackdrop.classList.add('is-open');
      bookingModal.classList.add('is-open');

      showStep(preselectServiceId ? 2 : 1);
      document.addEventListener('keydown', onKeydown);
      bookingBackdrop.addEventListener('click', closeBooking);
    }

    function closeBooking() {
      bookingBackdrop.classList.remove('is-open');
      bookingModal.classList.remove('is-open');
      document.documentElement.classList.remove('booking-open');
      document.removeEventListener('keydown', onKeydown);
      bookingBackdrop.removeEventListener('click', closeBooking);
      var hide = function () {
        bookingBackdrop.hidden = true;
        bookingModal.hidden = true;
      };
      if (reduceMotion) { hide(); } else { setTimeout(hide, 380); }
      if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') lastFocusedEl.focus();
    }

    closeBtn.addEventListener('click', closeBooking);

    document.querySelectorAll('.service-card[data-service-id]').forEach(function (card) {
      card.addEventListener('click', function () { openBooking(card.dataset.serviceId, card); });
    });

    ['header-cta', 'mobile-nav-cta', 'services-main-cta', 'barber-cta', 'booking-cta', 'contact-book-btn'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', function (e) {
        e.preventDefault();
        openBooking('', el);
      });
    });
  }

  /* ---------- WhatsApp (question) + Maps links ----------
     WHATSAPP_NUMBER / MAPS_URL are defined above, next to the booking
     modal — both drive every link below so each value lives in one place. */
  var whatsappLink = document.getElementById('whatsapp-link');
  if (whatsappLink) {
    if (WHATSAPP_NUMBER) {
      whatsappLink.href = 'https://wa.me/' + WHATSAPP_NUMBER;
      whatsappLink.target = '_blank';
      whatsappLink.rel = 'noopener noreferrer';
    } else {
      whatsappLink.href = '#reserva';
      whatsappLink.removeAttribute('target');
      whatsappLink.removeAttribute('rel');
    }
  }

  [document.getElementById('directions-link'), document.getElementById('map-panel-link'), document.getElementById('contact-maps-link')]
    .forEach(function (el) {
      if (!el) return;
      if (MAPS_URL) {
        el.href = MAPS_URL;
        el.target = '_blank';
        el.rel = 'noopener noreferrer';
      } else {
        el.href = '#ubicacion';
        el.removeAttribute('target');
        el.removeAttribute('rel');
      }
    });
})();
