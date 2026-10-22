/* Clerk owns credentials, MFA, recovery and Google OAuth. No local password flow. */
(() => {
  'use strict';
  const container = document.querySelector('#sign-in');
  const status = document.querySelector('#auth-status');
  const loadScript = (src, attributes = {}) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => reject(new Error('Unavailable')), 15000);
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    Object.entries(attributes).forEach(([key, value]) => script.setAttribute(key, value));
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => { clearTimeout(timer); reject(new Error('Unavailable')); };
    document.head.append(script);
  });
  async function boot() {
    try {
      const response = await fetch('/api/auth-config', { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('Unavailable');
      const config = await response.json();
      if (!config.enabled) {
        status.textContent = 'El acceso a tu cuenta estará disponible pronto.';
        return;
      }
      if (!/^pk_(test|live)_[A-Za-z0-9+/=]+$/.test(config.publishableKey)) throw new Error('Invalid key');
      const domain = atob(config.publishableKey.split('_')[2]).replace(/\$$/, '');
      if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/i.test(domain)) throw new Error('Invalid domain');
      await loadScript(`https://${domain}/npm/@clerk/ui@1/dist/ui.browser.js`);
      await loadScript(`https://${domain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, {
        'data-clerk-publishable-key': config.publishableKey
      });
      const localeResponse = await fetch('/assets/vendor/clerk-es-MX.json', { signal: AbortSignal.timeout(8000) });
      if (!localeResponse.ok) throw new Error('Unavailable');
      const localization = await localeResponse.json();
      await window.Clerk.load({
        ui: { ClerkUI: window.__internal_ClerkUICtor },
        localization,
        signInUrl: '/iniciar-sesion',
        signInForceRedirectUrl: '/iniciar-sesion',
        afterSignOutUrl: '/iniciar-sesion'
      });
      if (window.Clerk.isSignedIn) {
        container.replaceChildren();
        const message = document.createElement('p');
        message.className = 'auth-intro';
        message.textContent = 'Ya iniciaste sesión. Estamos preparando el acceso a tu negocio.';
        const account = document.createElement('div');
        container.append(message, account);
        window.Clerk.mountUserButton(account);
        return;
      }
      const widget = document.createElement('div');
      container.replaceChildren(widget);
      window.Clerk.mountSignIn(widget, {
        routing: 'hash',
        forceRedirectUrl: '/iniciar-sesion',
        withSignUp: false,
        appearance: {
          variables: { colorPrimary: '#3E2B49', colorBackground: '#F9F7EF',
            colorText: '#131217', fontFamily: '"Hanken Grotesk", sans-serif', borderRadius: '14px' },
          elements: {
            headerTitle: { fontFamily: 'Fredoka, sans-serif', fontWeight: '400', fontSize: '30px' },
            socialButtonsBlockButton: { minHeight: '48px' },
            formButtonPrimary: { minHeight: '48px' }
          }
        }
      });
    } catch {
      const message = 'No pudimos cargar el acceso. Recarga la página o escríbenos para ayudarte.';
      if (status.isConnected) status.textContent = message;
      else {
        const error = document.createElement('p');
        error.className = 'auth-status';
        error.setAttribute('role', 'alert');
        error.textContent = message;
        container.replaceChildren(error);
      }
    }
  }
  boot();
})();
