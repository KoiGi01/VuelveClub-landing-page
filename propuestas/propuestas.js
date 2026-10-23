(() => {
  'use strict';
  const app = document.querySelector('#app');
  const clientPreview = new URLSearchParams(location.search).get('vista') === 'cliente';
  const stateKey = clientPreview ? 'vc-client-preview-v1' : 'vc-prototype-v1';
  const modal = document.querySelector('#modal');
  const concepts = { pulso: 'Pulso', ritmo: 'Ritmo', mesa: 'Mesa' };
  const requested = new URLSearchParams(location.search).get('concepto') || location.pathname.split('/').filter(Boolean).at(-1);
  const concept = Object.hasOwn(concepts, requested) ? requested : 'pulso';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const paths = {
    home: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    people: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m3 10v-2a6 6 0 0 0-3-5"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18m-13 5h4"/>',
    nfc: '<path d="M5 8a7 7 0 0 1 0 8m4-11a12 12 0 0 1 0 14m5-11a7 7 0 0 1 0 8m4-11a12 12 0 0 1 0 14"/>',
    settings: '<path d="m10 3-1 3-3 1-3 3 2 2-1 4 3 2 3-1 2 4h3l1-3 4-1 1-4-2-2 1-4-3-1-2-3Z"/><circle cx="12" cy="12" r="3"/>',
    scan: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M4 12h16"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    gift: '<path d="M3 8h18v4H3zm2 4v9h14v-9M12 8v13M12 8S5 8 5 5s6-3 7 3Zm0 0s7 0 7-3-6-3-7 3Z"/>',
    coffee: '<path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Zm13 1h2a4 4 0 0 1 0 8h-2M7 3v2m5-2v2"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    collapse: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16m7-12-3 4 3 4"/>',
    expand: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16m4-12 3 4-3 4"/>',
    qr: '<path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h3v3h-3zm6 0v3m-6 4h3v-1h4v-3M6 6h1m10 0h1M6 17h1"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5m-4-4a8 8 0 0 1 13-4l2 3M4 17l2 3a8 8 0 0 0 13-4"/>',
    logout: '<path d="M9 3H4v18h5m6-14 5 5-5 5M9 12h11"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3v1"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    store: '<path d="m3 10 2-7h14l2 7M5 14v7h14v-7M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M10 21v-6h4v6"/>'
  };
  const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.card}</svg>`;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const initials = name => esc(name.split(/\s+/).slice(0, 2).map(x => x[0]).join(''));
  const nav = [['inicio', 'home', 'Inicio'], ['clientes', 'people', 'Clientes'], ['tarjeta', 'card', 'Tu tarjeta'], ['sellos', 'nfc', 'Sellos físicos'], ['equipo', 'people', 'Equipo'], ['configuracion', 'settings', 'Configuración']];
  const seed = () => ({ version: 1, business: 'Café Buen Día', branch: 'Sucursal Centro', visits: 24, period: 'week', deviceActive: true, config: { reward: 'Un café de la casa', goal: 10, color: '#CBDE2A' },
    customers: [
      { id: 1, name: 'Mariana López', email: 'mariana@example.com', stamps: 9, visits: 19, color: 'peach' },
      { id: 2, name: 'Diego Torres', email: 'diego@example.com', stamps: 7, visits: 27, color: 'lavender' },
      { id: 3, name: 'Sofía García', email: 'sofia@example.com', stamps: 10, visits: 30, color: 'sage' },
      { id: 4, name: 'Andrés Ruiz', email: 'andres@example.com', stamps: 4, visits: 14, color: 'sand' },
      { id: 5, name: 'Valeria Díaz', email: 'valeria@example.com', stamps: 8, visits: 18, color: 'lavender' },
      { id: 6, name: 'Pablo Medina', email: 'pablo@example.com', stamps: 2, visits: 12, color: 'peach' },
      { id: 7, name: 'Lucía Flores', email: 'lucia@example.com', stamps: 10, visits: 20, color: 'sage' },
      { id: 8, name: 'Mateo Castro', email: 'mateo@example.com', stamps: 5, visits: 15, color: 'sand' }
    ],
    activity: [{ id: 1, text: 'Recibió un sello', time: 'Hace 3 min', type: 'stamp' }, { id: 2, text: 'Recibió un sello', time: 'Hace 12 min', type: 'stamp' }, { id: 3, text: 'Completó su tarjeta', time: 'Hace 18 min', type: 'reward' }, { id: 4, text: 'Recibió un sello', time: 'Hace 25 min', type: 'stamp' }],
    team: [{ id: 1, name: 'Ana Martínez', email: 'ana@example.com', role: 'Dueña', status: 'Activo' }, { id: 2, name: 'Carlos Ramos', email: 'carlos@example.com', role: 'Encargado', status: 'Activo' }, { id: 3, name: 'Elena Cruz', email: 'elena@example.com', role: 'Personal', status: 'Activo' }]
  });
  let state;
  try { const saved = JSON.parse(sessionStorage.getItem(stateKey)); state = saved?.version === 1 && Array.isArray(saved.customers) ? saved : seed(); } catch { state = seed(); }
  state.customers.forEach((c, i) => { if (c.id <= 8 && !c.phone) c.phone = `+52999000000${i + 1}`; });
  let sidebarCollapsed = false;
  try { sidebarCollapsed = sessionStorage.getItem('vc-sidebar-collapsed') === 'true'; } catch { /* Optional preference. */ }
  let view = location.hash.slice(1) || 'inicio';
  let selected = 1;
  let filter = '';
  let counterFilter = '';
  let onlyReady = false;
  let busy = false;
  let toastTimer;
  let countAnimated = false;
  function closeMenu() { document.body.classList.remove('menu-open');const trigger=document.querySelector('[data-action="menu"]');if(trigger){trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-label','Abrir navegación');trigger.innerHTML=icon('menu');} }
  const save = () => { try { sessionStorage.setItem(stateKey, JSON.stringify(state)); } catch { /* The prototype also works without browser storage. */ } };
  const ready = () => state.customers.reduce((sum, c) => sum + Math.floor(c.stamps / state.config.goal), 0);
  const customer = id => state.customers.find(c => c.id === Number(id)) || state.customers[0];
  const brand = (dark = concept === 'ritmo' || view === 'acceso') => `<span class="brand"><img src="/assets/${dark ? 'logo_dark-mode.png' : 'logo-mark.png'}" alt="" /><span>vuelveclub<span class="brand-dot">.</span></span></span>`;
  function toast(message) { clearTimeout(toastTimer); const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('visible'); toastTimer = setTimeout(() => el.classList.remove('visible'), 4000); }
  function go(next) { if (view === next) { render(); return; } location.hash = next; }
  function reviewBar() { if (clientPreview) return `<div class="client-preview-bar"><span><strong>Vista de cliente</strong><span>Negocio de ejemplo</span></span><a href="/iniciar-sesion">Volver a mi cuenta ${icon('arrow')}</a></div>`; if (concept === 'ritmo') return ''; return `<div class="review-bar"><a href="/propuestas">${icon('arrow', 'back-arrow')}<span>Propuestas</span></a><nav aria-label="Cambiar propuesta">${Object.entries(concepts).map(([key, name]) => `<a href="/propuestas/${key}" ${concept === key ? 'aria-current="page"' : ''}>${name}</a>`).join('')}</nav><span class="review-note">Prototipo · Datos de ejemplo</span><button class="reset-demo" data-action="reset" aria-label="Restablecer datos de ejemplo" title="Restablecer datos">${icon('refresh')}</button></div>`; }
  function navLinks() { return nav.map(([key, glyph, label]) => `<a href="#${key}" title="${label}" aria-label="${label}" class="nav-item ${view === key ? 'active' : ''}" ${view === key ? 'aria-current="page"' : ''}>${icon(glyph)}<span>${label}</span>${key === 'clientes' ? `<span class="nav-count">${state.customers.length}</span>` : ''}</a>`).join(''); }
  function render() {
    if (![...nav.map(x => x[0]), 'mostrador', 'acceso'].includes(view)) view = 'inicio';
    document.body.className = `app-page theme-${concept} ${clientPreview ? 'client-preview-page' : ''} ${view === 'acceso' ? 'access-page' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`;
    document.title = `${concepts[concept]} · ${view === 'inicio' ? 'Inicio' : view === 'acceso' ? 'Acceso' : nav.find(x => x[0] === view)?.[2] || 'Mostrador'} | VuelveClub`;
    if (view === 'acceso') { location.replace('https://app.vuelveclub.com/iniciar-sesion'); return; }
    app.innerHTML = `${reviewBar()}<div class="app-layout"><aside class="sidebar" id="sidebar"><div class="sidebar-brand-row"><a href="#inicio" aria-label="VuelveClub, inicio">${brand()}</a><button class="icon-button sidebar-toggle" data-action="collapse-sidebar" aria-label="${sidebarCollapsed ? 'Expandir' : 'Colapsar'} barra lateral" title="${sidebarCollapsed ? 'Expandir' : 'Colapsar'} barra lateral" aria-expanded="${!sidebarCollapsed}" aria-controls="sidebar">${icon(sidebarCollapsed ? 'expand' : 'collapse')}</button></div><button class="business-switch" data-action="business" aria-label="Ver negocio: ${esc(state.business)}" title="${esc(state.business)}">${icon('coffee')}<span><strong>${esc(state.business)}</strong><small>${esc(state.branch)}</small></span>${icon('down')}</button><span class="nav-label">Tu negocio</span><nav class="main-nav" aria-label="Navegación principal">${navLinks()}</nav><a class="counter-link ${view === 'mostrador' ? 'active' : ''}" href="#mostrador" aria-label="Mostrador" title="Mostrador">${icon('scan')}<span>Mostrador</span>${icon('arrow')}</a><div class="sidebar-bottom"><a href="/soporte" target="_blank" rel="noopener" aria-label="Centro de ayuda" title="Centro de ayuda">${icon('help')}<span>Centro de ayuda</span>${icon('arrow')}</a><button class="profile" data-action="account" aria-label="Cuenta de Ana Martínez" title="Cuenta de Ana Martínez"><span class="avatar lavender">AM</span><span><strong>Ana Martínez</strong><small>Administradora</small></span>${icon('down')}</button></div></aside><div class="workspace"><header class="workspace-header"><button class="icon-button mobile-menu" data-action="menu" aria-label="Abrir navegación" aria-controls="sidebar" aria-expanded="false">${icon('menu')}</button><div class="header-actions"><button class="search-trigger" data-action="search" aria-label="Buscar cliente" aria-keyshortcuts="/">${icon('search')}<span>Buscar cliente</span><kbd>/</kbd></button><button class="icon-button notifications" data-action="activity" aria-label="Ver actividad reciente">${icon('bell')}<i></i></button><button class="header-avatar avatar lavender" data-action="account" aria-label="Cuenta de Ana Martínez">AM</button></div></header><main id="main" tabindex="-1">${page()}</main><footer class="workspace-footer"><span>${icon('heart')}Que sigan volviendo.</span><span>${esc(state.branch)} · Mérida, Yucatán</span></footer></div></div>`;
    if (view === 'inicio' && !countAnimated && !motion.matches) { countAnimated = true; document.querySelectorAll('[data-count]').forEach(el => {
      const value = Number(el.dataset.count); let start;
      const animate = time => { start ??= time; const p = Math.min((time - start) / 700, 1); el.textContent = Math.round(value * (1 - Math.pow(1 - p, 3))); if (p < 1 && el.isConnected) requestAnimationFrame(animate); };
      requestAnimationFrame(animate);
    }); }
  }
  function title(eyebrow, heading, description, action = '') { return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${heading}</h1>${description ? `<p class="page-description">${description}</p>` : ''}</div>${action}</div>`; }
  function page() { return ({ inicio: dashboard, clientes: clients, tarjeta: designer, sellos: devices, equipo: team, configuracion: settings, mostrador: counter })[view](); }
  function metric(value, label, detail, glyph, cls = '') { return `<div class="metric ${cls}"><span class="metric-title">${label}${icon(glyph)}</span><strong data-count="${value}">${value}</strong><span class="metric-detail">${detail}</span></div>`; }
  function dashboard() {
    const greeting = concept === 'ritmo' ? 'Un buen día para<br /><em>que vuelvan.</em>' : concept === 'mesa' ? 'Tu negocio,<br /><em>en movimiento.</em>' : 'Hola, Ana<span class="greeting-dot">.</span>';
    const intro = concept === 'pulso' ? 'Esto es lo que está pasando en tu negocio.' : concept === 'mesa' ? 'Cada visita cuenta. Aquí empieza la siguiente.' : 'Tu café, su lugar de siempre. Así va la semana.';
    return `<section class="dashboard-welcome">${title('Jueves, 22 de octubre', greeting, intro, `<a class="button button-dark" href="#mostrador">${icon('plus')}Registrar visita</a>`)}${concept === 'ritmo' ? `<div class="orbit-art" aria-hidden="true"><div class="orbit-ring"></div><div class="orbit-core">${icon('heart')}</div>${[0,1,2,3,4,5].map(i => `<span style="--i:${i}">${icon('heart')}</span>`).join('')}</div>` : ''}</section><section class="metrics-row" aria-label="Resumen del negocio">${metric(state.visits, 'Visitas de hoy', 'Personas que eligieron volver', 'nfc', 'metric-featured')}${metric(state.customers.length, 'Tarjetas activas', 'Tu comunidad, una visita a la vez', 'card')}${metric(ready(), 'Premios disponibles', 'Listos para hacerles el día', 'gift')}</section><div class="dashboard-grid"><section class="panel chart-panel"><div class="panel-heading"><div><h2>El ritmo de tus visitas</h2><p>Pequeñas visitas. Grandes costumbres.</p></div><div class="segmented" aria-label="Periodo del gráfico"><button data-period="week" aria-pressed="${state.period === 'week'}">7 días</button><button data-period="month" aria-pressed="${state.period === 'month'}">30 días</button></div></div>${chart()}</section><section class="program-panel"><div class="panel-heading"><h2>Tu tarjeta, siempre a mano.</h2><a class="small-link" href="#tarjeta" aria-label="Editar tarjeta">Editar ${icon('arrow')}</a></div>${pass(customer(1), true)}<div class="program-caption"><span>${icon('gift')}Cada ${state.config.goal} visitas, ${esc(state.config.reward.toLowerCase())}.</span><a href="#tarjeta">Ver tarjeta ${icon('arrow')}</a></div></section><section class="panel activity-panel"><div class="panel-heading"><div><h2>Las últimas vueltas</h2><p>La actividad de tu comunidad.</p></div><a class="small-link" href="#clientes">Ver clientes ${icon('arrow')}</a></div>${activityRows()}</section><section class="physical-panel"><div class="physical-copy"><span class="eyebrow">En tu mostrador</span><h2>Un toque.<br />Una visita más.</h2><p>Tu sello acompaña cada regreso.</p><a class="small-link" href="#sellos">Ver mi sello ${icon('arrow')}</a></div><div class="stamp-object" aria-hidden="true"><div class="stamp-top">${icon('nfc')}<span>vuelveclub.</span></div><div class="stamp-base"></div></div><div class="device-line"><span class="status-dot ${state.deviceActive ? '' : 'paused'}"></span>Sello Centro <span>${state.deviceActive ? 'Activo' : 'Pausado'}</span></div></section></div>`;
  }
  function chart() {
    const values = state.period === 'week' ? [18,24,19,32,27,38,state.visits] : [16,22,18,28,21,34,26,23,30,28,35,29,24,state.visits];
    const max = Math.max(40, ...values); const sum = values.reduce((a,b) => a+b, 0);
    return `<div class="chart-meta"><strong>${sum}<span>visitas en el periodo</span></strong><span class="chart-key"><i></i>Visitas registradas</span></div><div class="chart" role="img" aria-label="${sum} visitas en ${state.period === 'week' ? '7' : '30'} días. ${values.join(', ')} visitas por ${state.period === 'week' ? 'día' : 'grupo de días'}."><div class="chart-guides"><span>${max}</span><span>${Math.round(max/2)}</span><span>0</span></div><div class="chart-bars">${values.map((v,i) => `<div class="chart-column" style="--delay:${i*24}ms"><div class="bar-track"><div class="chart-bar ${i === values.length-1 ? 'current' : ''}" style="--height:${v/max*100}%"><span class="bar-tip">${v} visitas</span></div></div><span>${state.period === 'week' ? ['V','S','D','L','M','M','J'][i] : (i%3 === 0 ? `${i*2+1}` : '·')}</span></div>`).join('')}</div></div><div class="chart-footer"><span>${state.period === 'week' ? '16 oct.' : '23 sep.'}</span><span>Hoy, 22 oct.</span></div>`;
  }
  function activityRows() { return `<div class="activity-list">${state.activity.slice(0,4).map(a => { const c=customer(a.id); return `<button class="activity-row" data-customer="${c.id}"><span class="avatar ${c.color}">${initials(c.name)}</span><span class="activity-person"><strong>${esc(c.name)}</strong><small>${esc(a.text)}</small></span><span class="activity-tag ${a.type === 'reward' ? 'reward-tag' : ''}">${icon(a.type === 'reward' ? 'gift' : 'nfc')}${a.type === 'redeem' ? 'Canje' : a.type === 'reward' ? 'Premio' : '+1 sello'}</span><time>${esc(a.time)}</time></button>`; }).join('')}</div>`; }
  function pass(c, compact = false, draft = state.config) {
    const color = /^#[0-9a-f]{6}$/i.test(draft.color) ? draft.color : '#CBDE2A';
    const rgb = [1,3,5].map(i => parseInt(color.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
    const ink = .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2] > .179 ? '#191b10' : '#ffffff';
    const total = Math.max(5, Math.min(20, Number(draft.goal) || 10));
    return `<div class="loyalty-pass ${compact ? 'compact-pass' : ''}" style="--pass-bg:${color};--pass-ink:${ink}"><div class="pass-head"><span class="pass-symbol">${icon('coffee')}</span><span><strong>${esc(state.business)}</strong><small>Tu lugar de siempre</small></span><span class="pass-more" aria-hidden="true">···</span></div><div class="pass-stamps" style="--columns:${total <= 10 ? 5 : 6}">${Array.from({length:total},(_,i)=>`<span class="pass-stamp ${i<c.stamps?'filled':''} ${i===c.stamps-1?'last-stamp':''}">${icon('heart')}</span>`).join('')}</div><div class="pass-bottom"><div><small>TU RECOMPENSA</small><strong>${esc(draft.reward)}</strong></div><span>${Math.min(c.stamps,total)} <small>/ ${total}</small></span></div><div class="pass-owner">${esc(c.name)}<span>VuelveClub</span></div></div>`;
  }
  function clients() { return `${title('Tu comunidad', 'Tus clientes.', 'Sus tarjetas, visitas y recompensas en un solo lugar.', `<button class="button button-dark" data-action="new-customer">${icon('qr')}Registrar cliente</button>`)}<section class="panel customer-panel"><div class="customer-toolbar"><label class="search-input">${icon('search')}<input id="customer-search" type="search" placeholder="Nombre, correo o celular" aria-label="Buscar clientes" value="${esc(filter)}" /></label><button class="filter-button ${onlyReady ? 'selected' : ''}" data-action="ready-filter" aria-pressed="${onlyReady}">${icon('gift')}Con premio disponible</button></div><div id="customer-results">${customerRows()}</div></section>`; }
  function customerRows() {
    const rows=state.customers.filter(c=>window.VuelveDemo.matches(c,filter)&&(!onlyReady||c.stamps>=state.config.goal));
    return `<div class="customer-table"><div class="customer-table-head"><span>Cliente</span><span>Progreso de tarjeta</span><span>Visitas totales</span><span>Estado</span><span></span></div>${rows.length ? rows.map(c=>`<button class="customer-row" data-customer="${c.id}"><span class="customer-name"><span class="avatar ${c.color}">${initials(c.name)}</span><span><strong>${esc(c.name)}</strong><small>${esc(c.email)}</small></span></span><span class="customer-progress"><span class="progress-track"><i style="width:${Math.min(c.stamps/state.config.goal,1)*100}%"></i></span><small>${c.stamps} / ${state.config.goal} sellos</small></span><span class="visit-count">${c.visits}</span><span class="customer-state ${c.stamps>=state.config.goal?'has-reward':''}">${c.stamps>=state.config.goal?icon('gift')+'Premio listo':'En camino'}</span>${icon('chevron')}</button>`).join('') : `<div class="empty-state">${icon('search')}<h2>No encontramos coincidencias.</h2><p>Prueba otro nombre o cambia el filtro.</p></div>`}</div><div class="table-footer"><span>${rows.length} ${rows.length===1?'cliente':'clientes'}</span><span>Programa de ${esc(state.business)}</span></div>`;
  }
  function designer() { return window.VuelveCardDesigner.render(state); }
  function devices() { return `${title('Operación del negocio', 'El sello que los hace volver.', 'Asigna tus sellos a cada sucursal y ten su actividad a la mano.')}<div class="devices-grid"><section class="panel device-card"><div class="device-card-top"><span class="customer-state ${state.deviceActive?'has-reward':''}"><span class="status-dot ${state.deviceActive?'':'paused'}"></span>${state.deviceActive?'Activo':'Pausado'}</span><span class="mono">VC · 001</span></div><div class="stamp-object big-stamp" aria-hidden="true"><div class="stamp-top">${icon('nfc')}<span>vuelveclub.</span></div><div class="stamp-base"></div></div><h2>Sello principal</h2><p>${esc(state.branch)}</p><div class="device-facts"><span>Responsable<strong>Ana Martínez</strong></span><span>Última lectura<strong>Hace 3 minutos</strong></span></div><div class="device-actions"><button class="button button-dark" data-action="device-test" ${!state.deviceActive?'disabled':''}>${icon('nfc')}Probar lectura</button><button class="button button-outline" data-action="device-toggle">${state.deviceActive?'Pausar sello':'Activar sello'}</button></div></section><section class="device-explainer"><span class="eyebrow">El trabajo del sello</span><h2>Menos pantallas.<br />Más buenos momentos.</h2><ol class="device-steps"><li><span>01</span><div><h3>Tu cliente vuelve</h3><p>Su tarjeta ya está en el celular.</p></div></li><li><span>02</span><div><h3>El sello registra la visita</h3><p>Cada lectura corresponde a un movimiento.</p></div></li><li><span>03</span><div><h3>La tarjeta se actualiza</h3><p>Un paso más cerca de su recompensa.</p></div></li></ol><p class="prototype-detail">Esta es una representación del sello. La lectura de esta propuesta es simulada; el flujo físico se validará con el dispositivo comprado.</p><a class="text-link" href="#mostrador">Abrir el respaldo desde el panel ${icon('arrow')}</a></section></div>`; }
  function counter() { const c=customer(selected);return `${title('Mostrador', 'Registrar una visita.', 'Busca al cliente y añade su sello o entrega su recompensa.', `<button class="button button-outline" data-action="new-customer">${icon('qr')}Nuevo cliente</button>`)}<div class="counter-grid"><section class="panel counter-customers"><div class="panel-heading"><h2>¿Quién volvió hoy?</h2></div><label class="search-input counter-search">${icon('search')}<input id="counter-search" type="search" placeholder="Nombre, correo o celular" aria-label="Buscar cliente para registrar visita" value="${esc(counterFilter)}" aria-controls="counter-results" /><kbd>/</kbd></label><div id="counter-results">${counterRows()}</div></section><section class="counter-workspace"><div class="counter-person-title"><span class="eyebrow">${esc(c.name)}</span><h2>${c.stamps>=state.config.goal?'Su premio está listo.':'Una vuelta más cuenta.'}</h2></div>${pass(c)}<div class="counter-buttons"><button class="button button-dark" data-stamp="${c.id}">${icon('plus')}Registrar visita</button><button class="button button-outline" data-redeem="${c.id}" ${c.stamps<state.config.goal?'disabled':''}>${icon('gift')}Canjear premio</button></div><p class="counter-hint">${c.stamps>=state.config.goal?`${Math.floor(c.stamps/state.config.goal)} premio disponible. Confirma el canje al entregar la recompensa.`:`Le ${state.config.goal-c.stamps===1?'falta 1 visita':`faltan ${state.config.goal-c.stamps} visitas`} para ${esc(state.config.reward.toLowerCase())}.`}</p></section></div>`; }
  function counterRows() {
    const rows=state.customers.filter(person=>window.VuelveDemo.matches(person,counterFilter));
    return `<p class="counter-result-count" role="status" aria-live="polite">${rows.length} ${rows.length===1?'cliente':'clientes'}${counterFilter?' encontrados':''}</p><div class="counter-list">${rows.length?rows.map(person=>`<button class="counter-person ${selected===person.id?'selected':''}" data-select="${person.id}" aria-pressed="${selected===person.id}"><span class="avatar ${person.color}">${initials(person.name)}</span><span><strong>${esc(person.name)}</strong><small>${person.stamps>=state.config.goal?'Premio disponible':`${person.stamps} de ${state.config.goal} sellos`}</small></span>${icon('chevron')}</button>`).join(''):`<div class="counter-empty">${icon('search')}<p>No encontramos a ese cliente.</p><button class="small-link" data-action="new-customer">Registrar con QR ${icon('arrow')}</button></div>`}</div>`;
  }
  function team() { return `${title('Las personas detrás', 'Tu equipo también hace que vuelvan.', 'Cada persona con su propio acceso y los permisos que necesita.', `<button class="button button-dark" data-action="invite">${icon('plus')}Invitar al equipo</button>`)}<section class="panel team-panel">${state.team.map(m=>`<div class="team-row"><span class="avatar ${m.id%2?'lavender':'sage'}">${initials(m.name)}</span><span class="team-name"><strong>${esc(m.name)}</strong><small>${esc(m.email)}</small></span><span class="team-role">${esc(m.role)}</span><span class="customer-state ${m.status==='Activo'?'has-reward':''}">${esc(m.status)}</span>${m.id===1?'<span class="team-you">Tú</span>':`<button class="small-link" data-member="${m.id}">${m.status==='Pausado'?'Activar':'Pausar'}</button>`}</div>`).join('')}</section><div class="permissions-note">${icon('people')}<p><strong>Un equipo, diferentes permisos.</strong> El dueño configura el programa y administra accesos. El personal registra visitas y canjes en su sucursal.</p></div>`; }
  function settings() { return `${title('Todo en su lugar', 'Los detalles de tu negocio.', 'Tu información, sucursal y ayuda, sin dar vueltas.')}<div class="settings-grid"><form class="panel settings-form" id="settings-form"><h2>Información del negocio</h2><label for="business-name">Nombre del negocio</label><input id="business-name" name="business" maxlength="40" value="${esc(state.business)}" required /><label for="branch-name">Sucursal</label><input id="branch-name" name="branch" maxlength="40" value="${esc(state.branch)}" required /><div class="settings-static"><span>Zona horaria<strong>Ciudad de México</strong></span><span>Idioma<strong>Español · México</strong></span></div><button class="button button-dark" type="submit">Guardar cambios ${icon('check')}</button></form><section class="settings-aside"><div class="panel plan-summary"><span class="eyebrow">Tu plan</span><h2>Todo para que vuelvan.</h2><p class="plan-price">$349<span>MXN / mes por sucursal</span></p><ul><li>${icon('check')}Clientes ilimitados</li><li>${icon('check')}Apple y Google Wallet</li><li>${icon('check')}Soporte incluido</li></ul></div><a class="help-panel" href="/soporte" target="_blank" rel="noopener">${icon('help')}<span><strong>Aquí estamos para ayudarte.</strong><small>Habla con el equipo de VuelveClub.</small></span>${icon('arrow')}</a></section></div>`; }


  function openModal(titleText, content, cls='') {
    modal.className=cls;
    modal.innerHTML=`<div class="modal-top"><h2 id="modal-title">${titleText}</h2><button class="icon-button" data-close aria-label="Cerrar ventana">${icon('close')}</button></div>${content}`;
    modal.showModal();
  }
  function customerDetail(id) { const c=customer(id); openModal('Una buena historia.',`<div class="drawer-customer"><span class="avatar large-avatar ${c.color}">${initials(c.name)}</span><h3>${esc(c.name)}</h3><p>${esc(c.email)}</p>${c.phone?`<p>${esc(c.phone)}</p>`:''}</div>${pass(c)}<div class="detail-metrics"><span><strong>${c.visits}</strong>visitas totales</span><span><strong>${Math.floor(c.stamps/state.config.goal)}</strong>premios disponibles</span></div><button class="button button-dark full-width" data-open-counter="${c.id}">${icon('nfc')}Abrir en Mostrador ${icon('arrow')}</button>`,'drawer'); }
  function log(c, type) { state.activity.unshift({id:c.id,text:type==='redeem'?'Canjeó su recompensa':c.stamps>=state.config.goal?'Completó su tarjeta':'Recibió un sello',time:'Ahora mismo',type:type==='redeem'?'redeem':c.stamps>=state.config.goal?'reward':'stamp'});state.activity=state.activity.slice(0,12);save(); }
  async function stamp(id) {
    if(busy)return;busy=true;document.querySelectorAll('[data-stamp]').forEach(b=>{b.disabled=true;b.innerHTML=`${icon('nfc')}Registrando…`;});
    await new Promise(resolve=>setTimeout(resolve,motion.matches?0:480));
    const c=customer(id);c.stamps++;c.visits++;state.visits++;log(c,'stamp');selected=c.id;busy=false;
    if(modal.open)modal.close();render();
    const passEl=document.querySelector('.counter-workspace .loyalty-pass');
    if(passEl&&!motion.matches)passEl.classList.add('just-stamped');
    toast(c.stamps%state.config.goal===0?`¡Tarjeta completa! ${c.name.split(' ')[0]} ya tiene su premio.`:`Visita registrada para ${c.name.split(' ')[0]}. Un sello más.`);
  }
  function redeem(id) { const c=customer(id);if(c.stamps<state.config.goal)return;openModal('Un premio bien ganado.',`<div class="redeem-art">${icon('gift')}</div><p class="modal-description">${esc(c.name)} puede disfrutar <strong>${esc(state.config.reward.toLowerCase())}</strong>. Confirma cuando entregues su recompensa.</p><div class="modal-buttons"><button class="button button-outline" data-close>Volver</button><button class="button button-dark" data-confirm-redeem="${c.id}">${icon('check')}Confirmar canje</button></div>`); }
  function focusSearch() {
    if(view==='mostrador'||view==='clientes'){document.querySelector(view==='mostrador'?'#counter-search':'#customer-search')?.focus();return;}
    filter='';onlyReady=false;go('clientes');requestAnimationFrame(()=>document.querySelector('#customer-search')?.focus());
  }
  function shareCard() {
    const url=window.VuelveDemo.enrollmentUrl(state.business,state.config);
    const qr=qrcode(0,'M');qr.addData(url);qr.make();
    const svg=qr.createSvgTag({cellSize:4,margin:16,scalable:true});
    openModal('Su próxima tarjeta empieza aquí.',`<p class="modal-description qr-intro">Tu cliente escanea, completa sus datos y elige Apple Wallet o Google Wallet.</p><div class="business-qr" role="img" aria-label="QR de registro de ${esc(state.business)}">${svg}</div><p class="qr-business">${esc(state.business)}</p><p class="qr-caption">Un mismo QR para todos los clientes de tu negocio.</p><label class="share-link-label" for="enrollment-link">Tu enlace de registro</label><div class="share-link-row"><input id="enrollment-link" value="${esc(url)}" readonly /><button class="icon-button" data-action="copy-enrollment" aria-label="Copiar enlace de registro" title="Copiar enlace">${icon('copy')}</button></div><div class="qr-actions"><a class="button button-dark" href="${esc(url)}" target="_blank" rel="noopener">Abrir registro ${icon('arrow')}</a><button class="button button-outline" data-action="download-qr">${icon('download')}Descargar QR</button></div><p class="qr-demo-note">Vista previa del registro. La emisión de tarjetas Wallet está pendiente de conexión.</p>`,'qr-modal');
  }
  async function copyEnrollment() {
    const input=document.querySelector('#enrollment-link');
    if(!input)return;
    try{await navigator.clipboard.writeText(input.value);toast('Enlace copiado. Listo para compartir.');}
    catch{input.focus();input.select();toast('Selecciona y copia el enlace de registro.');}
  }
  async function downloadQr() {
    const svg=document.querySelector('.business-qr svg');if(!svg)return;
    const button=document.querySelector('#modal [data-action="download-qr"]');
    if(button?.disabled)return;
    const original=button?.innerHTML;
    if(button){button.disabled=true;button.setAttribute('aria-busy','true');button.textContent='Preparando diseño…';}
    try{
      await window.VuelveQRDownload.download({svg,business:document.querySelector('#modal .qr-business')?.textContent||state.business,testOnly:!!svg.closest('.wallet-save-qr')});
      toast('Diseño con QR descargado. Listo para compartir o imprimir.');
    }catch{toast('No pudimos descargar el diseño. Inténtalo de nuevo.');}
    finally{if(button){button.disabled=false;button.removeAttribute('aria-busy');button.innerHTML=original;}}
  }
  let walletRequest = 0;
  async function testWallet() {
    const form = document.querySelector('#design-form');
    if (!form?.reportValidity()) return;
    const design = window.VuelveCardDesigner.draft();
    state.business = design.business;
    const { business, ...config } = design;
    state.config = config;
    save();
    const requestId = ++walletRequest;
    openModal('De tu negocio a tu Wallet.', '<div id="wallet-result" aria-busy="true"><div class="wallet-qr-skeleton" aria-hidden="true"></div><p class="qr-caption" role="status">Preparando tu tarjeta de prueba en Google Wallet…</p></div>', 'qr-modal wallet-test-modal');
    try {
      const result = await window.VuelveWallet.issueTest(design);
      const target = document.querySelector('#wallet-result');
      if (!modal.open || !target || requestId !== walletRequest) return;
      const qr = qrcode(0, 'L'); qr.addData(result.saveUrl); qr.make();
      target.setAttribute('aria-busy', 'false');
      target.innerHTML = `<span class="wallet-test-badge">Tarjeta de prueba · Alex Demo</span><p class="modal-description qr-intro">Escanea con tu celular y agrega esta tarjeta a Google Wallet.</p><div class="business-qr wallet-save-qr" role="img" aria-label="QR para agregar la tarjeta de prueba a Google Wallet">${qr.createSvgTag({ cellSize: 4, margin: 20, scalable: true })}</div><p class="qr-business">${esc(design.business)}</p><p class="qr-caption">${esc(design.reward)} · ${design.goal} visitas</p><div class="qr-actions"><a class="button button-dark" href="${esc(result.saveUrl)}" target="_blank" rel="noopener noreferrer">Abrir en Google Wallet ↗</a><button class="button button-outline" data-action="download-qr">${icon('download')}Descargar QR</button></div><p class="qr-demo-note">Este QR agrega la misma tarjeta de prueba. No es el registro para clientes. El enlace dura 24 horas; puedes generar otro aquí.</p>`;
    } catch (error) {
      const target = document.querySelector('#wallet-result');
      if (!modal.open || !target || requestId !== walletRequest) return;
      const needsSignIn = ['SIGN_IN_REQUIRED', 'APP_ORIGIN_REQUIRED'].includes(error.message);
      const messages = {
        NOT_CONFIGURED: 'La conexión con Google Wallet aún no está configurada.',
        GOOGLE_ACCESS_DENIED: 'Google no permitió crear la tarjeta. Revisaremos los permisos del emisor.',
        INVALID_DESIGN: 'Revisa el nombre, la recompensa y el color de la tarjeta.',
        INVALID_LOGO: 'Vuelve a subir tu logo desde esta cuenta antes de generar la tarjeta.'
      };
      target.setAttribute('aria-busy', 'false');
      target.innerHTML = `<div class="wallet-test-error" role="alert"><span class="eyebrow">${needsSignIn ? 'Tu cuenta de negocio' : 'Intentémoslo de nuevo'}</span><p>${needsSignIn ? 'Inicia sesión en la plataforma para crear tu tarjeta de prueba. Tu diseño queda guardado en este navegador.' : (messages[error.message] || 'No pudimos preparar la tarjeta. Tu diseño está guardado; vuelve a intentarlo.')}</p>${needsSignIn ? '<a class="button button-dark" href="https://app.vuelveclub.com/iniciar-sesion">Iniciar sesión</a><p class="qr-demo-note">Después de entrar, vuelve a Tu tarjeta para continuar.</p>' : '<button class="button button-dark" data-action="wallet-retry">Volver a intentar</button>'}</div>`;
    }
  }
  if('BroadcastChannel' in window){
    const channel=new BroadcastChannel('vuelveclub-enrollment-demo');
    channel.addEventListener('message',event=>{
      const data=event.data,member=data?.member;
      if(data?.type!=='enrollment'||data.businessId!==window.VuelveDemo.businessId||data.termsVersion!=='draft-preview'||!member||typeof member.name!=='string'||typeof member.email!=='string'||typeof member.phone!=='string'||typeof data.registrationId!=='string')return;
      const name=member.name.trim().slice(0,60),email=member.email.trim().toLowerCase().slice(0,120),phone=window.VuelveDemo.phone(member.phone);
      if(!name||!/^\S+@\S+\.\S+$/.test(email)||!phone)return;
      const registration=state.customers.find(c=>c.registrationId===data.registrationId);
      const existing=state.customers.find(c=>c.email.toLowerCase()===email);
      if(existing&&existing!==registration){toast('Este correo ya está en el negocio de ejemplo.');return;}
      if(registration){Object.assign(registration,{name,email,phone,acceptedAt:data.acceptedAt});save();render();toast('Datos del cliente actualizados en el ejemplo.');return;}
      const id=Math.max(0,...state.customers.map(c=>c.id))+1;
      state.customers.push({id,name,email,phone,stamps:0,visits:0,color:'sage',registrationId:data.registrationId,acceptedAt:data.acceptedAt,termsVersion:data.termsVersion});save();render();toast(`${name.split(' ')[0]} ya aparece en el panel de ejemplo.`);
    });
  }
  document.addEventListener('click',event=>{
    if(document.body.classList.contains('menu-open')&&!event.target.closest('#sidebar,[data-action="menu"]')){closeMenu();return;}
    if(event.target.closest('.nav-item,.counter-link'))closeMenu();
    const el=event.target.closest('button,[data-customer]');if(!el)return;
    if(el.hasAttribute('data-close')){modal.close();return;}
    if(el.dataset.customer){customerDetail(el.dataset.customer);return;}
    if(el.dataset.select){selected=Number(el.dataset.select);render();document.querySelector('.counter-workspace [data-stamp]')?.focus({preventScroll:true});if(matchMedia('(max-width:980px)').matches)document.querySelector('.counter-workspace')?.scrollIntoView({behavior:motion.matches?'instant':'smooth',block:'start'});return;}
    if(el.dataset.stamp){stamp(el.dataset.stamp);return;}
    if(el.dataset.redeem){redeem(el.dataset.redeem);return;}
    if(el.dataset.confirmRedeem){const c=customer(el.dataset.confirmRedeem);if(c.stamps>=state.config.goal){c.stamps-=state.config.goal;log(c,'redeem');}modal.close();render();toast('Premio entregado. Que sea la primera de muchas vueltas.');return;}
    if(el.dataset.openCounter){selected=Number(el.dataset.openCounter);modal.close();go('mostrador');return;}
    if(el.dataset.period){state.period=el.dataset.period;save();render();return;}
    if(el.dataset.color){document.querySelector('#custom-color').value=el.dataset.color;document.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b===el)));updatePreview();return;}
    if(el.dataset.member){const m=state.team.find(x=>x.id===Number(el.dataset.member));m.status=m.status==='Pausado'?'Activo':'Pausado';save();render();toast(`Acceso de ${m.name.split(' ')[0]} ${m.status==='Activo'?'activado':'pausado'} en el ejemplo.`);return;}
    const action=el.dataset.action;
    if(action==='menu'){const open=document.body.classList.toggle('menu-open');el.setAttribute('aria-expanded',String(open));el.setAttribute('aria-label',open?'Cerrar navegación':'Abrir navegación');el.innerHTML=icon(open?'close':'menu');}
    if(action==='search')focusSearch();
    if(action==='collapse-sidebar'){
      sidebarCollapsed=!sidebarCollapsed;document.body.classList.toggle('sidebar-collapsed',sidebarCollapsed);
      el.setAttribute('aria-expanded',String(!sidebarCollapsed));el.setAttribute('aria-label',`${sidebarCollapsed?'Expandir':'Colapsar'} barra lateral`);el.title=el.getAttribute('aria-label');el.innerHTML=icon(sidebarCollapsed?'expand':'collapse');
      try{sessionStorage.setItem('vc-sidebar-collapsed',String(sidebarCollapsed));}catch{/* Optional preference. */}
    }
    if(action==='share-card'||action==='new-customer')shareCard();
    if(action==='copy-enrollment')copyEnrollment();
    if(action==='download-qr')downloadQr();
    if(action==='wallet-test'||action==='wallet-retry')testWallet();
    if(action==='ready-filter'){onlyReady=!onlyReady;render();}
    if(action==='business')openModal('Tu lugar de siempre.',`<div class="business-detail">${icon('coffee')}<h3>${esc(state.business)}</h3><p>${esc(state.branch)} · Mérida</p></div><a class="button button-dark full-width" href="#configuracion" data-dismiss>Editar negocio ${icon('arrow')}</a>`);
    if(action==='account')openModal('Hola, Ana.',`<div class="account-options"><a href="#configuracion" data-dismiss>${icon('settings')}Configuración del negocio ${icon('arrow')}</a><a href="#acceso" data-dismiss>${icon('logout')}Ver propuesta de acceso ${icon('arrow')}</a><a href="/soporte" target="_blank" rel="noopener">${icon('help')}Centro de ayuda ${icon('arrow')}</a></div>`);
    if(action==='activity')openModal('Las últimas vueltas.',activityRows(),'drawer');
    if(action==='invite')openModal('Las cosas buenas se hacen en equipo.',`<form id="invite-form"><p class="modal-description">Crea una invitación de ejemplo. No se envía ningún correo.</p><label for="invite-name">Nombre</label><input id="invite-name" name="name" maxlength="60" required /><label for="invite-email">Correo electrónico</label><input id="invite-email" name="email" type="email" maxlength="120" required /><label for="invite-role">Rol</label><select id="invite-role" name="role"><option>Personal</option><option>Encargado</option></select><p class="field-error" role="alert"></p><button class="button button-dark full-width" type="submit">Crear invitación ${icon('arrow')}</button></form>`);
    if(action==='device-toggle'){state.deviceActive=!state.deviceActive;save();render();toast(state.deviceActive?'Sello activado en el ejemplo.':'Sello pausado en el ejemplo.');}
    if(action==='device-test')openModal('Probemos el siguiente regreso.',`<div class="reading-animation">${icon('nfc')}<i></i><i></i><i></i></div><p class="modal-description">Simula una lectura para registrar una visita de <strong>${esc(customer(1).name)}</strong>.</p><button class="button button-dark full-width" data-stamp="1">Simular lectura ${icon('arrow')}</button>`);
    if(action==='forgot')openModal('Recuperar acceso.',`<p class="modal-description">Así se vería la recuperación de cuenta.</p><form id="recovery-form"><label for="recovery-email">Correo de tu negocio</label><input id="recovery-email" type="email" required /><button class="button button-dark full-width" type="submit">Ver confirmación ${icon('arrow')}</button></form>`);
    if(action==='reset'){state=seed();state.customers.forEach((c,i)=>{c.phone=`+52999000000${i+1}`;});selected=1;filter='';counterFilter='';onlyReady=false;save();if(modal.open)modal.close();render();toast('Todo listo. Volvimos a los datos de ejemplo.');}
  });
  document.addEventListener('click',event=>{if(event.target.closest('[data-dismiss]')&&modal.open)modal.close();});
  modal.addEventListener('click',event=>{if(event.target===modal){const r=modal.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)modal.close();}});
  document.addEventListener('wallet-logo-change', event => {
    delete state.config.logoUrl; delete state.config.logoToken;
    Object.assign(state.config, event.detail); save();
  });
  function updatePreview(){ window.VuelveCardDesigner.update(); }
  document.addEventListener('input',event=>{
    if(event.target.id==='customer-search'){filter=event.target.value;document.querySelector('#customer-results').innerHTML=customerRows();}
    if(event.target.id==='counter-search'){counterFilter=event.target.value;document.querySelector('#counter-results').innerHTML=counterRows();}
    if(event.target.closest('#design-form')){if(event.target.id==='custom-color')document.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color.toLowerCase()===event.target.value.toLowerCase())));updatePreview();}
  });
  document.addEventListener('change',event=>{if(event.target.id==='stamp-goal')updatePreview();});
  document.addEventListener('submit',event=>{
    const form=event.target;if(!['design-form','settings-form','invite-form','access-form','recovery-form'].includes(form.id))return;event.preventDefault();
    const data=Object.fromEntries(new FormData(form));
    if(form.id==='design-form'){const design=window.VuelveCardDesigner.draft();if(!design.reward||!design.business){toast('Escribe el negocio y la recompensa.');return;}state.business=design.business;const {business,...config}=design;state.config=config;save();toast('Diseño guardado en este navegador.');}
    if(form.id==='settings-form'){if(!data.business.trim()||!data.branch.trim()){toast('Completa el nombre del negocio y la sucursal.');return;}state.business=data.business.trim();state.branch=data.branch.trim();save();render();toast('Los datos de tu negocio están al día.');}
    if(form.id==='invite-form'){
      const name=data.name.trim(),email=data.email.trim();const list=state.team;
      if(!name){form.querySelector('.field-error').textContent='Escribe un nombre.';return;}
      if(list.some(x=>x.email.toLowerCase()===email.toLowerCase())){form.querySelector('.field-error').textContent='Este correo ya está en la lista.';return;}
      const id=Math.max(...list.map(x=>x.id))+1;
      list.push({id,name,email,role:data.role,status:'Invitado'});save();modal.close();render();toast('Invitación de ejemplo creada. No se envió ningún correo.');
    }

    if(form.id==='recovery-form'){modal.close();toast('Vista previa: aquí confirmaríamos el envío del enlace de recuperación.');}
  });
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.target.closest('input,textarea,select,[contenteditable]')&&!modal.open){event.preventDefault();focusSearch();}if(event.key==='Escape')closeMenu();});
  addEventListener('hashchange',()=>{view=location.hash.slice(1)||'inicio';if(modal.open)modal.close();render();window.scrollTo({top:0,behavior:'instant'});});
  render();
})();
