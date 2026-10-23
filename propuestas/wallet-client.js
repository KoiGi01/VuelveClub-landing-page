/* Only a signed-in Clerk session can request a real, explicitly marked test card. */
(() => {
  let initialization;
  function deadline(promise, timeout) {
    let timer;
    return Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('AUTH_UNAVAILABLE')), timeout);
    })]).finally(() => clearTimeout(timer));
  }
  async function initialize() {
    if (location.origin !== 'https://app.vuelveclub.com') throw new Error('APP_ORIGIN_REQUIRED');
    if (window.Clerk?.loaded) return;
    const response = await fetch('/api/auth-config', { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('AUTH_UNAVAILABLE');
    const config = await response.json();
    if (!config.enabled || !/^pk_live_[A-Za-z0-9+/=]+$/.test(config.publishableKey)) throw new Error('AUTH_UNAVAILABLE');
    const domain = atob(config.publishableKey.split('_')[2]).replace(/\$$/, '');
    if (domain !== 'clerk.vuelveclub.com') throw new Error('AUTH_UNAVAILABLE');
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => { script.remove(); reject(new Error('AUTH_UNAVAILABLE')); }, 20000);
      script.src = `https://${domain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`;
      script.crossOrigin = 'anonymous'; script.setAttribute('data-clerk-publishable-key', config.publishableKey);
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('AUTH_UNAVAILABLE')); };
      document.head.append(script);
    });
    await deadline(window.Clerk.load({ signInUrl: '/iniciar-sesion', afterSignOutUrl: '/iniciar-sesion' }), 20000);
  }
  window.VuelveWallet = Object.freeze({
    async issueTest(design) {
      if (!initialization) initialization = deadline(initialize(), 30000).catch(error => { initialization = undefined; throw error; });
      await initialization;
      if (!window.Clerk.isSignedIn || !window.Clerk.session) throw new Error('SIGN_IN_REQUIRED');
      const token = await deadline(window.Clerk.session.getToken(), 10000);
      const response = await fetch('/api/wallet-test', { method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(design), signal: AbortSignal.timeout(55000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'GOOGLE_UNAVAILABLE');
      if (typeof result.saveUrl !== 'string' || !/^https:\/\/pay\.google\.com\/gp\/v\/save\/[A-Za-z0-9_.-]+$/.test(result.saveUrl)) throw new Error('GOOGLE_UNAVAILABLE');
      return result;
    }
  });
})();
