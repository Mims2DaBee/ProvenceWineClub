(function () {
  'use strict';
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxVLJOqJp1nbaFZKIC4O44ilDkc9btLoFAztQqlIMayioIqIidpsPZzMcksHnMj6gB3/exec';
  const TURNSTILE_SITE_KEY = '0x4AAAAAADSY7YxmEOWqdX6j';

  /* ===== DOM ===== */
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav__toggle');
  const drawer = document.getElementById('nav-drawer');
  const contactForms = document.querySelectorAll('.contact__form[data-form-type]');
  const turnstileWidgets = document.querySelectorAll('[data-turnstile-widget]');
  const newsletterModal = document.querySelector('[data-newsletter-modal]');
  const newsletterModalDismissedKey = 'pwc-newsletter-modal-dismissed';

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
  const setRenderedAt = (form) => {
    const renderedAt = form.querySelector('input[name="rendered_at"]');
    if (renderedAt) renderedAt.value = String(Date.now());
  };

  contactForms.forEach(setRenderedAt);

  const isWidgetVisible = (widget) => (
    !widget.closest('[aria-hidden="true"]') && widget.offsetParent !== null
  );

  const renderTurnstileWidget = (widget) => {
    if (!window.turnstile) return;
    if (!widget || widget.dataset.widgetId) return;

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
  };

  const renderTurnstileWidgets = () => {
    if (!window.turnstile) return;

    turnstileWidgets.forEach((widget) => {
      if (isWidgetVisible(widget)) renderTurnstileWidget(widget);
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
    if (!widget) return;
    if (!widget.dataset.widgetId) {
      renderTurnstileWidget(widget);
      return;
    }
    window.turnstile.reset(widget.dataset.widgetId);
  };

  const closeNewsletterModal = (remember = true) => {
    if (!newsletterModal) return;
    newsletterModal.classList.remove('is-open');
    newsletterModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('newsletter-modal-open');
    if (remember) {
      try {
        window.localStorage.setItem(newsletterModalDismissedKey, 'true');
      } catch (err) {
        // Ignore private browsing storage errors.
      }
    }
  };

  const openNewsletterModal = () => {
    if (!newsletterModal) return;
    const form = newsletterModal.querySelector('form');
    if (form) setRenderedAt(form);
    newsletterModal.classList.add('is-open');
    newsletterModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('newsletter-modal-open');
    if (form) resetTurnstile(form);
    window.setTimeout(() => {
      newsletterModal.querySelector('input[name="first_name"]')?.focus();
    }, 250);
  };

  if (newsletterModal) {
    let hasDismissed = false;
    try {
      hasDismissed = window.localStorage.getItem(newsletterModalDismissedKey) === 'true';
    } catch (err) {
      hasDismissed = false;
    }

    newsletterModal.querySelectorAll('[data-newsletter-close]').forEach((control) => {
      control.addEventListener('click', () => closeNewsletterModal(true));
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && newsletterModal.classList.contains('is-open')) {
        closeNewsletterModal(true);
      }
    });

    if (!hasDismissed) {
      window.setTimeout(openNewsletterModal, 850);
    }
  }

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
      hostname: window.location.hostname,
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

  const getFormStatus = (form) => {
    let status = form.querySelector('.contact__status');
    if (status) return status;
    status = document.createElement('p');
    status.className = 'contact__status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('tabindex', '-1');
    form.appendChild(status);
    return status;
  };

  contactForms.forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const status = getFormStatus(form);
      const originalText = submitBtn?.textContent;
      const successMessage = form.dataset.formType === 'newsletter_signup'
        ? "Thank you. You're on the list."
        : "Thank you. We'll be in touch about your enquiry.";

      submitBtn?.setAttribute('disabled', 'true');
      if (submitBtn) submitBtn.textContent = form.dataset.formType === 'newsletter_signup' ? 'Submitting...' : 'Sending...';
      status.dataset.state = 'pending';
      status.textContent = form.dataset.formType === 'newsletter_signup' ? 'Adding you to the list…' : 'Sending your enquiry…';

      try {
        await submitToGoogleSheets(buildFormPayload(form));
        status.dataset.state = 'success';
        status.textContent = successMessage;
        form.reset();
        setRenderedAt(form);
        resetTurnstile(form);
        status.focus({ preventScroll: false });
      } catch (err) {
        status.dataset.state = 'error';
        status.textContent = err?.message || 'Sorry, something went wrong. Please try again.';
        status.focus({ preventScroll: false });
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
