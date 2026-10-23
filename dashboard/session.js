(() => {
  let ready;
  async function deadline(promise, timeout = 25000) {
    let timer;
    return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('UNAVAILABLE')), timeout); })]).finally(() => clearTimeout(timer));
  }
  async function initialize() {
    if (location.origin !== 'https://app.vuelveclub.com') throw new Error('APP_ORIGIN_REQUIRED');
    if (!window.Clerk?.loaded) {
      const configResponse = await fetch('/api/auth-config', { signal: AbortSignal.timeout(10000) });
      const config = await configResponse.json();
      if (!configResponse.ok || !config.enabled || !/^pk_live_[A-Za-z0-9+/=]+$/.test(config.publishableKey)) throw new Error('UNAVAILABLE');
      const domain = atob(config.publishableKey.split('_')[2]).replace(/\$$/, '');
      if (domain !== 'clerk.vuelveclub.com') throw new Error('UNAVAILABLE');
      await deadline(new Promise((resolve, reject) => {
        const script = document.createElement('script'); script.src = `https://${domain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`;
        script.crossOrigin = 'anonymous'; script.setAttribute('data-clerk-publishable-key', config.publishableKey);
        script.onload = resolve; script.onerror = () => { script.remove(); reject(new Error('UNAVAILABLE')); }; document.head.append(script);
      }));
      await deadline(window.Clerk.load({ signInUrl: '/iniciar-sesion', afterSignOutUrl: '/iniciar-sesion' }));
    }
    if (!window.Clerk.isSignedIn) throw new Error('SIGN_IN_REQUIRED');
  }
  async function request(path, { method = 'GET', body } = {}) {
    if (!ready) ready = deadline(initialize(), 30000).catch(error => { ready = undefined; throw error; });
    await ready;
    const token = await deadline(window.Clerk.session.getToken(), 10000);
    const response = await fetch(path, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(45000) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'UNAVAILABLE');
    return result;
  }
  window.VuelveAccount = Object.freeze({ request, deadline });
})();
