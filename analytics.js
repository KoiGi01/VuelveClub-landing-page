/* Landing analytics only. No form values, consumer enrollment or staff panels. */
(() => {
  'use strict';
  const allowed = new Set(['demo_cta_clicked', 'login_clicked', 'contact_clicked',
    'demo_form_started', 'demo_form_submitted', 'demo_form_success', 'demo_form_error',
    'demo_form_abandoned', 'scroll_depth', 'section_viewed']);
  const properties = new Set(['source', 'location', 'channel', 'depth', 'section', 'reason']);
  let sdk = null;
  let disabled = false;
  const queue = [];
  function capture(name, details = {}) {
    if (disabled || !allowed.has(name)) return;
    const safe = { page: 'landing' };
    for (const key of properties) {
      const value = details[key];
      if (typeof value === 'number' || (typeof value === 'string' && /^[a-z0-9_-]{1,40}$/.test(value))) safe[key] = value;
    }
    try {
      if (sdk) sdk.capture(name, safe);
      else if (queue.length < 100) queue.push([name, safe]);
    } catch { /* Analytics must never interrupt the lead form. */ }
  }
  window.VuelveAnalytics = Object.freeze({ capture });
  const cleanUrl = value => {
    try { const url = new URL(value); return url.origin + url.pathname; } catch { return ''; }
  };

  document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    const location = link.closest('header') ? 'header' : link.closest('footer') ? 'footer' : link.closest('#precio') ? 'pricing' : 'hero';
    if (href === '#demo') capture('demo_cta_clicked', { location });
    else if (link.classList.contains('head-login')) capture('login_clicked', { location });
    else if (href.startsWith('https://wa.me/')) capture('contact_clicked', { location, channel: 'whatsapp' });
    else if (href.startsWith('mailto:')) capture('contact_clicked', { location, channel: 'email' });
    else if (href === '/soporte') capture('contact_clicked', { location, channel: 'support' });
  });

  document.querySelectorAll('form[data-demo]').forEach(form => {
    let started = false;
    let succeeded = false;
    form.addEventListener('input', event => {
      if (event.target.name === 'company' || started) return;
      started = true;
      capture('demo_form_started', { source: form.dataset.source || 'demo' });
    });
    form.addEventListener('vuelve:lead-success', () => { succeeded = true; });
    window.addEventListener('pagehide', () => {
      if (started && !succeeded) capture('demo_form_abandoned', { source: form.dataset.source || 'demo' });
    });
  });

  const reached = new Set();
  let scheduled = false;
  function measureScroll() {
    scheduled = false;
    const height = document.documentElement.scrollHeight;
    const depth = Math.min(100, Math.round((window.scrollY + window.innerHeight) / height * 100));
    for (const milestone of [25, 50, 75, 90, 100]) {
      if (depth >= milestone && !reached.has(milestone)) {
        reached.add(milestone);
        capture('scroll_depth', { depth: milestone });
      }
    }
  }
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(measureScroll); }
  }, { passive: true });
  window.addEventListener('load', measureScroll, { once: true });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      capture('section_viewed', { section: entry.target.id || 'hero' });
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -15% 0px', threshold: .1 });
  document.querySelectorAll('section.wrap').forEach(section => observer.observe(section));

  async function boot() {
    try {
      const response = await fetch('/api/analytics-config', { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('Config unavailable');
      const config = await response.json();
      if (!config.enabled || !/^phc_[a-zA-Z0-9_-]+$/.test(config.token) || !['US', 'EU'].includes(config.region)) throw new Error('Disabled');
      const region = config.region.toLowerCase();
      const script = document.createElement('script');
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://${region}-assets.i.posthog.com/static/array.js`;
      script.onerror = () => { disabled = true; queue.length = 0; };
      script.onload = () => {
        try {
          window.posthog.init(config.token, {
            api_host: `https://${region}.i.posthog.com`,
            ui_host: `https://${region}.posthog.com`,
            defaults: '2026-01-30',
            autocapture: false,
            person_profiles: 'never',
            capture_pageview: true,
            capture_pageleave: true,
            capture_dead_clicks: false,
            capture_exceptions: false,
            capture_heatmaps: true,
            capture_performance: false,
            enable_recording_console_log: false,
            disable_session_recording: false,
            session_recording: {
              blockSelector: 'vuelve-support-chat',
              maskAllInputs: true,
              maskTextSelector: '.form-status, .form-error, [data-private]',
              recordBody: false,
              recordHeaders: false,
              maskCapturedNetworkRequestFn: request => ({ ...request,
                name: cleanUrl(request.name), requestBody: undefined, responseBody: undefined,
                requestHeaders: undefined, responseHeaders: undefined })
            },
            before_send: event => {
              // Remove query strings/fragments from automatic event and attribution URLs.
              for (const key of Object.keys(event.properties || {})) {
                if (/url|referrer|pathname/i.test(key) && typeof event.properties[key] === 'string') {
                  event.properties[key] = key.includes('pathname') ? location.pathname : cleanUrl(event.properties[key]);
                }
                if (/^\$?(initial_)?(utm_|gclid|fbclid|msclkid)/i.test(key)) delete event.properties[key];
              }
              return event;
            },
            loaded: instance => {
              sdk = instance;
              queue.splice(0).forEach(([name, details]) => capture(name, details));
            }
          });
        } catch { disabled = true; queue.length = 0; }
      };
      document.head.append(script);
    } catch { disabled = true; queue.length = 0; }
  }
  boot();
})();
