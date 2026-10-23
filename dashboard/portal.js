import { ReadCache } from './read-cache.js';
import { businessTabs, businessHref, renderCard, renderCustomers, customerResults, mountBusiness } from './business.js';

(() => {
  const root = document.querySelector('#portal'), dialog = document.querySelector('#dialog');
  let isAdminPage = location.pathname === '/admin';
  const readCache = new ReadCache();
  const viewStates = new Map();
  let renderedView = '', sessionId, unsubscribe, activeRoute = '', visibleUrl = location.href, loadedAt = 0;
  const adminView = () => location.hash === '#usuarios' ? 'users' : 'businesses';
  const businessView = () => ['#clientes', '#tarjeta'].includes(location.hash) ? location.hash.slice(1) : 'equipo';
  const endpoint = () => isAdminPage ? `/api/admin?${new URLSearchParams({ view: adminView(), search, offset: String(offset) })}`
    : businessView() !== 'equipo' ? `/api/business?${new URLSearchParams({ view: businessView() === 'clientes' ? 'customers' : 'card', ...(selectedOrg ? { organizationId: selectedOrg } : {}), search, offset: String(offset) })}`
    : `/api/team?${new URLSearchParams({ ...(selectedOrg ? { organizationId: selectedOrg } : {}), offset: String(offset) })}`;
  const cacheKey = path => `${session?.userId || ''}:${sessionId || ''}:${path}`;
  const getRead = (path, preloaded) => readCache.get(cacheKey(path), () => preloaded ? preloaded.then(result => { if (result.error) throw result.error; return result.value; }) : window.VuelveAccount.request(path));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const initials = name => esc((name || '?').split(/\s+/).slice(0, 2).map(s => s[0]).join(''));
  const date = value => value ? new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';
  const icons = { home: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    people: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2m2-15a3 3 0 0 1 0 6m2 9v-2a6 6 0 0 0-3-5"/>',
    store: '<path d="m3 10 2-7h14l2 7M5 14v7h14v-7M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M10 21v-6h4v6"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>', plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', collapse: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16m7-12-3 4 3 4"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>', logout: '<path d="M9 3H4v18h5m6-14 5 5-5 5M9 12h11"/>' };
  const icon = key => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[key] || icons.people}</svg>`;
  let session, data, search = '', offset = 0, selectedOrg = new URLSearchParams(location.search).get('negocio') || '', loadingId = 0, mutation = false, toastTimer;
  let pendingInvitations = [];
  const roleName = role => role === 'org:admin' ? 'Administrador' : 'Personal';
  const messages = { FORBIDDEN: 'Tu cuenta no tiene permiso para entrar a esta sección.', SIGN_IN_REQUIRED: 'Inicia sesión para continuar.', APP_ORIGIN_REQUIRED: 'Abre tu cuenta desde app.vuelveclub.com.',
    MANAGEMENT_NOT_CONFIGURED: 'La administración de cuentas todavía no está disponible.', PROTECTED_MEMBER: 'El propietario y tu propio acceso están protegidos. Otro administrador debe ayudarte con ese cambio.',
    OWNER_MUST_SIGN_IN: 'El propietario debe iniciar sesión y verificar ese correo antes de asignarle un negocio.', ALREADY_ADDED: 'Ese correo ya pertenece al equipo o tiene una invitación pendiente.',
    INVALID_REQUEST: 'Revisa los datos e inténtalo de nuevo.', PROVIDER_REJECTED: 'Clerk no aceptó el cambio. Revisa los datos y los límites de tu cuenta.', TRY_AGAIN_LATER: 'Hay demasiadas solicitudes. Espera un momento y vuelve a intentar.' };
  const message = error => messages[error.message] || 'No pudimos cargar la información. Revisa tu conexión y vuelve a intentarlo.';
  function toast(text) { clearTimeout(toastTimer); const el = document.querySelector('#notice'); el.textContent = text; el.classList.add('visible'); toastTimer = setTimeout(() => el.classList.remove('visible'), 5000); }
  function skeleton() { return '<div class="content-skeleton" aria-label="Cargando información"><div class="skeleton heading-skeleton"></div><div class="skeleton sub-skeleton"></div><div class="skeleton-grid"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div><div class="skeleton table-skeleton"></div></div>'; }
  function shell() {
    const platform = session.role === 'admin';
    root.innerHTML = `<div class="portal-layout"><aside class="portal-sidebar" id="navigation"><div class="brand-row"><a class="brand" data-route href="${platform ? '/admin#negocios' : '/equipo'}" aria-label="VuelveClub, inicio"><img src="/assets/logo_dark-mode.png" alt="" /><span>vuelveclub<span class="brand-dot">.</span></span></a><button class="icon-button sidebar-collapse" data-action="collapse" aria-label="Colapsar barra lateral" aria-expanded="true">${icon('collapse')}</button></div><div class="scope-label">${icon(platform ? 'shield' : 'store')}<span>${platform ? 'Administración' : 'Mi negocio'}</span></div><span class="nav-label">${platform ? 'Gestionar' : 'Tu cuenta'}</span><nav aria-label="Principal">${platform ? `<a href="/admin#negocios" data-route data-tab="negocios" aria-label="Negocios">${icon('store')}<span>Negocios</span></a><a href="/admin#usuarios" data-route data-tab="usuarios" aria-label="Usuarios">${icon('people')}<span>Usuarios</span></a>` : `<a href="/equipo" data-route data-business-nav="equipo" class="active" aria-label="Equipo y permisos">${icon('people')}<span>Equipo y permisos</span></a><a href="/equipo#clientes" data-route data-business-nav="clientes" aria-label="Clientes">${icon('people')}<span>Clientes</span></a><a href="/equipo#tarjeta" data-route data-business-nav="tarjeta" aria-label="Tu tarjeta">${icon('store')}<span>Tu tarjeta</span></a>`}</nav><div class="sidebar-end">${platform ? `<a class="example-link" href="/propuestas/ritmo?vista=cliente"><span>Vista de cliente <small>Ejemplo</small></span>${icon('arrow')}</a>` : ''}<a href="/soporte" target="_blank" rel="noopener">Centro de ayuda ${icon('arrow')}</a><button data-action="signout" aria-label="Cerrar sesión">${icon('logout')}<span>Cerrar sesión</span></button></div></aside><div class="portal-workspace"><header class="portal-header"><button class="icon-button mobile-menu" data-action="menu" aria-label="Abrir navegación" aria-expanded="false" aria-controls="navigation">${icon('menu')}</button><span class="header-path" id="header-path"></span><div class="header-account"><span>${esc(window.Clerk?.user?.firstName || 'Tu cuenta')}</span><span class="avatar">${initials(window.Clerk?.user?.firstName || 'VC')}</span></div></header><main id="main" tabindex="-1">${skeleton()}</main><footer>Que sigan volviendo.<span>VuelveClub</span></footer></div></div>`;
    updateContext(); updateNavigation();
  }
  function updateContext() {
    const platform = session.role === 'admin';
    document.querySelectorAll('[data-tab]').forEach(a => {
      const active = a.dataset.tab === (isAdminPage && adminView() === 'users' ? 'usuarios' : 'negocios');
      a.classList.toggle('active', active); if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const label = isAdminPage ? `Administración / ${adminView() === 'users' ? 'Usuarios' : 'Negocios'}` : platform ? 'Administración / Negocios / Equipo' : 'Mi negocio / Equipo';
    document.querySelector('#header-path').textContent = label;
    if (!isAdminPage) document.querySelector('#header-path').textContent = `${platform ? 'Administración / Negocios' : 'Mi negocio'} / ${businessView() === 'clientes' ? 'Clientes' : businessView() === 'tarjeta' ? 'Tu tarjeta' : 'Equipo'}`;
    document.querySelectorAll('a[data-business-nav]').forEach(a => { a.href = businessHref(selectedOrg, a.dataset.businessNav); a.classList.toggle('active', !isAdminPage && businessView() === a.dataset.businessNav); });
    document.title = `${isAdminPage ? adminView() === 'users' ? 'Usuarios' : 'Negocios' : businessView() === 'clientes' ? 'Clientes' : businessView() === 'tarjeta' ? 'Tu tarjeta' : 'Equipo y permisos'} | VuelveClub`;
  }
  function updateNavigation() {
    const sidebar = document.querySelector('.portal-sidebar');
    if (sidebar) sidebar.inert = innerWidth <= 780 && !document.body.classList.contains('menu-open');
  }
  function heading(label, title, text, action = '') { return `<div class="page-heading"><div><p class="eyebrow">${label}</p><h1>${title}</h1><p>${text}</p></div>${action}</div>`; }
  function empty(title, text) { return `<div class="empty"><span>${icon('people')}</span><h2>${title}</h2><p>${text}</p></div>`; }
  function pagination(total) { return `<div class="pagination"><span>${total ? `${offset + 1}–${Math.min(offset + 20, total)} de ${total}` : 'Sin registros'}</span><div><button class="button outline" data-page="${Math.max(0, offset - 20)}" ${offset === 0 ? 'disabled' : ''}>Anterior</button><button class="button outline" data-page="${offset + 20}" ${offset + 20 >= total ? 'disabled' : ''}>Siguiente</button></div></div>`; }
  function businesses() { return `<section class="panel"><div class="panel-heading"><h2>Negocios</h2><span>${data.businessCount} en total</span></div>${data.businesses.length ? `<div class="table-scroll"><table class="business-table"><thead><tr><th>Negocio</th><th>Equipo</th><th>Alta</th><th><span class="sr-only">Acciones</span></th></tr></thead><tbody>${data.businesses.map(b => `<tr><td><div class="identity"><span class="avatar lime">${initials(b.name)}</span><div><strong>${esc(b.name)}</strong><small class="mobile-business-count">${b.members ?? '?'} ${b.members === 1 ? 'persona' : 'personas'}</small></div></div></td><td>${b.members ?? '—'} ${b.members === 1 ? 'persona' : 'personas'}</td><td>${date(b.createdAt)}</td><td><a class="table-link" data-route href="/equipo?negocio=${encodeURIComponent(b.id)}">Administrar ${icon('arrow')}</a></td></tr>`).join('')}</tbody></table></div>` : empty('Todo empieza con un negocio.', 'Da de alta al primero para que su equipo pueda entrar.')} ${pagination(data.businessCount)}</section>`; }
  function users() { return `<section class="panel"><div class="panel-heading"><h2>Cuentas registradas</h2><span>Personas con cuenta en VuelveClub</span></div>${data.users.length ? `<div class="table-scroll"><table class="users-table"><thead><tr><th>Usuario</th><th>Alta</th><th>Última actividad</th></tr></thead><tbody>${data.users.map(u => `<tr><td><div class="identity"><span class="avatar">${initials(u.name)}</span><div><strong>${esc(u.name)}</strong><small>${esc(u.email)}</small></div></div></td><td>${date(u.createdAt)}</td><td>${date(u.lastActiveAt)}</td></tr>`).join('')}</tbody></table></div>` : empty('No encontramos cuentas.', 'Prueba con otro nombre o correo.')} ${pagination(data.userCount)}</section>`; }
  function listSkeleton() { return '<div class="skeleton table-skeleton" aria-label="Cargando lista"></div>'; }
  function renderAdmin(loading = false) {
    const usersView = adminView() === 'users';
    return heading('Administración', usersView ? 'Usuarios' : 'Negocios', usersView ? 'Consulta las cuentas registradas. Los permisos se administran dentro de cada negocio.' : 'Abre un negocio para administrar su equipo y sus permisos.', `<div class="page-actions"><button class="button outline refresh-button" data-action="refresh" aria-label="Actualizar lista">Actualizar</button>${usersView ? '' : `<button class="button primary" data-action="new-business">${icon('plus')}Nuevo negocio</button>`}</div>`)
      + `<form class="search-form" id="search-form"><label>${icon('search')}<input id="admin-search" name="search" type="search" aria-label="${usersView ? 'Buscar usuarios' : 'Buscar negocios'}" placeholder="${usersView ? 'Buscar por nombre o correo' : 'Buscar un negocio por nombre'}" value="${esc(search)}" maxlength="60" /><kbd>/</kbd></label><button class="button outline">Buscar</button><button class="button outline" type="button" data-action="clear-search" ${search ? '' : 'hidden'}>Limpiar</button></form><div class="list-status" id="list-status" role="status" aria-live="polite"></div><div id="admin-results">${loading ? listSkeleton() : usersView ? users() : businesses()}</div>`;
  }
  function myInvitations() { return pendingInvitations.length ? `<section class="panel invitations"><div class="panel-heading"><h2>Te están esperando</h2></div>${pendingInvitations.map(i => `<div class="invitation-row"><div><strong>${esc(i.publicOrganizationData?.name || 'Tu negocio')}</strong><small>Invitación como ${roleName(i.role)}</small></div><button class="button primary" data-accept="${esc(i.id)}">Aceptar invitación</button></div>`).join('')}</section>` : ''; }
  function renderTeam() {
    const createInvite = data.canManage ? `<button class="button primary" data-action="invite">${icon('plus')}Invitar al equipo</button>` : '';
    const choices = [...data.businesses];
    if (data.business && !choices.some(b => b.id === data.business.id)) choices.push(data.business);
    const selector = session.role !== 'admin' && choices.length > 1 ? `<label class="business-select">Tu negocio<select id="business-select">${choices.map(b => `<option value="${esc(b.id)}" ${b.id === data.business?.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>` : '';
    const back = session.role === 'admin' ? `<a class="context-back" data-route href="/admin#negocios">${icon('arrow')}Volver a negocios</a>` : '';
    let content = back + heading(session.role === 'admin' ? 'Negocios / Equipo' : 'Mi negocio / Equipo', data.business ? `${esc(data.business.name)}` : 'Equipo y permisos', data.business ? 'Equipo y permisos. Administra los accesos de este negocio.' : 'Invitaciones y accesos a tus negocios.', createInvite) + `<div id="my-invitations">${myInvitations()}</div>` + selector;
    if (!data.business) return content + `<section class="panel">${empty('Tu negocio todavía no está asignado.', 'Si recibiste una invitación, inicia sesión con el correo al que llegó. También puedes contactar a soporte para dar de alta tu negocio.')}<div class="empty-actions"><a class="button outline" href="/soporte">Contactar a soporte</a><a class="button primary" href="/propuestas/ritmo?vista=cliente#tarjeta">Diseñar tarjeta de prueba</a></div></section>`;
    content += businessTabs(data.business.id, 'equipo');
    content += `<section class="panel"><div class="panel-heading"><h2>Personas con acceso</h2><span>${data.memberCount} en el equipo</span></div><div class="table-scroll"><table class="team-table"><thead><tr><th>Persona</th><th>Permisos</th><th>Acceso</th></tr></thead><tbody>${data.members.map(m => `<tr><td><div class="identity"><span class="avatar">${initials(m.name)}</span><div><strong>${esc(m.name)} ${m.isSelf ? '<span class="you">Tú</span>' : ''}</strong><small>${esc(m.email)}</small></div></div></td><td><span class="badge ${m.role === 'org:admin' ? 'badge-admin' : ''}">${m.isOwner ? 'Propietario' : roleName(m.role)}</span></td><td>${data.canManage && !m.isOwner && !m.isSelf ? `<button class="table-link" data-edit-member="${esc(m.userId)}">Administrar ${icon('arrow')}</button>` : '<span class="muted">Activo</span>'}</td></tr>`).join('')}</tbody></table></div>${pagination(data.memberCount)}</section>`;
    if (data.canManage) content += `<section class="panel pending-panel"><div class="panel-heading"><h2>Invitaciones pendientes</h2><span>${data.invitations.length}</span></div>${data.invitations.length ? data.invitations.map(i => `<div class="invitation-row"><div><strong>${esc(i.email)}</strong><small>${roleName(i.role)} · Enviada ${date(i.createdAt)}</small></div><button class="table-link danger" data-revoke="${esc(i.id)}">Cancelar invitación</button></div>`).join('') : '<p class="panel-note">No hay invitaciones pendientes. Las nuevas aparecerán aquí hasta que las acepten.</p>'}</section>`;
    return content + `<section class="roles-explainer"><span>${icon('shield')}</span><div><h2>Accesos claros, desde el principio.</h2><p><strong>Administrador:</strong> invita personas, cambia roles y retira accesos del negocio.<br /><strong>Personal:</strong> puede consultar el equipo; no administra usuarios ni permisos.</p><small>Los roles pertenecen a este negocio. No dan acceso a la administración de VuelveClub.</small></div></section>`;
  }
  function openDialog(title, content) { dialog.innerHTML = `<div class="dialog-heading"><h2 id="dialog-title">${title}</h2><button class="icon-button" data-close aria-label="Cerrar ventana">${icon('close')}</button></div>${content}`; dialog.showModal(); }
  function currentLocationKey() { return isAdminPage ? `/admin#${adminView()}` : `/equipo?${new URLSearchParams(location.search).get('negocio') || ''}#${businessView()}`; }
  function rememberView() { if (activeRoute) viewStates.set(activeRoute, { search, offset, scroll: scrollY }); }
  function navigate(href) {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin || !['/admin', '/equipo'].includes(url.pathname)) return;
    if (url.href === location.href) return;
    if (url.pathname === '/admin' && isAdminPage && url.search === location.search &&
        (url.hash === '#usuarios' ? 'users' : 'businesses') === adminView()) {
      history.replaceState({}, '', url); visibleUrl = location.href; return;
    }
    history.pushState({}, '', url); locationChanged();
  }
  function locationChanged() {
    if (visibleUrl === location.href) return;
    rememberView(); visibleUrl = location.href;
    isAdminPage = location.pathname === '/admin'; selectedOrg = new URLSearchParams(location.search).get('negocio') || '';
    activeRoute = currentLocationKey();
    const saved = viewStates.get(activeRoute); search = saved?.search || ''; offset = saved?.offset || 0;
    if (dialog.open) dialog.close();
    updateContext(); document.body.classList.remove('menu-open');
    document.querySelector('[data-action="menu"]')?.setAttribute('aria-expanded', 'false'); updateNavigation();
    load(); window.scrollTo({ top: saved?.scroll || 0, behavior: 'instant' });
  }
  function showData(result) {
    data = result;
    loadedAt = Date.now();
    const main = document.querySelector('#main');
    if (isAdminPage) {
      if (renderedView === currentLocationKey() && main.querySelector('#admin-results')) {
        main.querySelector('#admin-results').innerHTML = adminView() === 'users' ? users() : businesses();
      } else main.innerHTML = renderAdmin();
    } else {
      selectedOrg = data.business?.id || '';
      pendingInvitations = session.role === 'admin' ? [] : readCache.peek(cacheKey('my-invitations')) || [];
      if (businessView() !== 'equipo' && data.business) {
        if (businessView() === 'clientes' && renderedView === currentLocationKey() && main.querySelector('#customer-results')) {
          main.querySelector('#customer-results').innerHTML = customerResults(data, offset);
        } else main.innerHTML = `${session.role === 'admin' ? '<a class="context-back" data-route href="/admin#negocios">← Volver a negocios</a>' : ''}<p class="business-name">${esc(data.business.name)}</p>${session.role !== 'admin' && data.businesses.length > 1 ? `<label class="business-select">Tu negocio<select id="business-select">${data.businesses.map(b => `<option value="${esc(b.id)}" ${b.id === data.business.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>` : ''}${businessTabs(data.business.id,businessView())}${businessView() === 'tarjeta' ? renderCard(data) : renderCustomers(data, search, offset)}`;
      } else main.innerHTML = renderTeam();
      if (session.role !== 'admin' && businessView() === 'equipo') loadInvitations();
    }
    renderedView = currentLocationKey();
    updateContext();
  }
  async function loadInvitations() {
    const destination = currentLocationKey();
    try {
      const list = await readCache.get(cacheKey('my-invitations'), async () => {
        const result = await window.VuelveAccount.deadline(window.Clerk.user.getOrganizationInvitations({ status: 'pending', pageSize: 100 }));
        return result.data || [];
      });
      if (isAdminPage || currentLocationKey() !== destination) return;
      pendingInvitations = list;
      const region = document.querySelector('#my-invitations'); if (region) region.innerHTML = myInvitations();
    } catch {
      const region = document.querySelector('#my-invitations');
      if (!isAdminPage && currentLocationKey() === destination && region) region.innerHTML = '<p class="invitation-warning" role="status">No pudimos cargar tus invitaciones. <button class="table-link" data-action="retry-invitations">Volver a intentar</button></p>';
    }
  }
  async function load({ refresh = false, preloaded } = {}) {
    const sequence = ++loadingId, main = document.querySelector('#main');
    if (refresh) readCache.clear();
    const path = endpoint(), cached = readCache.peek(cacheKey(path));
    const sameView = renderedView === currentLocationKey() && !!data;
    const status = document.querySelector('#list-status');
    if (cached) {
      showData(cached); main.setAttribute('aria-busy', 'false'); root.setAttribute('aria-busy', 'false');
      const refreshButton = document.querySelector('[data-action="refresh"]'); if (refreshButton) refreshButton.disabled = false;
      if (status) status.textContent = ''; return;
    }
    main.setAttribute('aria-busy', 'true'); root.setAttribute('aria-busy', 'true');
    if (isAdminPage) {
      if (!sameView || !main.querySelector('#admin-results')) { main.innerHTML = renderAdmin(true); renderedView = currentLocationKey(); }
      const currentStatus = document.querySelector('#list-status'); if (currentStatus) currentStatus.textContent = refresh ? 'Actualizando lista…' : search ? 'Buscando…' : 'Cargando…';
    } else if (!sameView) main.innerHTML = skeleton();
    else if (businessView() === 'clientes' && status) status.textContent = refresh ? 'Actualizando lista…' : 'Buscando…';
    const refreshButton = document.querySelector('[data-action="refresh"]'); if (refreshButton) refreshButton.disabled = true;
    try {
      const result = await getRead(path, preloaded);
      if (sequence !== loadingId) return;
      showData(result);
      const label = document.querySelector('#list-status'); if (label) label.textContent = '';
    } catch (error) {
      if (sequence !== loadingId) return;
      const denied = ['SIGN_IN_REQUIRED', 'FORBIDDEN'].includes(error.message);
      if (denied) readCache.clear();
      if (sameView && !denied && document.querySelector('#list-status')) {
        document.querySelector('#list-status').innerHTML = `No pudimos actualizar la lista. Se muestra la consulta anterior. <button class="table-link" data-action="refresh">Reintentar</button>`;
      } else {
        renderedView = ''; data = undefined;
        main.innerHTML = `<div class="error-state" role="alert"><span>${icon('shield')}</span><h1>${denied ? 'Revisa tu acceso.' : 'No pudimos cargar esta sección.'}</h1><p>${message(error)}</p><div><button class="button primary" data-action="retry">Volver a intentar</button>${session.role === 'admin' ? '<a class="button outline" data-route href="/admin#negocios">Volver a negocios</a>' : '<a class="button outline" href="/iniciar-sesion">Ir a mi cuenta</a>'}</div></div>`;
      }
    } finally {
      if (sequence === loadingId) { main.setAttribute('aria-busy', 'false'); root.setAttribute('aria-busy', 'false'); if (refreshButton) refreshButton.disabled = false; }
    }
  }
  async function mutate(body, success) {
    if (mutation) return; mutation = true;
    const buttons = dialog.querySelectorAll('button'); buttons.forEach(b => { b.disabled = true; });
    dialog.setAttribute('aria-busy', 'true');
    try {
      await window.VuelveAccount.request(isAdminPage ? '/api/admin' : '/api/team', { method: 'POST', body: isAdminPage ? body : { ...body, organizationId: selectedOrg } });
      readCache.clear(); dialog.close(); toast(success); await load();
    } catch (error) { const el = dialog.querySelector('.form-error'); if (el) el.textContent = message(error); else toast(message(error)); }
    finally { mutation = false; buttons.forEach(b => { b.disabled = false; }); dialog.setAttribute('aria-busy', 'false'); }
  }
  document.addEventListener('submit', event => {
    if (!['search-form', 'business-form', 'invite-form', 'role-form'].includes(event.target.id)) return;
    event.preventDefault(); const fields = Object.fromEntries(new FormData(event.target));
    if (event.target.id === 'search-form') { search = fields.search.trim(); offset = 0; document.querySelector('[data-action="clear-search"]').hidden = !search; load(); }
    if (event.target.id === 'business-form') mutate({ action: 'create', name: fields.name, ownerEmail: fields.ownerEmail }, 'Negocio creado. Su propietario ya tiene acceso.');
    if (event.target.id === 'invite-form') mutate({ action: 'invite', email: fields.email, role: fields.role }, 'Invitación enviada.');
    if (event.target.id === 'role-form') mutate({ action: 'role', userId: fields.userId, role: fields.role }, 'Permisos actualizados.');
  });
  document.addEventListener('click', async event => {
    const el = event.target.closest('button'); if (!el) return;
    if (el.hasAttribute('data-close')) { if (!mutation) dialog.close(); return; }
    if (el.dataset.page !== undefined) { offset = Number(el.dataset.page); load(); return; }
    if (el.dataset.accept) {
      el.disabled = true;
      try { const invitation = pendingInvitations.find(i => i.id === el.dataset.accept); await window.VuelveAccount.deadline(invitation.accept()); selectedOrg = invitation.publicOrganizationData?.id || ''; offset = 0; readCache.clear(); toast('Ya formas parte del equipo.'); await load(); }
      catch (error) { toast(message(error)); el.disabled = false; } return;
    }
    if (el.dataset.editMember) {
      const member = data.members.find(m => m.userId === el.dataset.editMember); if (!member) return;
      openDialog('Su lugar en el equipo.', `<p class="dialog-copy">${esc(member.name)} · ${esc(member.email)}</p><form id="role-form"><input type="hidden" name="userId" value="${esc(member.userId)}" /><label for="member-role">Permisos del negocio</label><select id="member-role" name="role"><option value="org:member" ${member.role === 'org:member' ? 'selected' : ''}>Personal</option><option value="org:admin" ${member.role === 'org:admin' ? 'selected' : ''}>Administrador</option></select><p class="form-help">Un administrador puede invitar personas, cambiar roles y retirar accesos.</p><p class="form-error" role="alert"></p><button class="button primary full" type="submit">Guardar permisos</button><button class="table-link danger remove-member" type="button" data-remove="${esc(member.userId)}">Retirar del negocio</button></form>`); return;
    }
    if (el.dataset.remove) { const userId = el.dataset.remove; openDialog('¿Retirar su acceso?', `<p class="dialog-copy">Esta persona dejará de pertenecer al negocio. Su cuenta personal se conserva.</p><p class="form-error" role="alert"></p><div class="dialog-actions"><button class="button outline" data-close>Volver</button><button class="button primary" data-confirm-remove="${esc(userId)}">Retirar acceso</button></div>`); return; }
    if (el.dataset.confirmRemove) { mutate({ action: 'remove', userId: el.dataset.confirmRemove }, 'Acceso al negocio retirado.'); return; }
    if (el.dataset.revoke) { openDialog('¿Cancelar la invitación?', `<p class="dialog-copy">El enlace de esa invitación dejará de permitir el acceso al negocio.</p><p class="form-error" role="alert"></p><div class="dialog-actions"><button class="button outline" data-close>Volver</button><button class="button primary" data-confirm-revoke="${esc(el.dataset.revoke)}">Cancelar invitación</button></div>`); return; }
    if (el.dataset.confirmRevoke) { mutate({ action: 'revoke', invitationId: el.dataset.confirmRevoke }, 'Invitación cancelada.'); return; }
    switch (el.dataset.action) {
      case 'retry': load({ refresh: true }); break;
      case 'refresh': load({ refresh: true }); break;
      case 'retry-invitations': loadInvitations(); break;
      case 'clear-search': search = ''; offset = 0; document.querySelector('#admin-search').value = ''; el.hidden = true; document.querySelector('#admin-search').focus(); load(); break;
      case 'boot': boot(); break;
      case 'menu': document.body.classList.toggle('menu-open'); el.setAttribute('aria-expanded', String(document.body.classList.contains('menu-open'))); updateNavigation(); break;
      case 'collapse': document.body.classList.toggle('collapsed'); el.setAttribute('aria-expanded', String(!document.body.classList.contains('collapsed'))); el.setAttribute('aria-label', document.body.classList.contains('collapsed') ? 'Expandir barra lateral' : 'Colapsar barra lateral'); break;
      case 'signout': readCache.clear(); el.disabled = true; try { await window.Clerk.signOut({ redirectUrl: '/iniciar-sesion' }); } catch { el.disabled = false; toast('No pudimos cerrar la sesión. Inténtalo de nuevo.'); } break;
      case 'new-business': openDialog('Un nuevo lugar para volver.', '<form id="business-form"><label for="business-name">Nombre del negocio</label><input id="business-name" name="name" maxlength="60" required /><label for="owner-email">Correo del propietario</label><input id="owner-email" name="ownerEmail" type="email" maxlength="120" required /><p class="form-help">El propietario debe haber iniciado sesión y verificado este correo. Tendrá acceso de administrador a su negocio.</p><p class="form-error" role="alert"></p><button class="button primary full" type="submit">Crear negocio</button></form>'); break;
      case 'invite': openDialog('Una persona más en el equipo.', '<form id="invite-form"><label for="invite-email">Correo electrónico</label><input id="invite-email" name="email" type="email" maxlength="120" required /><label for="invite-role">Permisos del negocio</label><select id="invite-role" name="role"><option value="org:member">Personal</option><option value="org:admin">Administrador</option></select><p class="form-help">Enviaremos una invitación por correo. Tendrá 7 días para aceptarla con su propia cuenta.</p><p class="form-error" role="alert"></p><button class="button primary full" type="submit">Enviar invitación</button></form>'); break;
    }
  });
  document.addEventListener('change', event => { if (event.target.id === 'business-select') { const url = new URL(location); url.searchParams.set('negocio', event.target.value); navigate(url.href); } });
  dialog.addEventListener('cancel', event => { if (mutation) event.preventDefault(); });
  dialog.addEventListener('click', event => { if (event.target === dialog && !mutation) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  document.addEventListener('click', event => { if (document.body.classList.contains('menu-open') && !event.target.closest('#navigation,[data-action="menu"]')) { document.body.classList.remove('menu-open'); document.querySelector('[data-action="menu"]')?.setAttribute('aria-expanded', 'false'); updateNavigation(); } });
  document.addEventListener('keydown', event => { if (event.key === '/' && !dialog.open && !event.target.closest('input,textarea,select') && !event.ctrlKey && !event.metaKey) { const input = document.querySelector('#search-form input'); if (input) { event.preventDefault(); input.focus(); } } });
  addEventListener('hashchange', locationChanged);
  addEventListener('popstate', locationChanged);
  addEventListener('resize', updateNavigation);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !dialog.open) { document.body.classList.remove('menu-open'); document.querySelector('[data-action="menu"]')?.setAttribute('aria-expanded', 'false'); updateNavigation(); } });
  async function boot() {
    try {
      const initialPath = endpoint();
      const preloaded = window.VuelveAccount.request(initialPath).then(value => ({ value }), error => ({ error }));
      session = await window.VuelveAccount.request('/api/session');
      sessionId = window.Clerk?.session?.id || session.userId;
      if (isAdminPage && session.role !== 'admin') throw new Error('FORBIDDEN');
      activeRoute = currentLocationKey(); visibleUrl = location.href;
      shell(); await load({ preloaded: initialPath === endpoint() ? preloaded : undefined });
      unsubscribe?.();
      unsubscribe = window.Clerk.addListener?.(state => { if (state.session?.id !== sessionId) { readCache.clear(); location.replace('/iniciar-sesion'); } });
    } catch (error) {
      root.innerHTML = `<main id="main" class="boot-error" role="alert"><a class="brand dark-brand" href="https://www.vuelveclub.com"><img src="/assets/logo-mark.png" alt="" /><span>vuelveclub.</span></a><h1>${error.message === 'SIGN_IN_REQUIRED' ? 'Qué gusto tenerte de vuelta.' : 'Este espacio necesita tu acceso.'}</h1><p>${message(error)}</p><div><a class="button primary" href="/iniciar-sesion">Iniciar sesión</a><button class="button outline" data-action="boot">Volver a intentar</button></div></main>`;
      root.setAttribute('aria-busy', 'false');
    }
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-route]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target) return;
    const url = new URL(link.href); if (url.origin !== location.origin) return;
    event.preventDefault(); navigate(url.href);
  });
  document.addEventListener('vuelve:navigate', event => { if (session && typeof event.detail?.href === 'string') { const url = new URL(event.detail.href, location.href); if (url.origin === location.origin && ['/admin', '/equipo'].includes(url.pathname)) { event.preventDefault(); navigate(url.href); } } });
  function prefetch(event) {
    const link = event.target.closest('a[data-route][data-tab]');
    if (!link || session?.role !== 'admin') return;
    const view = link.dataset.tab === 'usuarios' ? 'users' : 'businesses';
    if (isAdminPage && adminView() === view) return;
    const saved = viewStates.get(`/admin#${view}`);
    const path = `/api/admin?${new URLSearchParams({ view, search: saved?.search || '', offset: String(saved?.offset || 0) })}`;
    getRead(path).catch(() => {});
  }
  document.addEventListener('pointerover', prefetch);
  document.addEventListener('focusin', prefetch);
  addEventListener('pagehide', () => readCache.clear());
  addEventListener('focus', () => { if (document.querySelector('#live-card-form[data-dirty="true"],#live-card-form fieldset:disabled')) return; if (session && !mutation && loadedAt && Date.now() - loadedAt > 15000) load({ refresh: true }); });
  addEventListener('pageshow', event => { if (event.persisted) { readCache.clear(); data = undefined; renderedView = ''; boot(); } });
  mountBusiness({ request: (...args) => window.VuelveAccount.request(...args), getData: () => data, getOrg: () => selectedOrg,
    currentView: () => isAdminPage ? '' : businessView(), refresh: () => load({ refresh: true }), openDialog, toast });
  boot();
})();
