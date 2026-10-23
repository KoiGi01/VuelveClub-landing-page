const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ink = color => {
  const [r,g,b] = [1,3,5].map(i => parseInt(color.slice(i,i+2),16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
  return .2126*r+.7152*g+.0722*b > .179 ? 'dark' : 'light';
};
const errors = {
  DESIGN_CONFLICT: 'El diseño cambió en otra ventana. Actualiza la página antes de guardar.', DOCUMENTS_REQUIRED: 'Agrega los enlaces a los términos, el aviso de privacidad y su versión antes de publicar.',
  FORBIDDEN: 'Tu acceso cambió. No tienes permiso para editar esta tarjeta.', INVALID_REQUEST: 'Revisa los campos e inténtalo de nuevo.',
  INVALID_DESIGN: 'Revisa el nombre, la recompensa, las visitas y el color.', INVALID_LOGO: 'Vuelve a subir el logo antes de guardar.'
};
export function businessError(error) { return errors[error.message] || 'No pudimos guardar los cambios. Inténtalo de nuevo.'; }
export function cardPreview(d) {
  const tone = ink(d.color);
  return `<article class="live-pass" style="--card-color:${esc(d.color)};--card-ink:${tone === 'light' ? '#fff' : '#191b10'}"><header><img src="${esc(d.logoUrl || '/assets/logo-mark.png')}" alt="" /><div><small>${esc(d.business || 'Tu negocio')}</small><strong>Recompensas</strong></div></header><div class="live-pass-points"><span>Visitas</span><strong>0 <small>/ ${d.goal}</small></strong></div><img class="live-pass-stamps" src="/assets/wallet/stamps-${d.goal}-${tone}.png" alt="0 de ${d.goal} estampas" /><div class="live-pass-reward"><small>TU RECOMPENSA</small><strong>${esc(d.reward || 'Tu recompensa')}</strong></div><footer>Powered by vuelveclub.</footer></article>`;
}
export function renderCard(data) {
  const d = data.design;
  const formDesign = { business: d?.name || data.business.name, reward: d?.reward || '', color: d?.background_color || '#CBDE2A', goal: d?.visit_goal || 10, logoUrl: d?.logo_url };
  const active = !!data.active;
  return `<div class="page-heading"><div><p class="eyebrow">Google Wallet</p><h1>Tu tarjeta.</h1><p>Guarda tu diseño y publícalo cuando esté listo para recibir clientes.</p></div><span class="badge ${active ? 'badge-admin' : ''}">${active ? 'Registro disponible' : 'Sin publicar'}</span></div><div class="live-designer"><section class="panel"><form id="live-card-form" class="live-form" data-logo="${esc(d?.logo_url || '')}" data-keep-logo="${!!d?.logo_url}" data-revision="${d?.status === 'draft' ? d.revision : ''}"><h2>Que se sienta muy tuya.</h2>${!data.canManage ? '<p class="form-help">Solo un administrador del negocio puede guardar o publicar cambios.</p>' : ''}<fieldset ${data.canManage ? '' : 'disabled'}><label for="live-name">Nombre en la tarjeta</label><input id="live-name" name="business" maxlength="60" required value="${esc(formDesign.business)}" /><label for="live-reward">Tu recompensa</label><input id="live-reward" name="reward" maxlength="60" required placeholder="Un café de la casa" value="${esc(formDesign.reward)}" /><div class="live-form-row"><div><label for="live-goal">Visitas para el premio</label><select id="live-goal" name="goal">${[5,8,10,12].map(n => `<option ${n === formDesign.goal ? 'selected' : ''}>${n}</option>`).join('')}</select></div><div><label for="live-color">Color de fondo</label><input id="live-color" name="color" type="color" value="${esc(formDesign.color)}" /></div></div><label for="live-logo">Logo del negocio</label><input id="live-logo" type="file" accept="image/png,image/jpeg,image/webp" hidden /><button class="button outline" type="button" data-business-action="upload-logo">Subir logo</button><p class="form-help">PNG, JPG o WebP. Máximo 2 MB.</p><button class="table-link" type="button" data-business-action="remove-logo">Usar logo de VuelveClub</button><details class="live-documents" ${d?.terms_url ? '' : 'open'}><summary>Términos y privacidad</summary><p class="form-help">Para publicar necesitas los documentos de tu negocio. Se mostrarán antes del registro.</p><label for="live-terms">Enlace a términos y condiciones</label><input id="live-terms" name="termsUrl" type="url" maxlength="1000" placeholder="https://…" value="${esc(d?.terms_url || '')}" /><label for="live-privacy">Enlace al aviso de privacidad</label><input id="live-privacy" name="privacyUrl" type="url" maxlength="1000" placeholder="https://…" value="${esc(d?.privacy_url || '')}" /><label for="live-version">Versión de los documentos</label><input id="live-version" name="termsVersion" maxlength="100" placeholder="Ej. 2026-10-23" value="${esc(d?.terms_version || '')}" /></details><p id="live-card-status" class="form-error" role="status"></p><div class="page-actions"><button class="button primary" type="submit">Guardar diseño</button>${d?.status === 'draft' ? '<button class="button outline" type="button" data-business-action="publish">Publicar diseño guardado</button>' : ''}</div><p class="form-help">${d ? 'Guardado en tu negocio. Puedes continuar desde cualquier dispositivo.' : 'El diseño se guardará en tu negocio, no en este navegador.'}</p></fieldset></form></section><aside class="live-preview"><p class="eyebrow">Vista previa · Google Wallet</p><div id="live-card-preview">${cardPreview(formDesign)}</div><p class="form-help">Google Wallet adapta la tipografía y la distribución final.</p><section class="live-share"><h2>Un QR para tu negocio.</h2><p>${active ? 'Tus clientes ponen sus datos y agregan su tarjeta a Google Wallet, sin iniciar sesión.' : 'El QR aparecerá cuando publiques tu primer diseño.'}</p>${active ? '<button class="button primary" data-business-action="qr">Ver QR de registro</button>' : ''}<small>Los nuevos diseños se aplican a las nuevas tarjetas. Las ya emitidas conservan su versión.</small></section></aside></div>`;
}
export function customerResults(data, offset) {
  return `<section class="panel"><div class="panel-heading"><h2>Tu comunidad</h2><span>${data.customerCount} ${data.customerCount === 1 ? 'cliente' : 'clientes'}</span></div>${data.customers.length ? `<div class="table-scroll"><table class="live-customers"><thead><tr><th>Cliente</th><th>Celular</th><th>Registro</th>${data.canManage ? '<th><span class="sr-only">Tarjeta</span></th>' : ''}</tr></thead><tbody>${data.customers.map(c => `<tr><td><div class="identity"><span class="avatar lime">${esc(c.name.slice(0,1))}</span><div><strong>${esc(c.name)}</strong><small>${esc(c.email)}</small></div></div></td><td>${esc(c.phone)}</td><td>${new Intl.DateTimeFormat('es-MX', { day:'numeric',month:'short',year:'numeric' }).format(new Date(c.created_at))}</td>${data.canManage ? `<td><button class="table-link" data-business-action="recover" data-customer="${esc(c.id)}">Recuperar tarjeta</button></td>` : ''}</tr>`).join('')}</tbody></table></div>` : '<div class="empty"><h2>La próxima vuelta empieza aquí.</h2><p>Los clientes que se registren con el QR de tu negocio aparecerán en esta lista.</p></div>'}<div class="pagination"><span>${data.customerCount ? `${offset+1}–${Math.min(offset+20,data.customerCount)} de ${data.customerCount}` : 'Sin registros'}</span><div><button class="button outline" data-page="${Math.max(0,offset-20)}" ${offset ? '' : 'disabled'}>Anterior</button><button class="button outline" data-page="${offset+20}" ${offset+20 >= data.customerCount ? 'disabled' : ''}>Siguiente</button></div></div></section>`;
}
export function renderCustomers(data, search, offset) {
  return `<div class="page-heading"><div><p class="eyebrow">Datos de tu negocio</p><h1>Tus clientes.</h1><p>Registros reales de tu tarjeta de recompensas.</p></div><div class="page-actions"><button class="button outline" data-action="refresh">Actualizar</button><a class="button primary" data-route href="${businessHref(data.business.id,'tarjeta')}">Compartir tarjeta</a></div></div><form class="search-form" id="search-form"><label><input id="admin-search" type="search" name="search" maxlength="60" aria-label="Buscar clientes" placeholder="Nombre, correo o celular" value="${esc(search)}" /><kbd>/</kbd></label><button class="button outline">Buscar</button><button class="button outline" type="button" data-action="clear-search" ${search ? '' : 'hidden'}>Limpiar</button></form><div id="list-status" class="list-status" role="status"></div><div id="customer-results">${customerResults(data,offset)}</div>`;
}
export function businessHref(org, view) { return `/equipo?${new URLSearchParams(org ? { negocio: org } : {})}#${view}`; }
export function businessTabs(org, view) {
  return `<nav class="business-tabs" aria-label="Administrar negocio">${[['clientes','Clientes'],['tarjeta','Tu tarjeta'],['equipo','Equipo y permisos']].map(([key,label]) => `<a data-route href="${businessHref(org,key)}" ${view === key ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`;
}

export function mountBusiness({ request, getData, getOrg, currentView, refresh, openDialog, toast }) {
  let busy = false;
  const draft = form => ({ ...Object.fromEntries(new FormData(form)), goal: Number(form.elements.goal.value), keepLogo: form.dataset.keepLogo === 'true', ...(form.dataset.logoToken ? { logoToken: form.dataset.logoToken } : {}) });
  const preview = form => { document.querySelector('#live-card-preview').innerHTML = cardPreview({ ...draft(form), logoUrl: form.dataset.logo }); };
  document.addEventListener('input', event => { const form = event.target.closest('#live-card-form'); if (form && event.target.type !== 'file') { form.dataset.dirty = 'true'; preview(form); } });
  document.addEventListener('submit', async event => {
    if (event.target.id !== 'live-card-form') return;
    event.preventDefault(); if (busy) return;
    const form = event.target, org = getOrg(); busy = true; form.querySelector('fieldset').disabled = true;
    // FormData excludes disabled controls; read a snapshot with the fieldset enabled.
    form.querySelector('fieldset').disabled = false; const design = draft(form); form.querySelector('fieldset').disabled = true;
    const status = form.querySelector('#live-card-status'); status.textContent = 'Guardando diseño…';
    try {
      await request('/api/business', { method: 'POST', body: { action: 'save', organizationId: org, revision: form.dataset.revision ? Number(form.dataset.revision) : null, design } });
      form.dataset.dirty = ''; toast('Diseño guardado en tu negocio.'); await refresh();
    } catch (error) { if (form.isConnected) status.textContent = businessError(error); }
    finally { busy = false; if (form.isConnected) form.querySelector('fieldset').disabled = false; }
  });
  document.addEventListener('change', async event => {
    if (event.target.id !== 'live-logo') return;
    const form = event.target.form, file = event.target.files[0]; event.target.value = '';
    if (!file || busy) return;
    const status = form.querySelector('#live-card-status');
    if (file.size > 2*1024*1024 || !['image/png','image/jpeg','image/webp'].includes(file.type)) { status.textContent = 'Elige un PNG, JPG o WebP de hasta 2 MB.'; return; }
    busy = true; form.querySelector('fieldset').disabled = true; status.textContent = 'Preparando tu logo…';
    try {
      const image = await new Promise((resolve,reject) => { const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file); });
      const logo = await window.VuelveWallet.uploadLogo(image);
      if (!form.isConnected) return;
      form.dataset.logo = logo.logoUrl; form.dataset.logoToken = logo.logoToken; form.dataset.keepLogo = 'false'; form.dataset.dirty = 'true';
      form.querySelector('fieldset').disabled = false; preview(form); status.textContent = 'Logo listo. Guarda el diseño para conservarlo.';
    } catch { if (form.isConnected) status.textContent = 'No pudimos subir el logo. Vuelve a intentarlo.'; }
    finally { busy = false; if (form.isConnected) form.querySelector('fieldset').disabled = false; }
  });
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-business-action]'); if (!button || busy) return;
    const data = getData(); if (!data?.business || !['clientes','tarjeta'].includes(currentView())) return;
    if (button.dataset.businessAction === 'recover') {
      busy=true;button.disabled=true;
      try { const result=await request('/api/business',{method:'POST',body:{action:'recover',organizationId:getOrg(),customerId:button.dataset.customer}});
        if (!/^https:\/\/pay\.google\.com\/gp\/v\/save\/[A-Za-z0-9_.-]+$/.test(result.saveUrl)) throw Error();
        openDialog('Su tarjeta, de vuelta.',`<p class="dialog-copy">Comparte este enlace solo con el titular. Vence en 24 horas y abre su tarjeta existente.</p><input id="live-enrollment-link" aria-label="Enlace privado de Google Wallet" readonly value="${esc(result.saveUrl)}" /><div class="dialog-actions"><a class="button primary" href="${esc(result.saveUrl)}" target="_blank" rel="noopener noreferrer">Abrir Google Wallet</a></div>`);
      }catch{toast('No pudimos recuperar la tarjeta. Vuelve a intentar.');}finally{busy=false;button.disabled=false;}return;
    }
    if (currentView() !== 'tarjeta') return;
    const form = document.querySelector('#live-card-form');
    if (button.dataset.businessAction === 'upload-logo') document.querySelector('#live-logo').click();
    if (button.dataset.businessAction === 'remove-logo') { delete form.dataset.logoToken; form.dataset.logo=''; form.dataset.keepLogo='false'; form.dataset.dirty='true'; preview(form); }
    if (button.dataset.businessAction === 'publish') {
      if (form.dataset.dirty) { form.querySelector('#live-card-status').textContent='Guarda los cambios antes de publicar.'; return; }
      busy=true; form.querySelector('fieldset').disabled=true;
      try { await request('/api/business', { method:'POST', body:{action:'publish',organizationId:getOrg(),designId:data.design.id,revision:data.design.revision} });toast('Tu registro ya está disponible. Comparte el QR.');await refresh(); }
      catch(error){if(form.isConnected)form.querySelector('#live-card-status').textContent=businessError(error);}
      finally{busy=false;if(form.isConnected)form.querySelector('fieldset').disabled=false;}
    }
    if (button.dataset.businessAction === 'qr') {
      const qr=window.qrcode(0,'M');qr.addData(data.enrollmentUrl);qr.make();
      openDialog('Su próxima tarjeta empieza aquí.', `<div class="live-qr-poster"><p>${esc(data.active.name)}</p><h3>Tu próxima visita<br />tiene premio.</h3><div class="live-qr">${qr.createSvgTag({cellSize:4,margin:16,scalable:true})}</div><span>Escanea y guarda tu tarjeta.</span><strong>Powered by vuelveclub.</strong></div><label for="live-enrollment-link" class="sr-only">Enlace de registro</label><input id="live-enrollment-link" readonly value="${esc(data.enrollmentUrl)}" /><div class="dialog-actions"><a class="button outline" href="${esc(data.enrollmentUrl)}" target="_blank" rel="noopener">Abrir registro</a><button class="button primary" data-business-action="download">Descargar QR</button></div>`);
    }
    if (button.dataset.businessAction === 'download') {
      busy=true;button.disabled=true;
      try{await window.VuelveQRDownload.download({svg:document.querySelector('.live-qr svg'),business:data.active.name,testOnly:false});}
      catch{toast('No pudimos descargar el QR. Inténtalo de nuevo.');}
      finally{busy=false;button.disabled=false;}
    }
  });
}
