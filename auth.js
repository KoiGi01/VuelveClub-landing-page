/* Clerk owns credentials, recovery and OAuth. The shell only handles loading. */
(() => {
  'use strict';
  const container = document.querySelector('#sign-in');
  const widget = document.querySelector('#auth-widget');
  const status = document.querySelector('#auth-status');
  const errorPanel = document.querySelector('#auth-error');
  const errorTitle = document.querySelector('#auth-error-title');
  const scripts = new Map();
  let activeController;
  let unmount = () => {};

  function abortable(promise, signal) {
    return new Promise((resolve, reject) => {
      const abort = () => reject(signal.reason);
      if (signal.aborted) { abort(); return; }
      signal.addEventListener('abort', abort, { once: true });
      Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
    });
  }
  function loadScript(src, attributes, signal) {
    if (scripts.has(src)) return abortable(scripts.get(src), signal);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const finish = (error) => {
        signal.removeEventListener('abort', abort);
        script.onload = script.onerror = null;
        if (error) { script.remove(); reject(error); } else resolve();
      };
      const abort = () => finish(signal.reason);
      script.src = src;
      script.async = true;
      script.crossOrigin = 'anonymous';
      Object.entries(attributes).forEach(([key, value]) => script.setAttribute(key, value));
      script.onload = () => finish();
      script.onerror = () => finish(new Error('Unavailable'));
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort(); else document.head.append(script);
    });
    scripts.set(src, promise);
    promise.catch(() => { if (scripts.get(src) === promise) scripts.delete(src); });
    return promise;
  }
  function waitForWidget(signal) {
    return new Promise((resolve, reject) => {
      const finish = (error) => {
        observer.disconnect();
        signal.removeEventListener('abort', abort);
        if (error) reject(error); else resolve();
      };
      const check = () => {
        if (widget.querySelector('button, input, a[href]')) finish();
      };
      const abort = () => finish(signal.reason);
      const observer = new MutationObserver(check);
      observer.observe(widget, { childList: true, subtree: true });
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort(); else check();
    });
  }
  async function boot(restoreFocus = false) {
    activeController?.abort(new Error('Superseded'));
    unmount();
    unmount = () => {};
    const controller = new AbortController();
    activeController = controller;
    const { signal } = controller;
    const timer = setTimeout(() => controller.abort(new Error('Timeout')), 30000);
    let unavailable = false;
    container.dataset.state = 'loading';
    container.setAttribute('aria-busy', 'true');
    widget.inert = true;
    widget.setAttribute('aria-hidden', 'true');
    widget.replaceChildren();
    errorPanel.hidden = true;
    status.textContent = 'Cargando inicio de sesión…';
    try {
      const response = await fetch('/api/auth-config', { signal });
      if (!response.ok) throw new Error('Unavailable');
      const config = await response.json();
      if (!config.enabled) { unavailable = true; throw new Error('Unavailable'); }
      if (!/^pk_(test|live)_[A-Za-z0-9+/=]+$/.test(config.publishableKey)) throw new Error('Invalid key');
      const domain = atob(config.publishableKey.split('_')[2]).replace(/\$$/, '');
      if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/i.test(domain)) throw new Error('Invalid domain');
      const [, , localization] = await Promise.all([
        loadScript(`https://${domain}/npm/@clerk/ui@1/dist/ui.browser.js`, {}, signal),
        loadScript(`https://${domain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, {
          'data-clerk-publishable-key': config.publishableKey
        }, signal),
        fetch('/assets/vendor/clerk-es-MX.json', { signal }).then(response => {
          if (!response.ok) throw new Error('Unavailable');
          return response.json();
        })
      ]);
      await abortable(window.Clerk.load({
        ui: { ClerkUI: window.__internal_ClerkUICtor }, localization,
        signInUrl: '/iniciar-sesion', signInForceRedirectUrl: '/iniciar-sesion',
        afterSignOutUrl: '/iniciar-sesion'
      }), signal);
      signal.throwIfAborted();
      if (window.Clerk.isSignedIn) {
        const token = await abortable(window.Clerk.session.getToken(), signal);
        const sessionResponse = await fetch('/api/session', {
          headers: { Authorization: `Bearer ${token}` }, signal
        });
        if (!sessionResponse.ok) throw new Error('Unavailable');
        const session = await sessionResponse.json();
        signal.throwIfAborted();
        const message = document.createElement('p');
        message.className = 'auth-intro';
        message.textContent = session.role === 'admin'
          ? 'Revisa la experiencia de tus negocios desde tu cuenta.'
          : 'Ya iniciaste sesión. Estamos preparando el acceso a tu negocio.';
        if (session.role === 'admin') {
          const label = document.createElement('span');
          label.className = 'eyebrow';
          label.textContent = 'Tu cuenta de administrador';
          const heading = document.createElement('h2');
          heading.textContent = 'Qué gusto tenerte aquí.';
          widget.append(label, heading);
        }
        const account = document.createElement('div');
        account.className = 'auth-account';
        widget.append(message, account);
        if (session.role === 'admin' && session.canPreview) {
          const preview = document.createElement('a');
          preview.className = 'button button-dark admin-preview-button';
          preview.href = '/propuestas/ritmo?vista=cliente';
          preview.textContent = 'Ver dashboard como cliente';
          const caption = document.createElement('p');
          caption.className = 'auth-intro admin-preview-caption';
          caption.textContent = 'Explora el negocio de ejemplo. Tu sesión de administrador se mantiene.';
          widget.append(preview, caption);
        }
        unmount = () => window.Clerk.unmountUserButton(account);
        window.Clerk.mountUserButton(account);
      } else {
        unmount = () => window.Clerk.unmountSignIn(widget);
        window.Clerk.mountSignIn(widget, {
          routing: 'hash', forceRedirectUrl: '/iniciar-sesion', withSignUp: false,
          appearance: {
            variables: { colorPrimary: '#3E2B49', colorBackground: '#F9F7EF',
              colorText: '#131217', fontFamily: '"Hanken Grotesk", sans-serif', borderRadius: '14px' },
            elements: {
              headerTitle: { fontFamily: 'Fredoka, sans-serif', fontWeight: '400', fontSize: '30px' },
              socialButtonsBlockButton: { minHeight: '48px' }, formButtonPrimary: { minHeight: '48px' }
            }
          }
        });
      }
      await waitForWidget(signal);
      await abortable(new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))), signal);
      signal.throwIfAborted();
      widget.inert = false;
      widget.removeAttribute('aria-hidden');
      container.dataset.state = 'ready';
      container.setAttribute('aria-busy', 'false');
      status.textContent = 'Inicio de sesión listo.';
      if (restoreFocus) widget.querySelector('button, input, a[href]')?.focus({ preventScroll: true });
    } catch {
      if (activeController !== controller) return;
      controller.abort(new Error('Unavailable'));
      unmount();
      unmount = () => {};
      widget.replaceChildren();
      errorTitle.textContent = unavailable ? 'El acceso aún no está disponible.' : 'No pudimos cargar el acceso.';
      container.dataset.state = 'error';
      container.setAttribute('aria-busy', 'false');
      errorPanel.hidden = false;
      status.textContent = '';
    } finally { clearTimeout(timer); }
  }
  document.querySelector('#auth-retry').addEventListener('click', () => boot(true));
  window.addEventListener('pageshow', event => { if (event.persisted) boot(); });
  boot();
})();
