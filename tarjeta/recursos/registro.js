(() => {
  'use strict';
  const root = document.querySelector('#enrollment');
  const dialog = document.querySelector('#enrollment-dialog');
  const business = window.VuelveDemo.profileFromUrl();
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const paths = {
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    coffee: '<path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Zm13 1h2a4 4 0 0 1 0 8h-2M7 3v2m5-2v2"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18m-13 5h4"/>',
    apple: '<path fill="currentColor" stroke="none" d="M16.3 3c.6-.8 1-1.9.9-3-1.1.1-2.3.8-3 1.6-.6.7-1.1 1.9-1 2.9 1.2.1 2.4-.6 3.1-1.5ZM20.4 17c-.5 1.1-.8 1.6-1.5 2.5-.9 1.3-2.1 2.8-3.6 2.8-1.4.1-1.8-.9-3.7-.8-1.9 0-2.3.9-3.7.8-1.5 0-2.6-1.4-3.6-2.7C1.6 15.8 1 10.9 2.6 8.3c1.1-1.8 2.8-2.8 4.5-2.8 1.5 0 2.6.9 3.8.9 1.1 0 2.8-1.1 4.6-1 1.5.1 3 .9 4 2.2-3.5 1.9-2.9 6.8.9 8.1Z"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.card}</svg>`;
  let member = { name: '', email: '', phone: '' };
  let registered = false;
  let consent = false;
  const registrationId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  if (!business) {
    document.title = 'Enlace no disponible | VuelveClub';
    root.innerHTML = '<main class="enrollment-unavailable" id="main"><p class="eyebrow">VuelveClub</p><h1>Esta tarjeta no está disponible.</h1><p>Revisa el enlace o pide al negocio que te muestre su QR de registro.</p><a class="button button-dark" href="/soporte">Contactar a soporte</a></main>';
    return;
  }
  document.title = `Tu tarjeta de ${business.name} | VuelveClub`;
  function pass(name = 'Tu nombre aquí') {
    const rgb = [1, 3, 5].map(i => parseInt(business.color.slice(i, i + 2), 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
    const ink = .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2] > .179 ? '#191b10' : '#ffffff';
    return `<div class="loyalty-pass" style="--pass-bg:${business.color};--pass-ink:${ink}"><div class="pass-head"><span class="pass-symbol">${icon('coffee')}</span><span><strong>${esc(business.name)}</strong><small>Tu lugar de siempre</small></span></div><div class="pass-stamps" style="--columns:${business.goal <= 10 ? 5 : 6}">${Array.from({ length: business.goal }, () => `<span class="pass-stamp">${icon('heart')}</span>`).join('')}</div><div class="pass-bottom"><div><small>TU RECOMPENSA</small><strong>${esc(business.reward)}</strong></div><span>0 <small>/ ${business.goal}</small></span></div><div class="pass-owner">${esc(name)}<span>VuelveClub</span></div></div>`;
  }
  function steps() {
    return `<div class="enrollment-steps" aria-label="Paso ${registered ? '2' : '1'} de 2"><span class="${registered ? 'completed' : 'current'}"><b>${registered ? '✓' : '1'}</b>Tus datos</span><span class="${registered ? 'current' : ''}"><b>2</b>Tu tarjeta</span></div>`;
  }
  function form() {
    return `${steps()}<form id="enrollment-form"><h2>Que volver<br />tenga su premio.</h2><p class="enrollment-intro">Completa tus datos y elige tu Wallet. Tu tarjeta va contigo desde la primera visita.</p><label for="member-name">Tu nombre</label><input id="member-name" name="name" autocomplete="name" placeholder="¿Cómo te llamas?" maxlength="60" required value="${esc(member.name)}" /><label for="member-email">Correo electrónico</label><input id="member-email" name="email" type="email" autocomplete="email" placeholder="tu@correo.com" maxlength="120" required value="${esc(member.email)}" /><label for="member-phone">Número de celular</label><input id="member-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="999 123 4567" maxlength="24" aria-describedby="phone-caption" required value="${esc(member.phone)}" /><p class="phone-caption" id="phone-caption">México: 10 dígitos. Otro país: incluye + y tu código.</p><label class="terms-label"><input id="member-terms" name="terms" type="checkbox" required ${consent ? 'checked' : ''} /><span>Acepto los <button type="button" data-legal="terms">términos y condiciones</button> y he leído el <button type="button" data-legal="privacy">aviso de privacidad</button>.</span></label><p class="field-error" role="alert"></p><button class="button button-dark enrollment-submit" type="submit">Crear mi tarjeta ${icon('arrow')}</button><p class="enrollment-footnote">Sin contraseña. Sin crear una cuenta.</p></form>`;
  }
  function success() {
    return `${steps()}<div class="enrollment-success"><span class="success-heart" aria-hidden="true">${icon('heart')}</span><h2>Ya eres de casa,<br />${esc(member.name.split(' ')[0])}.</h2><p class="enrollment-intro">Tu tarjeta de <strong>${esc(business.name)}</strong> está lista para la vista previa. Elige dónde te gustaría llevarla.</p><div class="wallet-choices"><button class="wallet-choice apple-wallet" data-wallet="apple">${icon('apple')}<span><strong>Apple Wallet</strong><small>Ver tarjeta en iPhone</small></span>${icon('arrow')}</button><button class="wallet-choice" data-wallet="google"><span class="google-mark" aria-hidden="true">G</span><span><strong>Google Wallet</strong><small>Ver tarjeta en Android</small></span>${icon('arrow')}</button></div><p class="wallet-pending">Esta propuesta muestra el diseño. Agregar la tarjeta al Wallet estará disponible al conectar Apple y Google.</p><button class="small-link enrollment-edit" data-edit>Editar mis datos</button></div>`;
  }
  function render() {
    root.innerHTML = `<div class="enrollment-shell"><header class="enrollment-header"><a href="/" aria-label="VuelveClub, inicio"><span class="brand"><img src="/assets/logo-mark.png" alt="" /><span>vuelveclub<span class="brand-dot">.</span></span></span></a><span class="enrollment-business">${icon('coffee')}${esc(business.name)}</span></header><main class="enrollment-layout" id="main"><section class="enrollment-story" aria-label="Tu tarjeta de recompensas"><div><p class="eyebrow">${esc(business.name)}</p><h1>Tu lugar.<br />Tus <em>recompensas.</em></h1><p class="enrollment-story-copy">${business.goal} visitas. ${esc(business.reward)}. Y muchas buenas razones para volver.</p></div><div class="enrollment-pass-wrap" id="story-pass">${pass(registered ? member.name : undefined)}</div><p class="enrollment-story-foot">${icon('heart')}Los buenos lugares se vuelven costumbre.</p></section><section class="enrollment-content" aria-label="${registered ? 'Elige tu Wallet' : 'Registro a la tarjeta'}">${registered ? success() : form()}</section></main><footer class="enrollment-footer"><span>Tarjeta de ${esc(business.name)} · Por VuelveClub</span><a href="/soporte" target="_blank" rel="noopener">¿Necesitas ayuda?</a></footer></div>`;
  }
  function openDialog(title, content) {
    dialog.innerHTML = `<div class="modal-top"><h2 id="enrollment-dialog-title">${title}</h2><button class="icon-button" data-close aria-label="Cerrar ventana">${icon('close')}</button></div>${content}`;
    dialog.showModal();
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.legal) {
      const privacy = button.dataset.legal === 'privacy';
      openDialog(privacy ? 'Aviso de privacidad.' : 'Términos del programa.', `<div class="terms-copy"><p class="terms-draft">Vista previa del documento. El negocio debe proporcionar su versión final antes de habilitar registros reales.</p><p class="terms-business">${esc(business.name)}</p>${privacy ? '<h3>Datos del registro</h3><p>El formulario de ejemplo solicita nombre, correo electrónico y teléfono. En este prototipo no se envían a un servidor; sirven para revisar el flujo de la tarjeta.</p><h3>Contenido pendiente del negocio</h3><p>Responsable y domicilio, finalidades del tratamiento, conservación, transferencias y medios para ejercer derechos o revocar el consentimiento.</p>' : `<h3>La recompensa</h3><p>La propuesta del programa es acumular ${business.goal} sellos para obtener ${esc(business.reward.toLowerCase())}.</p><h3>Condiciones por definir</h3><p>El negocio debe confirmar qué compras dan sellos, sucursales participantes, vigencia, restricciones y reglas de canje antes del lanzamiento.</p>`}</div><button class="button button-dark full-width" data-close style="margin-top:24px">Volver al registro</button>`);
    }
    if (button.dataset.wallet) {
      const name = button.dataset.wallet === 'apple' ? 'Apple Wallet' : 'Google Wallet';
      openDialog('Tu tarjeta, contigo.', `<p class="wallet-preview-name">${name} · Vista previa</p>${pass(member.name)}<p class="wallet-preview-note">Esta es una vista del diseño. La emisión y descarga de tarjetas aún no están conectadas.</p><button class="button button-dark full-width" data-close style="margin-top:24px">Listo ${icon('heart')}</button>`);
    }
    if (button.hasAttribute('data-edit')) { registered = false; render(); document.querySelector('#member-name').focus(); }
  });
  root.addEventListener('submit', event => {
    if (event.target.id !== 'enrollment-form') return;
    event.preventDefault();
    const form = event.target;
    const data = Object.fromEntries(new FormData(form));
    const phone = window.VuelveDemo.phone(data.phone);
    const name = data.name.trim().replace(/\s+/g, ' ');
    const email = data.email.trim().toLowerCase();
    const error = form.querySelector('.field-error');
    if (!name) { error.textContent = 'Escribe tu nombre.'; form.elements.name.focus(); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { error.textContent = 'Escribe un correo electrónico completo, por ejemplo nombre@correo.com.'; form.elements.email.focus(); return; }
    if (!phone) { error.textContent = 'Revisa tu celular: usa 10 dígitos en México o incluye el código de país con +.'; form.elements.phone.focus(); return; }
    if (data.terms !== 'on') { error.textContent = 'Acepta los términos y revisa el aviso de privacidad para continuar.'; return; }
    member = { name, email, phone };
    consent = true;
    registered = true;
    // Live demonstration between tabs in the same browser; no server/database or Wallet issuance.
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('vuelveclub-enrollment-demo');
      channel.postMessage({ type: 'enrollment', businessId: business.id, registrationId, member, acceptedAt: new Date().toISOString(), termsVersion: 'draft-preview' });
      channel.close();
    }
    render();
    const heading = document.querySelector('.enrollment-success h2');
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    if (matchMedia('(max-width:650px)').matches) document.querySelector('.enrollment-content').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  });
  dialog.addEventListener('click', event => {
    if (event.target.closest('[data-close]')) dialog.close();
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }
  });
  // Preserve input when opening legal documents or returning from the Wallet preview.
  root.addEventListener('input', event => {
    const input = event.target;
    if (['name', 'email', 'phone'].includes(input.name)) member[input.name] = input.value;
    if (input.name === 'terms') consent = input.checked;
    root.querySelector('.field-error')?.replaceChildren();
  });
  render();
})();
