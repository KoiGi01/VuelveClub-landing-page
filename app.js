/* ============================================================
   VuelveClub — interacciones
   ============================================================ */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  /* ---------- Iconos (paths internos) ---------- */
  const ICONS = {
    coffee: '<path d="M4 8h13a4 4 0 0 1 0 8h-1.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 8h11v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z" fill="currentColor"/><path d="M7 2.5v2M10.5 2.5v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
    scissors: '<circle cx="6" cy="6" r="2.6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="6" cy="18" r="2.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.2 7.6 20 18M8.2 16.4 20 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
    pizza: '<path d="M12 3c4.5 0 8.5 2.2 10 5.5L12 21 2 8.5C3.5 5.2 7.5 3 12 3Z" fill="currentColor"/><circle cx="9" cy="9" r="1.3" fill="#fff"/><circle cx="14" cy="10" r="1.3" fill="#fff"/><circle cx="11" cy="14" r="1.3" fill="#fff"/>',
    gift: '<path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8M2 7h20v5H2zM12 21V7M12 7S11 2 8.5 2 5 4 5 5s1 2 3 2M12 7s1-5 3.5-5S19 4 19 5s-1 2-3 2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    heart: '<path d="M12 20.5S3.5 14.8 3.5 9.2A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.5 2.8c0 5.6-8.5 11.3-8.5 11.3Z" fill="currentColor"/>',
    nfc: '<path d="M6 8a8 8 0 0 1 0 8M10 6a12 12 0 0 1 0 12M14 8a8 8 0 0 1 0 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>'
  };

  /* faux QR (decorative, built once) */
  function buildQR() {
    const N = 21, cell = 4, size = N * cell;
    const isFinder = (x, y) => (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7);
    const finder = (ox, oy) =>
      '<rect x="' + ox * cell + '" y="' + oy * cell + '" width="' + 7 * cell + '" height="' + 7 * cell + '" rx="2" fill="#11131a"/>' +
      '<rect x="' + (ox + 1) * cell + '" y="' + (oy + 1) * cell + '" width="' + 5 * cell + '" height="' + 5 * cell + '" rx="1.5" fill="#fff"/>' +
      '<rect x="' + (ox + 2) * cell + '" y="' + (oy + 2) * cell + '" width="' + 3 * cell + '" height="' + 3 * cell + '" rx="1" fill="#11131a"/>';
    let r = "";
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (isFinder(x, y)) continue;
      if (((x * 5 + y * 3 + x * y) % 3) === 0) r += '<rect x="' + x * cell + '" y="' + y * cell + '" width="' + cell + '" height="' + cell + '" fill="#11131a"/>';
    }
    return '<svg viewBox="0 0 ' + size + ' ' + size + '">' + r + finder(0, 0) + finder(N - 7, 0) + finder(0, N - 7) + '</svg>';
  }
  const QR = buildQR();

  /* ---------- Negocios ---------- */
  const BIZ = [
    {
      key: "cafe", name: "Café Buen Día", tag: "Cliente Frecuente",
      cardBg: "#CBDE2A", text: "#1a1d05", logoBg: "#1a1d05", logoColor: "#CBDE2A",
      stampBg: "#1a1d05", stampIcon: "#CBDE2A", icon: "coffee",
      reward: "Café gratis", filled: 7, halo: "rgba(203,222,42,.5)"
    },
    {
      key: "barber", name: "Navaja & Co.", tag: "Club de Cortes",
      cardBg: "#3E2B49", text: "#ffffff", logoBg: "#CBDE2A", logoColor: "#3E2B49",
      stampBg: "#CBDE2A", stampIcon: "#3E2B49", icon: "scissors",
      reward: "Corte gratis", filled: 4, halo: "rgba(106,73,126,.5)"
    },
    {
      key: "pizza", name: "La Nonna", tag: "Pizza Club",
      cardBg: "#E8502E", text: "#fff7f0", logoBg: "#fff7f0", logoColor: "#E8502E",
      stampBg: "#fff7f0", stampIcon: "#E8502E", icon: "pizza",
      reward: "Pizza gratis", filled: 9, halo: "rgba(232,80,46,.42)"
    }
  ];

  const screen = document.getElementById("wallet");
  const halo = document.getElementById("halo");
  const dotsWrap = document.getElementById("bizDots");
  if (!screen) return;

  const TOTAL = 10;
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let bizIndex = 0;
  let timer = null;

  function svg(name, cls) {
    return '<svg viewBox="0 0 24 24" class="' + (cls || "") + '">' + ICONS[name] + "</svg>";
  }

  function updateDots() {
    [...dotsWrap.children].forEach((d, i) => d.classList.toggle("active", i === bizIndex));
  }

  function renderCard() {
    const b = BIZ[bizIndex];
    let hearts = "";
    for (let i = 0; i < TOTAL; i++) {
      hearts += i < b.filled
        ? '<span class="hstamp filled" style="background:' + b.stampBg + ';color:' + b.stampIcon + '">' + svg("heart") + '</span>'
        : '<span class="hstamp empty" style="border-color:' + b.text + '"></span>';
    }
    screen.innerHTML =
      '<div class="wcard" style="background:' + b.cardBg + ';color:' + b.text + '">' +
        '<div class="wcard-head">' +
          '<div class="wcard-brand">' +
            '<div class="wcard-logo" style="background:' + b.logoBg + ';color:' + b.logoColor + '">' + svg(b.icon) + '</div>' +
            '<div><div class="wcard-name">' + b.name + '</div><div class="wcard-tag">' + b.tag + '</div></div>' +
          '</div>' +
          '<span class="wcard-kicker">TARJETA</span>' +
        '</div>' +
        '<div class="wcard-stats">' +
          '<div><span class="k">VISITAS</span><span class="v">' + b.filled + ' / ' + TOTAL + '</span></div>' +
          '<div class="r"><span class="k">RECOMPENSA</span><span class="v">' + b.reward + '</span></div>' +
        '</div>' +
        '<div class="hearts">' + hearts + '</div>' +
        '<div class="wcard-qr">' + QR + '</div>' +
        '<div class="wcard-foot"><span class="cardnum">1234 5678 9012 3456</span><span class="wnfc">' + svg("nfc") + '</span></div>' +
      '</div>';

    if (halo) halo.style.background = "radial-gradient(circle, " + b.halo + ", rgba(0,0,0,0) 68%)";
    if (!reduceMotion) {
      screen.classList.remove("swipe-in");
      void screen.offsetWidth;       // force reflow to replay the animation
      screen.classList.add("swipe-in");
    }
    updateDots();
  }

  function goTo(i) {
    bizIndex = (i + BIZ.length) % BIZ.length;
    renderCard();
  }
  function advance() { goTo(bizIndex + 1); }

  function startAuto() {
    if (reduceMotion || timer) return;
    timer = setInterval(advance, 3200);
  }
  function stopAuto() { if (timer) { clearInterval(timer); timer = null; } }

  /* build dots (manual swipe between locales) */
  BIZ.forEach((b, i) => {
    const btn = document.createElement("button");
    btn.setAttribute("aria-label", "Ver " + b.name);
    btn.addEventListener("click", () => { goTo(i); stopAuto(); startAuto(); });
    dotsWrap.appendChild(btn);
  });

  renderCard();
  // auto-advance only while visible; pause on hover
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) startAuto(); else stopAuto(); });
  }, { threshold: 0.3 });
  io.observe(screen);
  const stageEl = screen.closest(".phone-stage");
  if (stageEl) {
    stageEl.addEventListener("mouseenter", stopAuto);
    stageEl.addEventListener("mouseleave", startAuto);
  }

  /* ---------- Count-up stats ---------- */
  function countUp(el) {
    const target = parseFloat(el.dataset.to);
    const dec = (el.dataset.dec | 0);
    const dur = 1400;
    const start = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(dec);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target.toFixed(dec);
    }
    requestAnimationFrame(tick);
  }
  const statIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { countUp(e.target); statIO.unobserve(e.target); }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll("[data-to]").forEach((el) => statIO.observe(el));

  /* ---------- Stat viz animation ---------- */
  const vizIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("animate"); vizIO.unobserve(e.target); }
    });
  }, { threshold: 0.45 });
  document.querySelectorAll(".stat[data-viz]").forEach((el) => vizIO.observe(el));

  /* ---------- Reveal on scroll ---------- */
  const revIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); revIO.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => revIO.observe(el));

  /* ---------- Magnetic CTA ---------- */
  document.querySelectorAll("[data-magnetic]").forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = "translate(" + x * 0.22 + "px," + y * 0.28 + "px)";
    });
    btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
  });

  /* ---------- Easter egg: teclea "vuelve" ---------- */
  let buf = "";
  window.addEventListener("keydown", (e) => {
    if (e.key && e.key.length === 1) {
      buf = (buf + e.key.toLowerCase()).slice(-6);
      if (buf === "vuelve") { advance(); buf = ""; }
    }
  });

  /* ---------- forms: submit to /api/lead ---------- */
  document.querySelectorAll("form[data-demo]").forEach((f) => {
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = f.querySelector("button[type=submit], .btn");
      const errEl = f.querySelector(".form-error");
      const fd = new FormData(f);
      const payload = {
        source: f.dataset.source || "demo",
        email: (fd.get("email") || "").trim(),
        nombre: (fd.get("nombre") || "").trim(),
        negocio: (fd.get("negocio") || "").trim(),
        whatsapp: (fd.get("whatsapp") || "").trim(),
        tipo: (fd.get("tipo") || "").trim(),
        company: (fd.get("company") || "").trim()
      };

      if (errEl) { errEl.hidden = true; errEl.textContent = ""; }
      const label = btn ? btn.textContent : "";
      if (btn) { btn.textContent = "Enviando…"; btn.style.pointerEvents = "none"; }

      try {
        const res = await fetch("/api/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error((data && data.error) || "Error");

        if (btn) {
          btn.textContent = "¡Listo! Te contactamos ✦";
          setTimeout(() => {
            btn.textContent = label;
            btn.style.pointerEvents = "";
            f.reset && f.reset();
          }, 2600);
        }
      } catch (err) {
        if (btn) { btn.textContent = label; btn.style.pointerEvents = ""; }
        if (errEl) {
          errEl.textContent = "No pudimos enviar tus datos. Intenta de nuevo o escríbenos por WhatsApp.";
          errEl.hidden = false;
        }
      }
    });
  });

})();
