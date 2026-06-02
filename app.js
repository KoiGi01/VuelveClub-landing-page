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
    gift: '<path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8M2 7h20v5H2zM12 21V7M12 7S11 2 8.5 2 5 4 5 5s1 2 3 2M12 7s1-5 3.5-5S19 4 19 5s-1 2-3 2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>'
  };

  /* ---------- Negocios ---------- */
  const BIZ = [
    {
      key: "cafe", name: "Café Bonito", tag: "Tarjeta de lealtad",
      cardBg: "#CBDE2A", text: "#1a1d05", logoBg: "#1a1d05", logoColor: "#CBDE2A",
      stampBg: "#1a1d05", stampIcon: "#CBDE2A", icon: "coffee",
      reward: "Café gratis", halo: "rgba(203,222,42,.5)",
      confetti: ["#1a1d05", "#CBDE2A", "#A9BC16", "#ffffff"]
    },
    {
      key: "barber", name: "Navaja & Co.", tag: "Club de cortes",
      cardBg: "#3E2B49", text: "#ffffff", logoBg: "#CBDE2A", logoColor: "#3E2B49",
      stampBg: "#CBDE2A", stampIcon: "#3E2B49", icon: "scissors",
      reward: "Corte gratis", halo: "rgba(106,73,126,.5)",
      confetti: ["#CBDE2A", "#6A497E", "#ffffff", "#3E2B49"]
    },
    {
      key: "pizza", name: "La Nonna", tag: "Pizza club",
      cardBg: "#E8502E", text: "#fff7f0", logoBg: "#fff7f0", logoColor: "#E8502E",
      stampBg: "#fff7f0", stampIcon: "#E8502E", icon: "pizza",
      reward: "Pizza gratis", halo: "rgba(232,80,46,.42)",
      confetti: ["#fff7f0", "#E8502E", "#F2A007", "#1a1d05"]
    }
  ];

  const TOTAL = 10;
  const screen = document.getElementById("wallet");
  const halo = document.getElementById("halo");
  const dotsWrap = document.getElementById("bizDots");
  const confLayer = document.getElementById("confetti");
  if (!screen) return;

  let bizIndex = 0;
  let filled = 0;
  let timers = [];
  let won = false;

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function later(fn, ms) { const t = setTimeout(fn, ms); timers.push(t); return t; }

  function svg(name, cls) {
    return '<svg viewBox="0 0 24 24" class="' + (cls || "") + '">' + ICONS[name] + "</svg>";
  }

  function renderCard() {
    const b = BIZ[bizIndex];
    let stamps = "";
    for (let i = 0; i < TOTAL; i++) {
      if (i < filled) {
        stamps += '<div class="stamp filled" style="background:' + b.stampBg + ';color:' + b.stampIcon + '">' + svg(b.icon) + "</div>";
      } else {
        stamps += '<div class="stamp empty" style="color:' + b.text + '"></div>';
      }
    }
    const meta = filled >= TOTAL
      ? '<span>' + TOTAL + ' de ' + TOTAL + ' sellos</span><span>¡Premio ganado!</span>'
      : '<span>' + filled + ' de ' + TOTAL + ' sellos</span><span>¡Sigue así!</span>';

    screen.innerHTML =
      '<div class="wallet-top">' +
        '<div class="gw"><span class="gw-mark"><i style="background:#EA4335"></i><i style="background:#FBBC04"></i><i style="background:#4285F4"></i><i style="background:#34A853"></i></span>Google Wallet</div>' +
        '<span class="more">⋮</span>' +
      '</div>' +
      '<div class="wcard" style="background:' + b.cardBg + ';color:' + b.text + '">' +
        '<div class="wcard-head">' +
          '<div><div class="wcard-name">' + b.name + '</div><div class="wcard-tag">' + b.tag + '</div></div>' +
          '<div class="wcard-logo" style="background:' + b.logoBg + ';color:' + b.logoColor + '">' + svg(b.icon) + '</div>' +
        '</div>' +
        '<div class="stamps">' + stamps + '</div>' +
        '<div class="wcard-meta">' + meta + '</div>' +
      '</div>' +
      '<div class="wallet-reward">' +
        '<div class="rl"><b>Recompensa</b><span>' + b.reward + '</span></div>' +
        '<span class="gift">' + svg("gift") + '</span>' +
      '</div>' +
      '<div class="barcode"></div>';

    halo.style.background = "radial-gradient(circle, " + b.halo + ", rgba(0,0,0,0) 68%)";
    updateDots();
  }

  function updateDots() {
    [...dotsWrap.children].forEach((d, i) => d.classList.toggle("active", i === bizIndex));
  }

  function burstConfetti() {
    const b = BIZ[bizIndex];
    for (let i = 0; i < 36; i++) {
      const c = document.createElement("div");
      c.className = "confetti";
      const col = b.confetti[i % b.confetti.length];
      c.style.background = col;
      c.style.left = (50 + (Math.random() * 60 - 30)) + "%";
      c.style.setProperty("--dx", (Math.random() * 220 - 110) + "px");
      c.style.setProperty("--rot", (Math.random() * 720 - 360) + "deg");
      c.style.setProperty("--dur", (1.1 + Math.random() * 0.9) + "s");
      c.style.animationDelay = (Math.random() * 0.25) + "s";
      if (Math.random() > 0.5) c.style.borderRadius = "50%";
      confLayer.appendChild(c);
      setTimeout(() => c.remove(), 2400);
    }
  }

  function showWon() {
    won = true;
    const flag = document.createElement("div");
    flag.className = "won-flag";
    const b = BIZ[bizIndex];
    flag.innerHTML = '<div class="won-pill show">🎉 ¡' + b.reward + '!</div>';
    screen.parentElement.appendChild(flag);
    burstConfetti();
    later(() => { flag.remove(); won = false; }, 2000);
  }

  /* main loop */
  function runFill() {
    if (filled < TOTAL) {
      filled++;
      renderCard();
      if (filled === TOTAL) {
        later(showWon, 250);
        later(nextBiz, 2400);
      } else {
        later(runFill, 430);
      }
    }
  }

  function nextBiz() {
    bizIndex = (bizIndex + 1) % BIZ.length;
    filled = 0;
    renderCard();
    later(runFill, 700);
  }

  function jumpTo(i) {
    clearTimers();
    bizIndex = i;
    filled = 0;
    won = false;
    renderCard();
    later(runFill, 500);
  }

  /* build dots */
  BIZ.forEach((b, i) => {
    const btn = document.createElement("button");
    btn.setAttribute("aria-label", "Ver " + b.name);
    btn.addEventListener("click", () => jumpTo(i));
    dotsWrap.appendChild(btn);
  });

  /* fill instantly (easter egg / demo) */
  function fillAll() {
    clearTimers();
    filled = TOTAL;
    renderCard();
    showWon();
    later(nextBiz, 2400);
  }

  renderCard();
  // start once visible
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { later(runFill, 600); io.disconnect(); }
    });
  }, { threshold: 0.3 });
  io.observe(screen);

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
      if (buf === "vuelve") { fillAll(); buf = ""; }
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
