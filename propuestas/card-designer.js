(() => {
  let logo = {};
  let uploadRevision = 0;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const presets = [
    { name: 'Clásica', color: '#F1ECDF', note: 'Cálida y de siempre.' },
    { name: 'Lima', color: '#CBDE2A', note: 'Imposible de perder.' },
    { name: 'Ciruela', color: '#3E2B49', note: 'Un poco más especial.' }
  ];
  function ink(color) {
    const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
    return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2] > .179 ? '#191b10' : '#ffffff';
  }
  function preview(design) {
    const qr = qrcode(0, 'M'); qr.addData('VC-TEST-PREVIEW'); qr.make();
    return `<article class="google-pass-preview" style="--wallet-bg:${esc(design.color)};--wallet-ink:${ink(design.color)}" aria-label="Vista aproximada de la tarjeta en Google Wallet"><header><img class="${safeLogo(design.logoUrl) ? 'wallet-uploaded-logo' : ''}" src="${esc(safeLogo(design.logoUrl) ? design.logoUrl : '/assets/logo-mark.png')}" alt="" /><div><small>${esc(design.business || 'Tu negocio')}</small><h2>Recompensas <span>· Prueba</span></h2></div></header><div class="google-pass-points"><small>Visitas</small><strong>0 <span>/ ${design.goal}</span></strong></div><img class="google-pass-stamps" src="/assets/wallet/stamps-${design.goal}-${ink(design.color) === '#ffffff' ? 'light' : 'dark'}.png" width="1032" height="812" alt="0 de ${design.goal} estampas: corazones por completar" /><div class="google-pass-code" aria-hidden="true">${qr.createSvgTag({ cellSize: 3, margin: 12, scalable: true })}</div><p class="google-pass-test">PRUEBA · Sin valor comercial</p><div class="google-pass-member"><small>Cliente</small><strong>Alex Demo</strong></div><div class="google-pass-reward"><small>Tu recompensa</small><strong>${esc(design.reward || 'Tu recompensa')}</strong><span>${design.goal} visitas para disfrutarla</span></div><p class="google-pass-attribution">Powered by vuelveclub.</p></article>`;
  }
  function draft() {
    return { business: document.querySelector('#wallet-business').value.trim(),
      reward: document.querySelector('#reward-name').value.trim(),
      goal: Number(document.querySelector('#stamp-goal').value), color: document.querySelector('#custom-color').value.toUpperCase(), ...logo };
  }
  function update() {
    const design = draft();
    document.querySelector('#live-pass').innerHTML = preview(design);
    document.querySelectorAll('[data-wallet-preset]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.walletPreset === design.color)));
    document.querySelectorAll('[data-color]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.color === design.color)));
  }
  function render(state) {
    uploadRevision++;
    logo = state.config.logoToken && safeLogo(state.config.logoUrl) ? { logoUrl: state.config.logoUrl, logoToken: state.config.logoToken } : {};
    const design = { ...state.config, business: state.business };
    return `<div class="page-heading"><div><p class="eyebrow">Tu tarjeta · Google Wallet</p><h1>Que se sienta muy tuya.</h1><p class="page-description">Elige un estilo, dale tu toque y llévala a tu celular.</p></div></div><div class="designer-grid wallet-designer"><form class="panel design-form" id="design-form"><div class="panel-heading"><h2>Primero, su personalidad.</h2></div><div class="wallet-presets" role="group" aria-label="Diseños de tarjeta">${presets.map(p => `<button type="button" class="wallet-preset" data-wallet-preset="${p.color}" aria-pressed="${state.config.color.toUpperCase() === p.color}"><span class="wallet-preset-art" style="--preset-bg:${p.color};--preset-ink:${ink(p.color)}"><img src="/assets/logo-mark.png" alt="" /><i></i><i></i></span><strong>${p.name}</strong><small>${p.note}</small></button>`).join('')}</div>${logoControl()}<label for="wallet-business">Nombre de tu negocio</label><input id="wallet-business" name="business" maxlength="60" value="${esc(state.business)}" required /><label for="reward-name">¿Qué premio van a disfrutar?</label><input id="reward-name" name="reward" maxlength="60" value="${esc(state.config.reward)}" required /><div class="wallet-design-details"><div><label for="stamp-goal">Visitas para el premio</label><select id="stamp-goal" name="goal">${[5, 8, 10, 12].map(n => `<option value="${n}" ${state.config.goal === n ? 'selected' : ''}>${n} visitas</option>`).join('')}</select></div><div><label for="custom-color">Color de fondo</label><label class="wallet-color-picker"><input id="custom-color" type="color" value="${esc(state.config.color)}" /><span>Personalizar</span></label></div></div><div class="wallet-design-actions"><button class="button button-outline" type="submit">Guardar diseño</button><button class="button button-dark" type="button" data-action="wallet-test">Probar en Google Wallet <span aria-hidden="true">↗</span></button></div><p class="wallet-design-footnote" role="status">Guardado en este navegador. La prueba crea una tarjeta real con datos ficticios, sin valor comercial.</p></form><section class="card-preview wallet-preview-stage"><div class="preview-label"><span class="status-dot"></span>Vista previa · Google Wallet</div><div id="live-pass">${preview(design)}</div><p class="wallet-preview-disclaimer">Google Wallet aplica su propia tipografía y distribución. Comprueba el resultado final en tu celular.</p><span class="wallet-preview-tag">Diseñada para volver.</span></section></div>`;
  }
  document.addEventListener('click', event => {
    if (event.target.closest('[data-wallet-logo-upload]')) document.querySelector('#wallet-logo-file').click();
    if (event.target.closest('[data-wallet-logo-remove]')) {
      uploadRevision++; logo = {}; paintLogo();
      document.querySelector('#wallet-logo-status').textContent = 'Logo eliminado. Se usará el logo de VuelveClub.';
      document.dispatchEvent(new CustomEvent('wallet-logo-change', { detail: logo }));
    }
    const preset = event.target.closest('[data-wallet-preset]');
    if (!preset) return;
    document.querySelector('#custom-color').value = preset.dataset.walletPreset;
    update();
  });
  function safeLogo(value) {
    return typeof value === 'string' && /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/business-logos\/[a-f0-9]{32}\/[a-f0-9]{64}\.png$/.test(value);
  }
  function logoControl() {
    return `<div class="wallet-logo-control"><img id="wallet-logo-thumbnail" src="${esc(logo.logoUrl || '/assets/logo-mark.png')}" alt="Vista del logo del negocio" width="64" height="64" /><div><span class="wallet-logo-label">Logo de tu negocio</span><div class="wallet-logo-actions"><button type="button" class="small-link" data-wallet-logo-upload>Subir logo</button><button type="button" class="small-link" data-wallet-logo-remove ${logo.logoToken ? '' : 'hidden'}>Quitar</button></div><input id="wallet-logo-file" type="file" accept="image/png,image/jpeg,image/webp" hidden /><p id="wallet-logo-status" role="status" aria-live="polite">PNG, JPG o WebP · Máximo 2 MB. Lo ajustamos al círculo de Wallet.</p><a class="small-link wallet-logo-signin" href="https://app.vuelveclub.com/iniciar-sesion" hidden>Iniciar sesión para subir el logo</a></div></div>`;
  }
  function paintLogo() {
    document.querySelector('#wallet-logo-thumbnail').src = logo.logoUrl || '/assets/logo-mark.png';
    document.querySelector('[data-wallet-logo-remove]').hidden = !logo.logoToken;
    update();
  }
  document.addEventListener('change', async event => {
    if (event.target.id !== 'wallet-logo-file') return;
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    const status = document.querySelector('#wallet-logo-status');
    const signin = document.querySelector('.wallet-logo-signin'); signin.hidden = true;
    if (file.size > 2 * 1024 * 1024) { status.textContent = 'El archivo debe pesar menos de 2 MB.'; return; }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { status.textContent = 'Usa un archivo PNG, JPG o WebP.'; return; }
    const revision = ++uploadRevision;
    const control = document.querySelector('.wallet-logo-control');
    control.setAttribute('aria-busy', 'true');
    const buttons = document.querySelectorAll('[data-wallet-logo-upload],[data-wallet-logo-remove],.wallet-design-actions button');
    buttons.forEach(button => { button.disabled = true; }); status.textContent = 'Subiendo y preparando tu logo…';
    try {
      const image = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file);
      });
      const result = await window.VuelveWallet.uploadLogo(image);
      if (revision !== uploadRevision || !control.isConnected) return;
      if (!safeLogo(result.logoUrl)) throw new Error('LOGO_UPLOAD_FAILED');
      logo = { logoUrl: result.logoUrl, logoToken: result.logoToken }; paintLogo();
      status.textContent = 'Logo listo. Se usará en tu próxima tarjeta de prueba.';
      document.dispatchEvent(new CustomEvent('wallet-logo-change', { detail: logo }));
    } catch (error) {
      if (revision !== uploadRevision || !control.isConnected) return;
      const needsSignIn = ['SIGN_IN_REQUIRED', 'APP_ORIGIN_REQUIRED'].includes(error.message);
      signin.hidden = !needsSignIn;
      status.textContent = needsSignIn ? 'Inicia sesión en la plataforma para subir tu logo.'
        : error.message === 'INVALID_IMAGE' ? 'No pudimos leer esa imagen. Prueba con otro PNG, JPG o WebP.'
          : 'No pudimos subir el logo. El diseño anterior se conserva; vuelve a intentarlo.';
    } finally {
      if (revision === uploadRevision && control.isConnected) { control.setAttribute('aria-busy', 'false'); buttons.forEach(button => { button.disabled = false; }); }
    }
  });
  window.VuelveCardDesigner = Object.freeze({ render, preview, draft, update });
})();
