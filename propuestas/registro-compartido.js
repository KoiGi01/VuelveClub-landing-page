/* Shared, browser-only enrollment data for the platform design proposal. */
(() => {
  'use strict';
  const businessId = 'cafe-buen-dia';
  const defaults = Object.freeze({ name: 'Café Buen Día', reward: 'Un café de la casa', goal: 10, color: '#CBDE2A' });
  function enrollmentUrl(name, config) {
    const url = new URL(`/tarjeta/${businessId}`, location.origin);
    if (name !== defaults.name) url.searchParams.set('nombre', name);
    if (config.reward !== defaults.reward) url.searchParams.set('premio', config.reward);
    if (config.goal !== defaults.goal) url.searchParams.set('sellos', config.goal);
    if (config.color.toLowerCase() !== defaults.color.toLowerCase()) url.searchParams.set('color', config.color);
    return url.href;
  }
  function profileFromUrl() {
    if (location.pathname.replace(/\/$/, '') !== `/tarjeta/${businessId}`) return null;
    const query = new URLSearchParams(location.search);
    const goal = Number(query.get('sellos'));
    const color = query.get('color');
    return {
      id: businessId,
      name: query.get('nombre')?.trim().slice(0, 40) || defaults.name,
      reward: query.get('premio')?.trim().slice(0, 60) || defaults.reward,
      goal: [5, 8, 10, 12].includes(goal) ? goal : defaults.goal,
      color: /^#[0-9a-f]{6}$/i.test(color || '') ? color : defaults.color
    };
  }
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function matches(person, query) {
    const text = normalize(query.trim());
    if (!text) return true;
    if (normalize(`${person.name} ${person.email}`).includes(text)) return true;
    const digits = query.replace(/\D/g, '');
    return digits.length > 0 && !/[a-z]/i.test(text) && String(person.phone || '').replace(/\D/g, '').includes(digits);
  }
  function phone(value) {
    const raw = String(value).trim();
    if (!/^[+\d\s().-]+$/.test(raw)) return null;
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `+52${digits}`;
    if (digits.length === 12 && digits.startsWith('52')) return `+${digits}`;
    if (raw.startsWith('+') && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
    return null;
  }
  window.VuelveDemo = Object.freeze({ businessId, defaults, enrollmentUrl, profileFromUrl, matches, phone });
})();
