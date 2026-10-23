import {helpLink} from './links.js';
import {assistantName, normalizePhone, chatVisible} from './contact.js';

const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${{
  chat: '<path d="M4 4h16v12H9l-5 4V4Z"/><path d="M8 9h8m-8 3h5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>', arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  send: '<path d="m12 19 0-14m-6 6 6-6 6 6"/>'
}[name]}</svg>`;
const portrait = '<span class="portrait" aria-hidden="true"><img src="/assets/customer-support-avatar.webp" alt="" width="360" height="360" /></span>';
const pageType = () => ['/admin','/equipo','/dashboard/index.html'].includes(location.pathname) ? 'dashboard' : 'landing';
const textOf = parts => parts.map(p => p.text).join('');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

class SupportChat extends HTMLElement {
  constructor() {
    super(); this.attachShadow({mode:'open'});
    this.history = []; this.transcript = []; this.busy = false; this.opened = false;
    this.profile = {name:'', email:'', phone:''}; this.salesReady = false; this.flow = null;
  }
  connectedCallback() {
    if (this.shadowRoot.childNodes.length) return;
    this.style.visibility = 'hidden'; this.setAttribute('data-private',''); this.classList.add('ph-no-capture');
    this.shadowRoot.innerHTML = `<link rel="stylesheet" href="/chat/widget.css" />
      <button class="launcher" aria-label="Abrir chat con ${assistantName}" aria-expanded="false" aria-controls="vc-chat-panel">${portrait}<span class="launcher-badge">${icon('chat')}</span><span class="hint" aria-hidden="true">Hola, soy ${assistantName}</span></button>
      <section class="panel" id="vc-chat-panel" role="dialog" aria-modal="false" aria-labelledby="vc-chat-title" hidden>
        <div class="header">${portrait}<div class="heading"><h2 id="vc-chat-title">${assistantName}</h2><p>Asistente virtual</p></div><button class="close" aria-label="Cerrar chat">${icon('close')}</button></div>
        <div class="body"><div class="welcome"><h3>Hola, soy ${assistantName}.</h3><p>Tu asistente virtual de VuelveClub.<br />¿En qué te ayudo?</p>
          <div class="topics"><button class="topic" data-question="¿Cómo creo la tarjeta de mi negocio?">Crear mi tarjeta ${icon('arrow')}</button><button class="topic" data-question="¿Cuánto cuesta VuelveClub?">Conocer precios ${icon('arrow')}</button><button class="topic" data-question="¿Cómo inicio sesión?">Entrar al panel ${icon('arrow')}</button><button class="topic" data-question="Quiero una demo de VuelveClub">Pedir una demo ${icon('arrow')}</button></div></div>
          <div class="messages" role="log" aria-label="Conversación con ${assistantName}" aria-live="polite" aria-relevant="additions"></div><div class="typing" role="status" aria-label="${assistantName} está escribiendo" hidden><span></span><span></span><span></span></div><div class="contact-slot" hidden></div>
        </div>
        <div class="composer-wrap"><form class="composer"><label class="sr-only" for="vc-chat-question">Escribe tu pregunta a ${assistantName}</label><textarea id="vc-chat-question" rows="1" maxlength="1200" placeholder="Escribe tu pregunta…" required></textarea><button class="send" type="submit" aria-label="Enviar pregunta">${icon('send')}</button></form><div class="composer-footer"><span class="powered">vuelveclub<i>.</i></span></div></div>
      </section>`;
    const reveal = () => { this.style.visibility = 'visible'; };
    this.$('link').addEventListener('load', reveal, {once:true});
    this.$('link').addEventListener('error', () => {
      this.shadowRoot.innerHTML = '<a href="/soporte" style="position:fixed;bottom:20px;right:20px;z-index:2147483000;background:#3e2b49;color:#f9f7ef;border-radius:40px;padding:14px 20px;font:600 14px sans-serif;text-decoration:none">Ayuda ↗</a>'; reveal();
    }, {once:true});
    this.$('.launcher').onclick = () => this.opened ? this.close() : this.open();
    this.$('.close').onclick = () => this.close();
    this.shadowRoot.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.opened) { event.preventDefault(); event.stopPropagation(); this.close(); }
      else if (event.target.closest('input,textarea')) event.stopPropagation();
    });
    this.shadowRoot.addEventListener('click', event => {
      const topic = event.target.closest('[data-question]'); if (topic && !this.busy) this.ask(topic.dataset.question);
      const link = event.target.closest('a[data-section]'); if (link) this.followLink(event, link);
      const action = event.target.closest('[data-flow-action]'); if (action && !this.busy) this.flowAction(action);
    });
    this.$('.composer').onsubmit = event => {
      event.preventDefault(); const input = this.$('#vc-chat-question');
      if (input.value.trim() && !this.busy) { const text = input.value.trim(); input.value = ''; input.style.height = ''; this.ask(text); }
    };
    this.$('#vc-chat-question').oninput = event => { event.target.style.height = 'auto'; event.target.style.height = Math.min(event.target.scrollHeight,85)+'px'; };
    this.$('#vc-chat-question').addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); this.$('.composer').requestSubmit(); }
    });
    this.viewport = () => this.style.setProperty('--chat-height', Math.max(280,(window.visualViewport?.height || innerHeight)-115)+'px');
    window.visualViewport?.addEventListener('resize', this.viewport); this.viewport();
  }
  disconnectedCallback() { window.visualViewport?.removeEventListener('resize', this.viewport); }
  $(selector) { return this.shadowRoot.querySelector(selector); }
  open() {
    this.opened = true; this.$('.panel').hidden = false;
    this.$('.launcher').setAttribute('aria-expanded','true'); this.$('.launcher').setAttribute('aria-label','Cerrar chat');
    requestAnimationFrame(() => (this.$('.contact-slot:not([hidden]) input:not([disabled])') || this.$('#vc-chat-question'))?.focus({preventScroll:true}));
  }
  close() {
    this.opened = false; this.$('.panel').hidden = true;
    this.$('.launcher').setAttribute('aria-expanded','false'); this.$('.launcher').setAttribute('aria-label',`Abrir chat con ${assistantName}`);
    this.$('.launcher').focus({preventScroll:true});
  }
  linkContext() {
    let organizationId = new URLSearchParams(location.search).get('negocio') || '';
    if (!organizationId) {
      const link = document.querySelector('.business-tabs a[href*="negocio="],a[data-business-nav][href*="negocio="]');
      if (link) organizationId = new URL(link.href).searchParams.get('negocio') || '';
    }
    return {origin:location.origin, pathname:location.pathname, organizationId};
  }
  addMessage(role, parts) {
    const row = document.createElement('div'); row.className = 'message '+role;
    if (role === 'assistant') { const label = document.createElement('span'); label.className = 'who'; label.textContent = assistantName; row.append(label); }
    const bubble = document.createElement('div'); bubble.className = 'bubble';
    for (const part of parts) {
      const href = part.section !== 'none' && helpLink(part.section, this.linkContext());
      if (href) {
        const link = document.createElement('a'); link.href = href; link.className = 'section-link'; link.dataset.section = part.section; link.textContent = part.text;
        if (part.section === 'whatsapp') { link.target = '_blank'; link.rel = 'noopener noreferrer'; } bubble.append(link);
      } else bubble.append(document.createTextNode(part.text));
    }
    row.append(bubble); this.$('.messages').append(row); this.transcript.push({role, text:textOf(parts)});
    if (this.transcript.length > 40) { this.transcript.shift(); this.$('.messages').firstElementChild?.remove(); }
    this.scrollBottom();
  }
  say(text) { this.addMessage('assistant',[{text, section:'none'}]); }
  scrollBottom(force=false) {
    if (force || !this.$('.contact-slot').contains(this.shadowRoot.activeElement)) requestAnimationFrame(() => { const body = this.$('.body'); body.scrollTop = body.scrollHeight; });
  }
  setBusy(value) {
    this.busy = value; this.$('.send').disabled = value;
    this.$('.typing').hidden = !value;
    this.$('.composer').setAttribute('aria-busy',String(value));
  }
  async ask(text) {
    if (this.busy || text.length > 1200) return;
    this.open(); this.$('.welcome').hidden = true; this.clearFlow(); this.addMessage('user',[{text,section:'none'}]);
    // An intake question is UI state, not an AI turn. A new question supersedes it.
    if (this.history.at(-1)?.role === 'user') this.history.pop();
    this.history.push({role:'user',text});
    while (this.history.length > 11 || this.history.reduce((sum,m) => sum+m.text.length,0)>6800) this.history.splice(0,2);
    await this.answer();
  }
  async answer() {
    this.setBusy(true); this.scrollBottom(); let reply;
    try {
      const response = await fetch('/api/chat', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:this.history,page:pageType(),salesReady:this.salesReady}),signal:AbortSignal.timeout(23000)});
      reply = await response.json();
      if (!Array.isArray(reply.parts) || !reply.parts.length || reply.parts.some(p => typeof p.text !== 'string' || typeof p.section !== 'string')) throw Error();
    } catch { reply = {parts:[{text:'No pude cargar la respuesta. Déjame tu nombre y correo para que revisemos tu consulta.',section:'none'}],handoff:true}; }
    finally { this.setBusy(false); }
    this.addMessage('assistant',reply.parts);
    if (reply.collect === 'sales') { this.startDetails('sales'); return; }
    this.history.push({role:'assistant',text:textOf(reply.parts).slice(0,1800)});
    if (reply.handoff) this.startDetails('support');
  }
  clearFlow() { this.flow = null; this.$('.contact-slot').replaceChildren(); this.$('.contact-slot').hidden = true; }
  startDetails(purpose) {
    this.flow = {purpose, requestId:crypto.randomUUID(), payload:null};
    if (window.Clerk?.isSignedIn && !this.profile.name) {
      const user = window.Clerk.user; this.profile.name = [user?.firstName,user?.lastName].filter(Boolean).join(' ');
      this.profile.email = user?.primaryEmailAddress?.emailAddress || '';
    }
    const slot = this.$('.contact-slot'); slot.hidden = false;
    slot.innerHTML = `<form class="contact intake-details"><label for="vc-contact-name">Tu nombre</label><input id="vc-contact-name" name="nombre" autocomplete="name" maxlength="120" required value="${esc(this.profile.name)}" /><label for="vc-contact-email">Tu correo</label><input id="vc-contact-email" name="email" type="email" autocomplete="email" maxlength="254" required value="${esc(this.profile.email)}" /><div class="honeypot" aria-hidden="true"><input name="company" tabindex="-1" autocomplete="off" aria-label="Deja este campo vacío" /></div><p class="notice">${purpose === 'sales' ? 'Usaremos tus datos solo si eliges que te contactemos.' : 'Al enviar, compartes tu consulta y esta conversación con soporte.'}</p><button class="contact-submit" type="submit">${purpose === 'sales' ? 'Continuar' : 'Enviar consulta'} ${icon('arrow')}</button><p class="status" role="status" aria-live="polite"></p><button class="contact-back" data-flow-action="skip" type="button">${purpose === 'sales' ? 'Prefiero solo preguntar' : 'Volver al chat'}</button></form>`;
    const form = slot.querySelector('form');
    form.oninput = () => { if (this.flow) { this.flow.requestId = crypto.randomUUID(); this.flow.payload = null; } };
    form.onsubmit = event => {
      event.preventDefault(); if (this.busy || !this.flow) return;
      const fields = Object.fromEntries(new FormData(form));
      const name = fields.nombre.trim(), email = fields.email.trim();
      if (!name || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email) || /[\r\n]/.test(name)) { form.querySelector('.status').textContent = 'Revisa tu nombre y correo.'; return; }
      this.profile.name = name; this.profile.email = email; this.flow.company = fields.company;
      if (this.flow.purpose === 'sales') this.showChannels(); else this.submitFlow('email');
    };
    this.scrollBottom(true);
  }
  showChannels() {
    const slot = this.$('.contact-slot'); slot.replaceChildren();
    this.say(`Gracias, ${this.profile.name.split(/\s+/)[0]}. ¿Te gustaría que te mandemos información por correo o por WhatsApp?`);
    slot.innerHTML = `<div class="contact channel-choice"><div class="channel-options" role="group" aria-label="Cómo prefieres recibir información"><button class="channel-button" data-flow-action="email">Correo electrónico ${icon('arrow')}</button><button class="channel-button" data-flow-action="whatsapp">WhatsApp ${icon('arrow')}</button></div><p class="notice">Al elegir un canal, nos autorizas a responder a esta consulta por ese medio.</p><p class="status" role="status" aria-live="polite"></p><button class="contact-back" data-flow-action="edit" type="button">Cambiar mis datos</button><button class="contact-back" data-flow-action="skip" type="button">Ahora no</button></div>`;
    this.scrollBottom(true);
  }
  showPhone() {
    this.say('Perfecto. ¿A qué número de WhatsApp te escribimos?');
    const slot = this.$('.contact-slot');
    slot.innerHTML = `<form class="contact phone-details"><label for="vc-contact-phone">Tu WhatsApp</label><input id="vc-contact-phone" name="whatsapp" type="tel" autocomplete="tel" inputmode="tel" maxlength="30" required value="${esc(this.profile.phone)}" placeholder="999 123 4567" aria-describedby="vc-phone-hint" /><p class="notice" id="vc-phone-hint">México: 10 dígitos. Otro país: incluye + y tu código.</p><button class="contact-submit" type="submit">Recibir información ${icon('arrow')}</button><p class="status" role="status" aria-live="polite"></p><button class="contact-back" data-flow-action="channels" type="button">Elegir otro medio</button></form>`;
    slot.querySelector('form').onsubmit = event => {
      event.preventDefault(); if (this.busy || !this.flow) return;
      const phone = normalizePhone(this.$('#vc-contact-phone').value);
      if (!phone) { slot.querySelector('.status').textContent = 'Revisa el número y el código de país.'; return; }
      this.profile.phone = phone; this.submitFlow('whatsapp');
    };
    slot.querySelector('input').oninput = () => { if (this.flow) { this.flow.requestId = crypto.randomUUID(); this.flow.payload = null; } };
    this.scrollBottom(true);
  }
  async flowAction(button) {
    if (!this.flow || this.busy) return;
    switch (button.dataset.flowAction) {
      case 'skip': {
        const sales = this.flow.purpose === 'sales'; this.clearFlow();
        if (sales) { this.salesReady = true; await this.answer(); }
        else this.$('#vc-chat-question').focus();
        break;
      }
      case 'email':
        if (this.flow.payload && this.flow.payload.preferredChannel !== 'email') { this.flow.payload=null; this.flow.requestId=crypto.randomUUID(); }
        await this.submitFlow('email'); break;
      case 'whatsapp':
        if (this.flow.payload && this.flow.payload.preferredChannel !== 'whatsapp') { this.flow.payload=null; this.flow.requestId=crypto.randomUUID(); }
        this.showPhone(); break;
      case 'channels': this.flow.payload = null; this.flow.requestId = crypto.randomUUID(); this.showChannels(); break;
      case 'edit': this.startDetails(this.flow.purpose); break;
    }
  }
  async submitFlow(channel) {
    if (!this.flow || this.busy) return;
    const flow = this.flow, slot = this.$('.contact-slot');
    const transcript = this.transcript.slice(-6).map(m => `${m.role === 'user' ? 'Visitante' : assistantName}: ${m.text.slice(0,440)}`).join('\n\n');
    const question = [...this.transcript].reverse().find(m => m.role === 'user')?.text || 'Consulta desde el chat';
    // A failed send retries this exact payload and idempotency key.
    flow.payload ||= {nombre:this.profile.name,email:this.profile.email,company:flow.company || '',source:'chat',page:pageType(),requestId:flow.requestId,
      mensaje:`Consulta:\n${question}\n\nConversación:\n${transcript}`.slice(0,5000),
      ...(flow.purpose === 'sales' ? {preferredChannel:channel,contactConsent:true,...(channel === 'whatsapp' ? {whatsapp:this.profile.phone} : {})} : {asunto:'Consulta con '+assistantName})};
    this.setBusy(true); this.$('.typing').hidden = true; slot.querySelectorAll('input,button').forEach(el => el.disabled = true);
    const status = slot.querySelector('.status'); status.textContent = 'Enviando…';
    let sent = false;
    try {
      const response = await fetch(flow.purpose === 'sales' ? '/api/lead' : '/api/support', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(flow.payload),signal:AbortSignal.timeout(22000)});
      const result = await response.json(); if (!response.ok || result.ok !== true) throw Error(response.status === 429 ? 'LIMIT' : 'SEND_FAILED');
      sent = true;
    } catch (error) { status.textContent = error.message === 'LIMIT' ? 'Espera un poco antes de volver a intentar.' : 'No pude enviarlo. Tus datos siguen aquí para reintentar.'; }
    finally { this.setBusy(false); slot.querySelectorAll('input,button').forEach(el => el.disabled = false); }
    if (!sent || this.flow !== flow) return;
    this.clearFlow();
    if (flow.purpose === 'sales') {
      this.salesReady = true;
      this.say(`Listo, ${this.profile.name.split(/\s+/)[0]}. Te contactaremos por ${channel === 'whatsapp' ? 'WhatsApp' : 'correo'}.`);
      await this.answer();
    } else this.say('Tu consulta ya está enviada. Te responderemos por correo.');
  }
  followLink(event, link) {
    const url = new URL(link.href,location.href);
    if (url.origin === location.origin && url.pathname === location.pathname && url.hash) {
      const target = document.getElementById(url.hash.slice(1));
      if (target) {
        event.preventDefault(); this.close(); history.replaceState(history.state,'',url);
        target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'}); target.classList.add('vc-help-target');
        const focus = target.querySelector('h2,h1,input') || target; focus.setAttribute('tabindex','-1'); focus.focus({preventScroll:true});
        setTimeout(() => target.classList.remove('vc-help-target'),3500); return;
      }
    }
    if (url.origin === location.origin && ['/admin','/equipo'].includes(url.pathname)) {
      const navigation = new CustomEvent('vuelve:navigate',{detail:{href:url.href},cancelable:true});
      if (!document.dispatchEvent(navigation)) { event.preventDefault(); this.close(); }
    }
  }
}

if (chatVisible(location)) {
  if (!customElements.get('vuelve-support-chat')) customElements.define('vuelve-support-chat',SupportChat);
  if (!document.querySelector('link[data-vc-help-targets]')) { const style = document.createElement('link'); style.rel='stylesheet'; style.href='/chat/targets.css'; style.dataset.vcHelpTargets=''; document.head.append(style); }
  if (!document.querySelector('vuelve-support-chat')) document.body.append(document.createElement('vuelve-support-chat'));
}
