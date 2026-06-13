/* ============================================================
   Aleph BI — "Vértice"  ·  motion + interaction engine
   ============================================================ */
(function () {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ───────────────────────────────────────────────
     1 · HERO VERTEX NETWORK  (canvas)
     A living mesh: drifting nodes, proximity edges,
     mouse gravity, and "data pulses" travelling links.
  ─────────────────────────────────────────────── */
  const canvas = document.getElementById('net');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const GREEN = '171,201,181';
    const TEAL  = '125,170,168';
    let W = 0, H = 0, DPR = 1;
    let nodes = [], pulses = [], raf = null, running = false;
    const mouse = { x: -9999, y: -9999, active: false };

    function resize() {
      DPR = Math.min(2, window.devicePixelRatio || 1);
      const r = canvas.parentElement.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      build();
    }

    function build() {
      const count = Math.max(34, Math.min(92, Math.round((W * H) / 15500)));
      nodes = [];
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: Math.random() * 1.6 + 1.1,
          teal: Math.random() < 0.22,
          ph: Math.random() * Math.PI * 2
        });
      }
      pulses = [];
    }

    const LINK = 168;       // max link distance
    const LINK2 = LINK * LINK;

    function spawnPulse() {
      if (nodes.length < 2 || pulses.length > 5) return;
      const a = (Math.random() * nodes.length) | 0;
      // find a near neighbour
      let best = -1, bestD = LINK2;
      for (let k = 0; k < 7; k++) {
        const b = (Math.random() * nodes.length) | 0;
        if (b === a) continue;
        const dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = b; }
      }
      if (best >= 0) pulses.push({ a, b: best, t: 0, sp: 0.012 + Math.random() * 0.014 });
    }

    let frame = 0;
    function render() {
      frame++;
      ctx.clearRect(0, 0, W, H);

      // move
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < -20) n.x = W + 20; else if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20; else if (n.y > H + 20) n.y = -20;
        // gentle mouse gravity
        if (mouse.active) {
          const dx = mouse.x - n.x, dy = mouse.y - n.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 26000 && d2 > 1) {
            const f = 0.34 / Math.sqrt(d2);
            n.vx += dx * f * 0.012;
            n.vy += dy * f * 0.012;
          }
        }
        // damping toward base drift speed
        n.vx *= 0.992; n.vy *= 0.992;
      }

      // edges
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK2) {
            const al = (1 - d2 / LINK2) * 0.34;
            ctx.strokeStyle = 'rgba(' + GREEN + ',' + al.toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        // link to cursor
        if (mouse.active) {
          const dx = a.x - mouse.x, dy = a.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK2 * 1.4) {
            const al = (1 - d2 / (LINK2 * 1.4)) * 0.5;
            ctx.strokeStyle = 'rgba(' + GREEN + ',' + al.toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }

      // nodes
      for (const n of nodes) {
        const tw = 0.55 + 0.45 * Math.sin(frame * 0.015 + n.ph);
        const col = n.teal ? TEAL : GREEN;
        ctx.fillStyle = 'rgba(' + col + ',' + (0.45 + 0.4 * tw).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        // soft halo
        ctx.fillStyle = 'rgba(' + col + ',' + (0.07 * tw).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // pulses (data travelling along links)
      if (frame % 26 === 0) spawnPulse();
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += p.sp;
        if (p.t >= 1 || !nodes[p.a] || !nodes[p.b]) { pulses.splice(i, 1); continue; }
        const a = nodes[p.a], b = nodes[p.b];
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;
        const fade = Math.sin(p.t * Math.PI);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * fade).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(x, y, 2.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(' + GREEN + ',' + (0.45 * fade).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(x, y, 5.5, 0, Math.PI * 2);
        ctx.fill();
      }

    }

    function loop() { render(); raf = requestAnimationFrame(loop); }
    function start() { if (!running && !reduce) { running = true; loop(); } }
    function stop()  { if (running) { running = false; cancelAnimationFrame(raf); } }

    window.addEventListener('resize', resize, { passive: true });
    const hero = document.getElementById('hero');
    window.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.active = mouse.y > 0 && mouse.y < r.height;
    }, { passive: true });
    window.addEventListener('pointerleave', () => { mouse.active = false; });

    resize();
    render();           // always paint one static frame (survives paused rAF / export)
    if (!reduce) {
      const io = new IntersectionObserver((ents) => {
        ents.forEach(e => e.isIntersecting ? start() : stop());
      }, { threshold: 0.01 });
      io.observe(hero);
      start();
    }
  }

  /* ───────────────────────────────────────────────
     2 · SCROLL REVEALS  (+ stagger groups)
  ─────────────────────────────────────────────── */
  const revIO = new IntersectionObserver((ents) => {
    ents.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('vis');
        if (e.target.classList.contains('stagger')) e.target.classList.add('run');
        revIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal, .stagger').forEach(el => revIO.observe(el));

  /* bidirectional reveal — animates IN on enter, OUT on leave (Why / Services / Target) */
  const biIO = new IntersectionObserver((ents) => {
    ents.forEach(e => e.target.classList.toggle('inview', e.isIntersecting));
  }, { threshold: 0.16, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.anim2').forEach(el => biIO.observe(el));

  /* ───────────────────────────────────────────────
     3 · NAV — hide on scroll-down, glass, dark-aware
  ─────────────────────────────────────────────── */
  const nav = document.getElementById('nav');
  const heroEl = document.getElementById('hero');
  let lastY = window.scrollY, tick = false;
  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 36);
    const overHero = y < (heroEl.offsetHeight - 80);
    nav.classList.toggle('on-dark', overHero);
    lastY = y; tick = false;
    // reading progress
    const h = document.documentElement;
    const p = h.scrollTop / (h.scrollHeight - h.clientHeight);
    bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, p)) + ')';
  }
  const bar = document.getElementById('readbar');
  window.addEventListener('scroll', () => { if (!tick) { requestAnimationFrame(onScroll); tick = true; } }, { passive: true });
  onScroll();

  /* ───────────────────────────────────────────────
     4 · HERO PARALLAX (subtle)
  ─────────────────────────────────────────────── */
  const heroInner = document.querySelector('.hero-inner');
  if (heroInner && !reduce) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y < window.innerHeight) {
        heroInner.style.transform = 'translateY(' + (y * 0.18) + 'px)';
        heroInner.style.opacity = String(Math.max(0, 1 - y / (window.innerHeight * 0.82)));
      }
    }, { passive: true });
  }

  /* ───────────────────────────────────────────────
     5 · COUNTERS
  ─────────────────────────────────────────────── */
  function runCount(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const dur = 1800, start = performance.now();
    const fmt = (n) => Math.round(n).toLocaleString('es-CO');
    function t(now) {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.innerHTML = fmt(target * e) + (suffix ? '<span class="suf">' + suffix + '</span>' : '');
      if (p < 1) requestAnimationFrame(t);
    }
    requestAnimationFrame(t);
  }
  const cIO = new IntersectionObserver((ents) => {
    ents.forEach(e => { if (e.isIntersecting) { runCount(e.target); cIO.unobserve(e.target); } });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach(el => cIO.observe(el));

  /* ───────────────────────────────────────────────
     6 · PIPELINE — data pulse + node lighting
  ─────────────────────────────────────────────── */
  const pipe = document.getElementById('pipeline');
  if (pipe) {
    const pIO = new IntersectionObserver((ents) => {
      ents.forEach(e => {
        if (e.isIntersecting) {
          const fill = pipe.querySelector('.pipe-line .fill');
          if (fill) fill.style.transform = 'scaleX(1)';
          [...pipe.querySelectorAll('.pstep')].forEach((s, i) => setTimeout(() => s.classList.add('lit'), 160 + i * 220));
          pIO.disconnect();
        }
      });
    }, { threshold: 0.35 });
    pIO.observe(pipe);
  }

  /* ───────────────────────────────────────────────
     7 · TRIANGLE — self-drawing on view
  ─────────────────────────────────────────────── */
  const trust = document.getElementById('trust');
  if (trust) {
    const tIO = new IntersectionObserver((ents) => {
      ents.forEach(e => { if (e.isIntersecting) { trust.classList.add('drawn'); tIO.disconnect(); } });
    }, { threshold: 0.3 });
    tIO.observe(trust);
  }

  /* ───────────────────────────────────────────────
     8 · SCRAMBLE TEXT (data voice flourish)
  ─────────────────────────────────────────────── */
  const GLYPHS = '01<>/{}[]#%&Aлеф010110';
  function scramble(el) {
    const final = el.dataset.scramble;
    const dur = 900, start = performance.now();
    function t(now) {
      const p = Math.min(1, (now - start) / dur);
      const reveal = Math.floor(p * final.length);
      let out = '';
      for (let i = 0; i < final.length; i++) {
        if (i < reveal || final[i] === ' ') out += final[i];
        else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(t);
      else el.textContent = final;
    }
    requestAnimationFrame(t);
  }
  if (!reduce) {
    const sIO = new IntersectionObserver((ents) => {
      ents.forEach(e => { if (e.isIntersecting) { scramble(e.target); sIO.unobserve(e.target); } });
    }, { threshold: 0.7 });
    document.querySelectorAll('[data-scramble]').forEach(el => sIO.observe(el));
  }

  /* ───────────────────────────────────────────────
     9 · MAGNETIC BUTTONS
  ─────────────────────────────────────────────── */
  if (!reduce && window.matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('.btn.magnetic').forEach(btn => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const mx = e.clientX - r.left - r.width / 2;
        const my = e.clientY - r.top - r.height / 2;
        btn.style.transform = 'translate(' + (mx * 0.18) + 'px,' + (my * 0.28) + 'px)';
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }
})();
