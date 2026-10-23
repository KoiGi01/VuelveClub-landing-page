import { cardPreview } from '/dashboard/business.js';
const root=document.querySelector('#enrollment');
const slug=location.pathname.split('/').filter(Boolean).at(-1);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let program, token, submitted;
try{token=sessionStorage.getItem(`vc-enrollment:${slug}`);}catch{}
if(!/^[a-f0-9]{64}$/.test(token||'')){token=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');try{sessionStorage.setItem(`vc-enrollment:${slug}`,token);}catch{}}
const messages={REGISTRATION_EXISTS:'No pudimos crear una tarjeta nueva con estos datos. Si ya te registraste, pide ayuda al negocio para recuperar tu tarjeta.',PROGRAM_CHANGED:'El negocio actualizó su tarjeta o sus documentos. Recarga la página para revisar la nueva versión.',
  INVALID_REQUEST:'Revisa tus datos. En México, usa 10 dígitos para el celular; para otro país incluye + y tu código.',TRY_AGAIN_LATER:'Hay demasiados intentos. Espera unos minutos y vuelve a intentar.',WALLET_PENDING:'Tu registro quedó guardado. Google Wallet no respondió; vuelve a intentar con el botón de abajo.'};
async function request(url, options){const r=await fetch(url,{...options,signal:AbortSignal.timeout(55000)});const result=await r.json();if(!r.ok)throw Error(result.error||'UNAVAILABLE');return result;}
function fields(){return `<form id="live-enrollment-form"><h2>Que volver<br />tenga su premio.</h2><p class="enrollment-intro">Completa tus datos y guarda tu tarjeta en Google Wallet.</p><label for="live-member-name">Tu nombre</label><input id="live-member-name" name="name" autocomplete="name" maxlength="120" required /><label for="live-member-email">Correo electrónico</label><input id="live-member-email" type="email" name="email" autocomplete="email" maxlength="254" required /><label for="live-member-phone">Número de celular</label><input id="live-member-phone" type="tel" name="phone" autocomplete="tel" inputmode="tel" maxlength="24" placeholder="999 123 4567" required aria-describedby="live-phone-caption" /><p class="phone-caption" id="live-phone-caption">México: 10 dígitos. Otro país: incluye + y tu código.</p><div class="live-honeypot" aria-hidden="true"><label>Deja vacío<input name="website" tabindex="-1" autocomplete="off" /></label></div><label class="terms-label"><input type="checkbox" name="terms" required /><span>Acepto los <a href="${esc(program.termsUrl)}" target="_blank" rel="noopener noreferrer">términos y condiciones</a> y he leído el <a href="${esc(program.privacyUrl)}" target="_blank" rel="noopener noreferrer">aviso de privacidad</a> de ${esc(program.name)}.</span></label><p class="field-error" role="alert"></p><button class="button button-dark enrollment-submit" type="submit">Crear mi tarjeta →</button><p class="enrollment-footnote">Sin contraseña. Sin crear una cuenta.</p></form>`;}
function render(){
  document.title=`Tu tarjeta de ${program.name} | VuelveClub`;
  document.querySelector('meta[name=description]').content=`Regístrate a la tarjeta de recompensas de ${program.name}.`;
  root.innerHTML=`<div class="enrollment-shell"><header class="enrollment-header"><a href="https://www.vuelveclub.com" aria-label="VuelveClub, inicio"><span class="brand"><img src="/assets/logo-mark.png" alt="" /><span>vuelveclub<span class="brand-dot">.</span></span></span></a><span class="enrollment-business">${esc(program.name)}</span></header><main class="enrollment-layout" id="main"><section class="enrollment-story"><div><p class="eyebrow">${esc(program.name)}</p><h1>Tu lugar.<br />Tus <em>recompensas.</em></h1><p class="enrollment-story-copy">${program.goal} visitas. ${esc(program.reward)}. Y muchas buenas razones para volver.</p></div><div class="enrollment-pass-wrap">${cardPreview({business:program.name,reward:program.reward,goal:program.goal,color:program.color,logoUrl:program.logoUrl})}</div><p class="enrollment-story-foot">Los buenos lugares se vuelven costumbre.</p></section><section class="enrollment-content" aria-label="Registro a la tarjeta">${fields()}</section></main><footer class="enrollment-footer"><span>Powered by vuelveclub.</span><a href="/soporte" target="_blank" rel="noopener">¿Necesitas ayuda?</a></footer></div>`;
}
async function register(form){
  const buttons=form.querySelectorAll('button');if(form.getAttribute('aria-busy')==='true')return;
  form.setAttribute('aria-busy','true');buttons.forEach(b=>b.disabled=true);
  const status=form.querySelector('.field-error');status.textContent='Creando tu tarjeta…';
  try{
    const result=await request('/api/enrollment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(submitted)});
    if(!/^https:\/\/pay\.google\.com\/gp\/v\/save\/[A-Za-z0-9_.-]+$/.test(result.saveUrl))throw Error('UNAVAILABLE');
    try{sessionStorage.removeItem(`vc-enrollment:${slug}`);}catch{}
    document.querySelector('.enrollment-content').innerHTML=`<div class="enrollment-success" tabindex="-1"><span class="success-heart" aria-hidden="true">♥</span><h2>Ya eres de casa,<br />${esc(submitted.name.trim().split(/\s+/)[0])}.</h2><p class="enrollment-intro">Tu tarjeta de ${esc(program.name)} está lista.</p><div class="wallet-choices"><a class="wallet-choice" href="${esc(result.saveUrl)}" rel="noreferrer"><span class="google-mark" aria-hidden="true">G</span><span><strong>Agregar a Google Wallet</strong><small>Guarda tu tarjeta de recompensas</small></span><span aria-hidden="true">→</span></a></div><p class="wallet-pending">Apple Wallet todavía no está disponible. El enlace de Google Wallet vence en 24 horas.</p></div>`;
    document.querySelector('.enrollment-success').focus({preventScroll:true});
  }catch(error){status.textContent=messages[error.message]||'No pudimos confirmar tu tarjeta. Reintenta sin cambiar tus datos.';if(error.message==='INVALID_REQUEST'){submitted=undefined;form.querySelectorAll('input').forEach(input=>input.disabled=false);}form.querySelector('button[type=submit]').textContent='Volver a intentar';}
  finally{form.setAttribute('aria-busy','false');buttons.forEach(b=>b.disabled=false);}
}
root.addEventListener('submit',event=>{
  if(event.target.id!=='live-enrollment-form')return;event.preventDefault();const form=event.target;
  // Preserve the same payload and capability on retries, including Google failures.
  if(!submitted){const data=Object.fromEntries(new FormData(form));submitted={slug,designId:program.id,termsVersion:program.termsVersion,token,name:data.name,email:data.email,phone:data.phone,termsAccepted:data.terms==='on',website:data.website};form.querySelectorAll('input').forEach(input=>input.disabled=true);}
  register(form);
});
async function load(){
  try{program=await request(`/api/enrollment?${new URLSearchParams({slug})}`);render();}
  catch(error){root.innerHTML=`<main class="enrollment-unavailable"><h1>${error.message==='PROGRAM_NOT_FOUND'?'Esta tarjeta todavía no está disponible.':'No pudimos cargar tu tarjeta.'}</h1><p>${error.message==='PROGRAM_NOT_FOUND'?'Pide al negocio su QR de registro actualizado.':'Revisa tu conexión y vuelve a intentar.'}</p><button class="button button-dark" id="retry-enrollment-load">Volver a intentar</button></main>`;document.querySelector('#retry-enrollment-load').onclick=load;}
}
load();
