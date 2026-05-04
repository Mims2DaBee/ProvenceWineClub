(function () {
  'use strict';
  const GOOGLE_SCRIPT_URL = 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';

  /* ===== DOM ===== */
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav__toggle');
  const drawer = document.getElementById('nav-drawer');
  const signupForm = document.getElementById('signup-form');
  const eventForm = document.getElementById('event-form');

  /* ===== Nav scroll ===== */
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 80);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ===== Nav drawer ===== */
  const closeDrawer = () => {
    toggle.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.classList.remove('is-open');
    document.body.style.overflow = '';
  };

  if (toggle && drawer) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      drawer.setAttribute('aria-hidden', String(open));
      drawer.classList.toggle('is-open', !open);
      document.body.style.overflow = open ? '' : 'hidden';
    });

    const closeBtn = drawer.querySelector('.nav__drawer-close');
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    drawer.querySelectorAll('.nav__drawer-link').forEach((link) => {
      link.addEventListener('click', closeDrawer);
    });
  }

  /* ===== Forms ===== */
  const submitToGoogleSheets = async (payload) => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
      throw new Error('Google Apps Script URL missing.');
    }

    const body = new URLSearchParams(payload);
    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body
    });

    if (!res.ok) {
      throw new Error('Submission failed.');
    }
  };

  signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = signupForm.querySelector('button[type="submit"]');
    const firstName = signupForm.querySelector('input[name="first_name"]')?.value?.trim() || '';
    const email = signupForm.querySelector('input[name="email"]')?.value?.trim() || '';

    if (!email) return;

    submitBtn?.setAttribute('disabled', 'true');
    const originalText = submitBtn?.textContent;
    if (submitBtn) submitBtn.textContent = 'Submitting...';

    try {
      await submitToGoogleSheets({
        form_type: 'newsletter_signup',
        first_name: firstName,
        email,
        page: window.location.href,
        submitted_at: new Date().toISOString()
      });
      alert("Thank you. You're on the list.");
      signupForm.reset();
    } catch (err) {
      alert('Sorry, signup is not connected yet. Please add the Google Apps Script URL in script.js.');
      console.error(err);
    } finally {
      submitBtn?.removeAttribute('disabled');
      if (submitBtn && originalText) submitBtn.textContent = originalText;
    }
  });

  eventForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = eventForm.querySelector('button[type="submit"]');
    const name = eventForm.querySelector('input[name="name"]')?.value?.trim() || '';
    const email = eventForm.querySelector('input[name="email"]')?.value?.trim() || '';
    const eventType = eventForm.querySelector('select[name="event_type"]')?.value?.trim() || '';

    if (!email || !eventType) return;

    submitBtn?.setAttribute('disabled', 'true');
    const originalText = submitBtn?.textContent;
    if (submitBtn) submitBtn.textContent = 'Sending...';

    try {
      await submitToGoogleSheets({
        form_type: 'event_enquiry',
        name,
        email,
        event_type: eventType,
        page: window.location.href,
        submitted_at: new Date().toISOString()
      });
      alert("Thank you. We'll be in touch about your event enquiry.");
      eventForm.reset();
    } catch (err) {
      alert('Sorry, event form is not connected yet. Please add the Google Apps Script URL in script.js.');
      console.error(err);
    } finally {
      submitBtn?.removeAttribute('disabled');
      if (submitBtn && originalText) submitBtn.textContent = originalText;
    }
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
