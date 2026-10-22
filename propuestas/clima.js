(() => {
  'use strict';
  const labels = { clear: 'Soleado', 'partly-cloudy': 'Parcialmente nublado', cloudy: 'Nublado', rain: 'Lluvia', storm: 'Tormenta', snow: 'Nieve', fog: 'Neblina' };
  const listeners = new Set();
  const model = { weather: null, loading: false, locating: false, paused: false, message: '', position: null, requestedAt: 0 };
  let requestId = 0;
  let refreshTimer;
  let starting = false;
  const refreshAfter = 15 * 60_000;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${{
    pin: '<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>'
  }[name]}</svg>`;
  const clock = date => new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  const notify = () => listeners.forEach(element => element.update());
  function schedule() {
    clearTimeout(refreshTimer);
    if (listeners.size) refreshTimer = setTimeout(() => {
      if (!document.hidden) loadWeather(); else schedule();
    }, refreshAfter + Math.floor(Math.random() * 30_000));
  }
  async function loadWeather() {
    const id = ++requestId;
    model.loading = true;
    model.requestedAt = Date.now();
    notify();
    try {
      const params = model.position ? `?lat=${model.position.lat}&lon=${model.position.lon}` : '';
      const response = await fetch(`/api/weather${params}`, { signal: AbortSignal.timeout(10_000), cache: 'no-store' });
      const data = await response.json();
      if (id !== requestId) return;
      if (response.ok && data.ok && Object.hasOwn(labels, data.condition) && Number.isFinite(data.temperature) && typeof data.isDay === 'boolean' && typeof data.location?.label === 'string') {
        model.weather = data;
        model.message = '';
      } else {
        model.weather = null;
        model.message = data.error === 'location_required' ? '' : 'El clima no está disponible por ahora.';
      }
    } catch {
      if (id !== requestId) return;
      model.weather = null;
      model.message = 'El clima no está disponible por ahora.';
    } finally {
      if (id === requestId) { model.loading = false; notify(); schedule(); }
    }
  }
  function locate(quiet = false) {
    if (model.locating) return;
    if (!navigator.geolocation) { if (!quiet) { model.message = 'Tu navegador no ofrece ubicación. Seguimos usando tu zona aproximada.'; notify(); } return; }
    model.locating = true;
    model.message = '';
    notify();
    navigator.geolocation.getCurrentPosition(position => {
      model.locating = false;
      model.position = { lat: Number(position.coords.latitude.toFixed(2)), lon: Number(position.coords.longitude.toFixed(2)) };
      loadWeather();
    }, error => {
      model.locating = false;
      if (!quiet) model.message = error.code === 1
        ? 'Ubicación no autorizada. Puedes permitirla desde tu navegador.'
        : 'No pudimos obtener tu ubicación. Intenta otra vez.';
      notify();
      if (quiet || !model.requestedAt) { model.position = null; loadWeather(); }
    }, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 });
  }
  async function start() {
    if (starting || model.loading || model.locating) return;
    if (model.requestedAt && Date.now() - model.requestedAt < refreshAfter) { schedule(); return; }
    starting = true;
    try {
      const permission = await navigator.permissions?.query({ name: 'geolocation' }).catch(() => null);
      if (permission?.state === 'granted') locate(true); else loadWeather();
    } catch { loadWeather(); } finally { starting = false; }
  }
  function art() {
    const rays = Array.from({ length: 12 }, (_, index) => {
      const angle = index * Math.PI / 6;
      return `<line x1="${(Math.cos(angle) * 68).toFixed(2)}" y1="${(Math.sin(angle) * 68).toFixed(2)}" x2="${(Math.cos(angle) * 81).toFixed(2)}" y2="${(Math.sin(angle) * 81).toFixed(2)}" />`;
    }).join('');
    const cloud = '<path d="M-63 20a23 23 0 0 1-3-46 32 32 0 0 1 61-12A25 25 0 0 1 38-9a16 16 0 0 1-1 32h-100Z"/>';
    return `<div class="weather-art" aria-hidden="true"><svg viewBox="0 0 360 280" fill="none"><g class="sky-orbits"><ellipse cx="214" cy="132" rx="129" ry="91" transform="rotate(-20 214 132)"/><circle cx="218" cy="120" r="105" stroke-dasharray="3 7"/></g><g class="sky-stars">${[[97,62,4],[290,45,5],[311,172,3],[116,205,3],[165,29,2],[275,216,4]].map(([x,y,r],i)=>`<g class="sky-star" style="--delay:${i * -.7}s"><path d="M${x-r} ${y}h${r*2}m${-r} ${-r}v${r*2}"/></g>`).join('')}</g><g class="sky-sun" transform="translate(218 119)"><circle class="sun-halo" r="61"/><g class="sun-rays">${rays}</g><circle class="sun-disc" r="51"/><path class="sun-heart" d="M0 19-20-1C-38-20-9-39 0-19c9-20 38-1 20 18Z"/></g><g class="sky-moon"><defs><mask id="vc-weather-moon"><rect width="360" height="280" fill="white"/><circle cx="242" cy="84" r="51" fill="black"/></mask></defs><circle cx="218" cy="119" r="53" mask="url(#vc-weather-moon)"/><circle class="moon-crater" cx="193" cy="132" r="5"/><circle class="moon-crater" cx="216" cy="151" r="3"/></g><g class="cloud-back" transform="translate(277 91) scale(.72)"><g class="cloud-drift">${cloud}</g></g><g class="cloud-front" transform="translate(183 175)"><g class="cloud-drift">${cloud}</g></g><g class="sky-rain">${[127,152,178,205,231,143,191,218].map((x,i)=>`<line x1="${x}" y1="${220+i%3*11}" x2="${x-5}" y2="${231+i%3*11}" style="--delay:${i*-.23}s"/>`).join('')}</g><g class="sky-snow">${[129,157,188,215,239,143,172,206,228].map((x,i)=>`<circle cx="${x}" cy="${216+i%3*15}" r="${i%2?2.5:3.5}" style="--delay:${i*-.41}s"/>`).join('')}</g><g class="sky-fog"><path d="M109 162h135m-111 20h133m-164 20h129"/></g><path class="sky-lightning" d="m191 200-18 27h17l-10 24 29-34h-18l12-17Z"/></svg></div>`;
  }
  class WelcomeWeather extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `<section class="dashboard-welcome weather-welcome" data-condition="unknown" data-phase="day"><div class="weather-atmosphere" aria-hidden="true"></div>${art()}<div class="welcome-topline"><p class="eyebrow" data-local-date></p><span class="welcome-clock">${icon('clock')}<time data-local-time aria-label="Hora local"></time></span></div><div class="page-heading"><div><h1><span data-welcome-greeting>Un buen día para</span><br /><em>que vuelvan.</em></h1><p class="page-description">Tu café, su lugar de siempre. Así va la semana.</p></div><a class="button button-dark" href="#mostrador">${icon('plus')}Registrar visita</a></div><div class="welcome-weather-footer"><div class="weather-reading"><span class="weather-temperature" data-temperature hidden></span><div><p class="weather-condition" data-condition-label>Tu hora. Tu ritmo.</p><span class="weather-place" data-place>Clima de tu zona</span></div></div><div class="weather-tools"><button type="button" class="weather-location-button" data-weather-action="locate" aria-label="Usar mi ubicación para el clima">${icon('pin')}<span data-location-action>Usar mi ubicación</span></button><button type="button" class="weather-info-button" data-weather-action="info" aria-label="Información del clima" title="Información del clima">${icon('info')}</button><button type="button" class="weather-motion-button" data-weather-action="motion" aria-label="Pausar animación del clima" title="Pausar animación" aria-pressed="false"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg></button></div></div><p class="weather-status" data-weather-status role="status" aria-live="polite"></p><dialog class="weather-dialog" aria-labelledby="weather-dialog-title"></dialog></section>`;
      this.onClick = event => {
        const action = event.target.closest('[data-weather-action]')?.dataset.weatherAction;
        if (action === 'locate') locate();
        if (action === 'info') this.showInfo();
        if (action === 'close') this.querySelector('dialog').close();
        if (action === 'motion') {
          model.paused = !model.paused;
          this.updateMotion();
        }
      };
      this.addEventListener('click', this.onClick);
      this.onVisible = () => {
        this.querySelector('section').classList.toggle('weather-hidden', document.hidden);
        if (!document.hidden) { this.tick(); start(); }
      };
      document.addEventListener('visibilitychange', this.onVisible);
      listeners.add(this);
      this.updateMotion();
      this.update();
      this.clockTimer = setInterval(() => { if (!document.hidden) this.tick(); }, 1000);
      start();
    }
    disconnectedCallback() {
      clearInterval(this.clockTimer);
      this.removeEventListener('click', this.onClick);
      document.removeEventListener('visibilitychange', this.onVisible);
      listeners.delete(this);
      if (!listeners.size) clearTimeout(refreshTimer);
    }
    updateMotion() {
      const button = this.querySelector('[data-weather-action="motion"]');
      this.querySelector('section').classList.toggle('weather-paused', model.paused);
      button.setAttribute('aria-pressed', String(model.paused));
      button.setAttribute('aria-label', model.paused ? 'Reanudar animación del clima' : 'Pausar animación del clima');
      button.title = model.paused ? 'Reanudar animación' : 'Pausar animación';
      button.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="${model.paused ? 'm9 5 10 7-10 7Z' : 'M9 6v12M15 6v12'}"/></svg>`;
    }
    daylight(now) {
      const data = model.weather;
      const rise = Date.parse(data?.sunriseAt), set = Date.parse(data?.sunsetAt);
      if (Number.isFinite(rise) && Number.isFinite(set) && rise < set) return now.getTime() >= rise && now.getTime() < set;
      return data ? data.isDay : now.getHours() >= 6 && now.getHours() < 19;
    }
    tick() {
      const now = new Date();
      const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}-${model.weather?.isDay}`;
      if (this.lastClock === key) return;
      this.lastClock = key;
      const daylight = this.daylight(now);
      const date = this.querySelector('[data-local-date]');
      date.textContent = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
      const time = this.querySelector('[data-local-time]');
      time.textContent = clock(now);
      time.dateTime = now.toISOString();
      time.setAttribute('aria-label', `Hora local: ${clock(now)}`);
      this.querySelector('[data-welcome-greeting]').textContent = daylight ? 'Un buen día para' : 'Una buena noche para';
      this.querySelector('section').dataset.phase = model.weather && daylight === model.weather.isDay ? model.weather.phase : daylight ? 'day' : 'night';
      if (model.weather?.condition === 'clear') this.querySelector('[data-condition-label]').textContent = daylight ? 'Soleado' : 'Despejado';
    }
    update() {
      const data = model.weather;
      this.lastClock = '';
      this.tick();
      this.querySelector('section').dataset.condition = data?.condition || 'unknown';
      const temperature = this.querySelector('[data-temperature]');
      temperature.hidden = !data;
      temperature.textContent = data ? `${data.temperature}°` : '';
      temperature.setAttribute('aria-label', data ? `${data.temperature} grados Celsius` : '');
      this.querySelector('[data-condition-label]').textContent = data ? (data.condition === 'clear' && !this.daylight(new Date()) ? 'Despejado' : labels[data.condition]) : model.loading ? 'Buscando el clima…' : 'Tu hora. Tu ritmo.';
      this.querySelector('[data-place]').textContent = data ? `${data.location.label}${data.location.approximate ? ' · Aprox.' : ''}` : 'Clima de tu zona';
      const locateButton = this.querySelector('[data-weather-action="locate"]');
      locateButton.disabled = model.locating || model.loading;
      this.querySelector('[data-location-action]').textContent = model.locating ? 'Buscando ubicación…' : data && !data.location.approximate ? 'Actualizar ubicación' : 'Usar mi ubicación';
      this.querySelector('[data-weather-status]').textContent = model.message;
    }
    showInfo() {
      const data = model.weather && { ...model.weather, isDay: this.daylight(new Date()) };
      const dialog = this.querySelector('dialog');
      dialog.innerHTML = `<div class="modal-top"><h2 id="weather-dialog-title">El ritmo de tu día.</h2><button type="button" class="icon-button" data-weather-action="close" aria-label="Cerrar información del clima">${icon('close')}</button></div><div class="weather-info-copy"><p>La hora y la fecha siguen la zona horaria de tu dispositivo. La escena acompaña el día, la noche y el clima de tu ubicación.</p><p>${data ? data.location.approximate ? 'La ubicación es aproximada. Usa «Usar mi ubicación» para consultar el clima del lugar donde estás.' : 'El clima corresponde a la ubicación que compartiste con tu navegador.' : 'Comparte tu ubicación para consultar el clima local. Si el servicio no está disponible, seguimos mostrando tu hora sin inventar una temperatura.'}</p>${data ? `<div class="weather-info-summary"><strong>${data.temperature} °C · ${esc(data.condition === 'clear' && !data.isDay ? 'Despejado' : labels[data.condition])}</strong><span>${esc(data.location.label)}</span><span>Pronóstico para las ${esc(clock(new Date(data.forecastAt)))}</span></div>` : ''}<p class="weather-attribution">Pronóstico de <a href="https://api.met.no/weatherapi/locationforecast/2.0/documentation" target="_blank" rel="noopener">MET Norway</a>, bajo licencia <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. Temperatura redondeada y condiciones traducidas al español. La ilustración es de VuelveClub.</p></div>`;
      dialog.showModal();
    }
  }
  customElements.define('vc-welcome', WelcomeWeather);
})();
