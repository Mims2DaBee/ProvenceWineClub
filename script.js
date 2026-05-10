(function () {
  'use strict';
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxVLJOqJp1nbaFZKIC4O44ilDkc9btLoFAztQqlIMayioIqIidpsPZzMcksHnMj6gB3/exec';
  const TURNSTILE_SITE_KEY = '0x4AAAAAADMnK9ZRozokdcfM';

  /* ===== DOM ===== */
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav__toggle');
  const drawer = document.getElementById('nav-drawer');
  const contactForms = document.querySelectorAll('.contact__form[data-form-type]');
  const turnstileWidgets = document.querySelectorAll('[data-turnstile-widget]');

  /* ===== Nav scroll ===== */
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 80);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ===== Nav drawer ===== */
  const closeDrawer = () => {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.classList.remove('is-open');
    nav?.classList.remove('drawer-open');
    document.body.style.overflow = '';
  };

  if (toggle && drawer) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      toggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
      drawer.setAttribute('aria-hidden', String(open));
      drawer.classList.toggle('is-open', !open);
      nav?.classList.toggle('drawer-open', !open);
      document.body.style.overflow = open ? '' : 'hidden';
    });

    const closeBtn = drawer.querySelector('.nav__drawer-close');
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    drawer.querySelectorAll('.nav__drawer-link').forEach((link) => {
      link.addEventListener('click', closeDrawer);
    });
  }

  /* ===== Forms ===== */
  contactForms.forEach((form) => {
    const renderedAt = form.querySelector('input[name="rendered_at"]');
    if (renderedAt) renderedAt.value = String(Date.now());
  });

  const renderTurnstileWidgets = () => {
    if (!window.turnstile) return;

    turnstileWidgets.forEach((widget) => {
      if (widget.dataset.widgetId) return;

      const form = widget.closest('form');
      const tokenInput = form?.querySelector('input[name="turnstile_token"]');
      if (!form || !tokenInput) return;

      const widgetId = window.turnstile.render(widget, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'dark',
        size: 'flexible',
        callback: (token) => {
          tokenInput.value = token || '';
        },
        'expired-callback': () => {
          tokenInput.value = '';
        },
        'error-callback': () => {
          tokenInput.value = '';
        }
      });

      widget.dataset.widgetId = String(widgetId);
    });
  };

  window.onTurnstileLoad = renderTurnstileWidgets;

  if (turnstileWidgets.length) {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }

  const submitToGoogleSheets = async (payload) => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
      throw new Error('Google Apps Script URL missing.');
    }

    const body = new URLSearchParams(payload);
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || 'Sorry, something went wrong. Please try again.');
    }
  };

  const getTurnstileToken = (form) => (
    form.querySelector('input[name="turnstile_token"]')?.value ||
    form.querySelector('textarea[name="cf-turnstile-response"]')?.value ||
    form.querySelector('input[name="cf-turnstile-response"]')?.value ||
    ''
  );

  const resetTurnstile = (form) => {
    if (!window.turnstile) return;
    const widget = form.querySelector('[data-turnstile-widget]');
    const tokenInput = form.querySelector('input[name="turnstile_token"]');
    if (tokenInput) tokenInput.value = '';
    if (widget?.dataset.widgetId) window.turnstile.reset(widget.dataset.widgetId);
  };

  const buildFormPayload = (form) => {
    const formData = new FormData(form);
    const formType = form.dataset.formType || formData.get('form_type') || '';
    const payload = {
      form_type: formType,
      first_name: String(formData.get('first_name') || '').trim(),
      name: String(formData.get('name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      event_type: String(formData.get('event_type') || '').trim(),
      website: String(formData.get('website') || '').trim(),
      rendered_at: String(formData.get('rendered_at') || ''),
      turnstile_token: getTurnstileToken(form),
      page: window.location.href,
      user_agent: navigator.userAgent,
      submitted_at: new Date().toISOString()
    };

    if (formType === 'newsletter_signup' && !payload.email) {
      throw new Error('Please enter your email address.');
    }

    if (formType === 'event_enquiry' && (!payload.name || !payload.email || !payload.event_type)) {
      throw new Error('Please complete your name, email, and enquiry type.');
    }

    if (!payload.turnstile_token) {
      throw new Error('Please complete the anti-spam check.');
    }

    return payload;
  };

  contactForms.forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn?.textContent;
      const successMessage = form.dataset.formType === 'newsletter_signup'
        ? "Thank you. You're on the list."
        : "Thank you. We'll be in touch about your enquiry.";

      submitBtn?.setAttribute('disabled', 'true');
      if (submitBtn) submitBtn.textContent = form.dataset.formType === 'newsletter_signup' ? 'Submitting...' : 'Sending...';

      try {
        await submitToGoogleSheets(buildFormPayload(form));
        alert(successMessage);
        form.reset();
        const renderedAt = form.querySelector('input[name="rendered_at"]');
        if (renderedAt) renderedAt.value = String(Date.now());
        resetTurnstile(form);
      } catch (err) {
        alert(err?.message || 'Sorry, something went wrong. Please try again.');
        console.error(err);
      } finally {
        submitBtn?.removeAttribute('disabled');
        if (submitBtn && originalText) submitBtn.textContent = originalText;
      }
    });
  });

  /* ===== Scroll reveal ===== */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ===== Smooth scroll ===== */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ===== Gallery infinite scroll — duplicate track ===== */
  const track = document.querySelector('.gallery__track');
  if (track) {
    const clone = track.innerHTML;
    track.innerHTML += clone;
  }
})();
