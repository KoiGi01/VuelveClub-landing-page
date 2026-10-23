(() => {
  const slug = location.pathname.split('/').filter(Boolean).at(-1);
  const live = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(slug || '');
  const script = document.createElement('script');
  if (live) {
    document.querySelector('.enrollment-notice')?.remove();
    document.body.classList.add('live-enrollment');
    document.querySelector('#enrollment').innerHTML = '<div class="enrollment-loading" role="status" aria-label="Cargando tu tarjeta"><div></div><div></div></div>';
    const css=document.createElement('link');css.rel='stylesheet';css.href='/dashboard/business.css';document.head.append(css);
    script.type='module';script.src='/tarjeta/recursos/registro-live.js';
  } else script.src='/tarjeta/recursos/registro.js';
  script.onerror=()=>{document.querySelector('#enrollment').innerHTML='<main class="enrollment-unavailable"><h1>No pudimos cargar tu tarjeta.</h1><p>Recarga la página para volver a intentar.</p></main>';};
  document.head.append(script);
})();
