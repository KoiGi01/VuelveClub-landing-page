import {helpLink} from './links.js';
const icon=(name)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${{chat:'<path d="M4 4h16v12H9l-5 4V4Z"/><path d="M8 9h8m-8 3h5"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',send:'<path d="m12 19 0-14m-6 6 6-6 6 6"/>'}[name]}</svg>`;
const portrait='<span class="portrait" aria-hidden="true"><img src="/assets/customer-support-avatar.webp" alt="" width="360" height="360" /></span>';
const pageType=()=>location.pathname.startsWith('/tarjeta/')?'enrollment':location.pathname.startsWith('/propuestas')?'example':['/admin','/equipo'].includes(location.pathname)?'dashboard':location.pathname==='/iniciar-sesion'?'login':location.pathname.startsWith('/soporte')?'support':'landing';
const textOf=parts=>parts.map(p=>p.text).join('');
class SupportChat extends HTMLElement{
  constructor(){super();this.attachShadow({mode:'open'});this.history=[];this.transcript=[];this.busy=false;this.opened=false;this.ready=false;this.contactId=null;}
  connectedCallback(){
    if(this.shadowRoot.childNodes.length)return;
    this.style.visibility='hidden';
    this.setAttribute('data-private','');this.classList.add('ph-no-capture');
    this.shadowRoot.innerHTML=`<link rel="stylesheet" href="/chat/widget.css" /><button class="launcher" aria-label="Abrir chat de ayuda" aria-expanded="false" aria-controls="vc-chat-panel">${portrait}<span class="launcher-badge">${icon('chat')}</span><span class="hint" aria-hidden="true">¿Te ayudamos?</span></button><section class="panel" id="vc-chat-panel" role="dialog" aria-modal="false" aria-labelledby="vc-chat-title" hidden><div class="header">${portrait}<div class="heading"><h2 id="vc-chat-title">VuelveClub te ayuda.</h2><p>Asistente virtual · IA</p></div><button class="close" aria-label="Cerrar chat">${icon('close')}</button></div><div class="body"><div class="welcome"><h3>Hola, ¿en qué<br />te ayudamos?</h3><p>Tu tarjeta, tu negocio o esa duda que no te deja seguir.</p><div class="topics"><button class="topic" data-question="¿Cómo creo la tarjeta de mi negocio y comparto el QR?">Crear mi tarjeta ${icon('arrow')}</button><button class="topic" data-question="¿Cuánto cuesta VuelveClub y cómo pido una demo?">Precios y demo ${icon('arrow')}</button><button class="topic" data-question="¿Cómo inicio sesión en mi negocio?">Entrar al panel ${icon('arrow')}</button><button class="topic" data-contact>Hablar con soporte ${icon('arrow')}</button></div><p class="intro-note">Puedes hacerme una pregunta. Si necesitas al equipo, te respondemos por correo.</p></div><div class="messages" role="log" aria-label="Conversación de ayuda" aria-live="polite" aria-relevant="additions"></div><div class="typing" role="status" aria-label="Preparando respuesta" hidden><span></span><span></span><span></span></div><div class="contact-slot"></div></div><div class="composer-wrap"><form class="composer"><label class="sr-only" for="vc-chat-question">Escribe tu pregunta</label><textarea id="vc-chat-question" rows="1" maxlength="1200" placeholder="Escribe tu pregunta…" required></textarea><button class="send" type="submit" aria-label="Enviar pregunta">${icon('send')}</button></form><div class="composer-footer"><button class="contact-trigger" data-contact>Contactar al equipo</button><span class="powered">vuelveclub<i>.</i></span></div></div></section>`;
    const stylesheet=this.$('link');const reveal=()=>{this.style.visibility='visible';};stylesheet.addEventListener('load',reveal,{once:true});
    stylesheet.addEventListener('error',()=>{this.shadowRoot.innerHTML='<a href="/soporte" style="position:fixed;bottom:20px;right:20px;z-index:2147483000;background:#3e2b49;color:#f9f7ef;border-radius:40px;padding:14px 20px;font:600 14px sans-serif;text-decoration:none">Ayuda ↗</a>';reveal();},{once:true});
    this.$('.launcher').addEventListener('click',()=>this.toggle());this.$('.close').addEventListener('click',()=>this.close());
    this.shadowRoot.addEventListener('keydown',e=>{if(e.key==='Escape'&&this.opened){e.preventDefault();e.stopPropagation();this.close();}else if(e.target.closest('input,textarea'))e.stopPropagation();});
    this.shadowRoot.addEventListener('click',e=>{
      const topic=e.target.closest('[data-question]');if(topic&&!this.busy)this.ask(topic.dataset.question);
      if(e.target.closest('[data-contact]'))this.showContact();
      const link=e.target.closest('a[data-section]');if(link)this.followLink(e,link);
    });
    this.$('.composer').addEventListener('submit',e=>{e.preventDefault();const input=this.$('#vc-chat-question');if(input.value.trim()&&!this.busy){const value=input.value.trim();input.value='';input.style.height='';this.ask(value);}});
    this.$('#vc-chat-question').addEventListener('input',e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,85)+'px';});
    this.$('#vc-chat-question').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();this.$('.composer').requestSubmit();}});
    this.viewport=()=>this.style.setProperty('--chat-height',Math.max(280,(window.visualViewport?.height||innerHeight)-115)+'px');
    window.visualViewport?.addEventListener('resize',this.viewport);this.viewport();
  }
  disconnectedCallback(){window.visualViewport?.removeEventListener('resize',this.viewport);}
  $(selector){return this.shadowRoot.querySelector(selector);}
  toggle(){this.opened?this.close():this.open();}
  open(){this.opened=true;this.$('.panel').hidden=false;this.$('.launcher').setAttribute('aria-expanded','true');this.$('.launcher').setAttribute('aria-label','Cerrar chat de ayuda');requestAnimationFrame(()=>this.$(!this.$('.contact-slot').hidden&&this.$('.contact-slot').childNodes.length?'#vc-contact-name':'#vc-chat-question')?.focus({preventScroll:true}));}
  close(){this.opened=false;this.$('.panel').hidden=true;this.$('.launcher').setAttribute('aria-expanded','false');this.$('.launcher').setAttribute('aria-label','Abrir chat de ayuda');this.$('.launcher').focus({preventScroll:true});}
  linkContext(){
    let organizationId=new URLSearchParams(location.search).get('negocio')||'';
    if(!organizationId){const link=document.querySelector('.business-tabs a[href*="negocio="],a[data-business-nav][href*="negocio="]');if(link)organizationId=new URL(link.href).searchParams.get('negocio')||'';}
    return{origin:location.origin,pathname:location.pathname,organizationId};
  }
  addMessage(role,parts,handoff=false){
    const row=document.createElement('div');row.className='message '+role;
    if(role==='assistant'){const label=document.createElement('span');label.className='who';label.textContent='VuelveClub';row.append(label);}
    const bubble=document.createElement('div');bubble.className='bubble';
    for(const part of parts){
      const href=part.section!=='none'&&helpLink(part.section,this.linkContext());
      if(href){const link=document.createElement('a');link.href=href;link.className='section-link';link.dataset.section=part.section;link.textContent=part.text;if(part.section==='whatsapp'){link.target='_blank';link.rel='noopener noreferrer';}bubble.append(link);}
      else bubble.append(document.createTextNode(part.text));
    }
    if(handoff){const button=document.createElement('button');button.className='handoff-link';button.dataset.contact='';button.textContent='Pasar mi consulta al equipo →';bubble.append(button);}
    row.append(bubble);this.$('.messages').append(row);this.transcript.push({role,text:textOf(parts)});if(this.transcript.length>40){this.transcript.shift();this.$('.messages').firstElementChild?.remove();}this.scrollBottom();
  }
  scrollBottom(){if(!this.$('.contact-slot').contains(this.shadowRoot.activeElement))requestAnimationFrame(()=>{const body=this.$('.body');body.scrollTop=body.scrollHeight;});}
  async ask(text){
    if(this.busy||text.length>1200)return;
    this.contactId=null;
    this.open();this.$('.welcome').hidden=true;this.hideContact();this.addMessage('user',[{text,section:'none'}]);
    this.history.push({role:'user',text});
    while(this.history.length>11||this.history.reduce((sum,m)=>sum+m.text.length,0)>6800)this.history.splice(0,2);
    this.busy=true;this.$('.send').disabled=true;this.$('.typing').hidden=false;this.scrollBottom();
    let reply;
    try{
      const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:this.history,page:pageType()}),signal:AbortSignal.timeout(23000)});
      const data=await response.json();
      if(!Array.isArray(data.parts)||!data.parts.length||data.parts.some(p=>typeof p.text!=='string'||typeof p.section!=='string'))throw Error();
      reply=data;
    }catch{reply={parts:[{text:'No pude cargar la respuesta. Puedo pasarle tu consulta al equipo para que te responda por correo.',section:'none'}],handoff:true};}
    finally{this.busy=false;this.$('.send').disabled=false;this.$('.typing').hidden=true;}
    this.history.push({role:'assistant',text:textOf(reply.parts).slice(0,1800)});this.addMessage('assistant',reply.parts,reply.handoff);
    if(reply.handoff&&!this.$('.contact-slot').childNodes.length)this.showContact(false);
  }
  showContact(focus=true){
    if(!this.opened)this.open();
    const slot=this.$('.contact-slot');
    if(slot.childNodes.length){slot.hidden=false;if(focus)this.$('#vc-contact-name').focus();return;}
    this.contactId=crypto.randomUUID();
    slot.hidden=false;slot.innerHTML=`<form class="contact"><h3>Lo vemos contigo.</h3><p>Enviaremos tu consulta y esta conversación a support@vuelveclub.com.</p><label for="vc-contact-name">Tu nombre</label><input id="vc-contact-name" name="nombre" autocomplete="name" maxlength="120" required /><label for="vc-contact-email">Correo para responderte</label><input id="vc-contact-email" name="email" type="email" autocomplete="email" maxlength="254" required /><label for="vc-contact-message">¿Qué necesitas resolver?</label><textarea id="vc-contact-message" name="mensaje" rows="3" maxlength="1800" required></textarea><div class="honeypot" aria-hidden="true"><input name="company" tabindex="-1" autocomplete="off" aria-label="Deja este campo vacío" /></div><p class="notice">Al enviar, compartes estos datos y la conversación con el equipo de soporte. No incluyas contraseñas ni datos de pago.</p><button class="contact-submit" type="submit">Enviar al equipo ${icon('arrow')}</button><p class="status" role="status" aria-live="polite"></p><button class="contact-back" type="button">Volver al chat</button></form>`;
    const last=[...this.transcript].reverse().find(m=>m.role==='user');this.$('#vc-contact-message').value=last?.text||'';
    if(window.Clerk?.isSignedIn){const user=window.Clerk.user;this.$('#vc-contact-name').value=[user?.firstName,user?.lastName].filter(Boolean).join(' ');this.$('#vc-contact-email').value=user?.primaryEmailAddress?.emailAddress||'';}
    slot.querySelector('.contact-back').onclick=()=>{this.hideContact();this.$('#vc-chat-question').focus();};
    slot.querySelector('form').addEventListener('input',()=>{this.contactId=null;});
    slot.querySelector('form').addEventListener('submit',e=>{e.preventDefault();this.sendContact(e.target);});
    this.scrollBottom();if(focus)requestAnimationFrame(()=>{this.$('#vc-contact-name').focus({preventScroll:true});this.$('.contact').scrollIntoView({block:'nearest',behavior:'instant'});});
  }
  hideContact(){this.$('.contact-slot').hidden=true;}
  async sendContact(form){
    if(form.getAttribute('aria-busy')==='true')return;
    const data=Object.fromEntries(new FormData(form));this.contactId||=crypto.randomUUID();
    const transcript=this.transcript.slice(-6).map(m=>`${m.role==='user'?'Visitante':'Asistente'}: ${m.text.slice(0,480)}`).join('\n\n');
    const payload={...data,source:'chat',page:pageType(),asunto:'Consulta desde el chat de ayuda',requestId:this.contactId,
      mensaje:`Consulta:\n${data.mensaje}\n\nConversación de ayuda:\n${transcript||'(Sin conversación previa)'}`.slice(0,5000)};
    form.setAttribute('aria-busy','true');form.querySelectorAll('input,textarea,button').forEach(e=>e.disabled=true);const status=form.querySelector('.status');status.textContent='Enviando tu consulta…';
    try{
      const response=await fetch('/api/support',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(22000)});
      const result=await response.json();if(!response.ok||result.ok!==true)throw Error(response.status===429?'LIMIT':'SEND_FAILED');
      this.$('.contact-slot').replaceChildren();this.contactId=null;
      this.addMessage('assistant',[{text:'Listo, tu consulta ya está enviada al equipo. Te responderemos al correo que indicaste.',section:'none'}]);
    }catch(error){status.textContent=error.message==='LIMIT'?'Hay varios envíos recientes. Espera un poco o escríbenos a support@vuelveclub.com.':'No pudimos confirmar el envío. Tus datos siguen aquí para volver a intentar. También puedes escribir a support@vuelveclub.com.';}
    finally{form.removeAttribute('aria-busy');form.querySelectorAll('input,textarea,button').forEach(e=>e.disabled=false);}
  }
  followLink(event,link){
    const url=new URL(link.href,location.href);
    if(url.origin===location.origin&&url.pathname===location.pathname&&url.hash){
      const target=document.getElementById(url.hash.slice(1));
      if(target){event.preventDefault();this.close();history.replaceState(history.state,'',url);target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});target.classList.add('vc-help-target');const focus=target.querySelector('h2,h1,input')||target;focus.setAttribute('tabindex','-1');focus.focus({preventScroll:true});setTimeout(()=>target.classList.remove('vc-help-target'),3500);return;}
    }
    if(url.origin===location.origin&&['/admin','/equipo'].includes(url.pathname)){
      const nav=new CustomEvent('vuelve:navigate',{detail:{href:url.href},cancelable:true});
      if(!document.dispatchEvent(nav)){event.preventDefault();this.close();}
    }
  }
}
if(!customElements.get('vuelve-support-chat'))customElements.define('vuelve-support-chat',SupportChat);
if(!document.querySelector('link[data-vc-help-targets]')){const style=document.createElement('link');style.rel='stylesheet';style.href='/chat/targets.css';style.dataset.vcHelpTargets='';document.head.append(style);}
if(!document.querySelector('vuelve-support-chat'))document.body.append(document.createElement('vuelve-support-chat'));
