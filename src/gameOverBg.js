const TAU = Math.PI * 2;

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function createGameOverBg(canvas, getBox) {
  const ctx = canvas.getContext('2d');
  const reduce = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let raf = 0;
  let running = false;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let time = 0;
  let last = 0;
  let stars = [];
  let blobs = [];
  let spirals = [];
  let ghosts = [];

  function build() {
    const area = w * h;
    const starCount = Math.max(90, Math.min(220, Math.round(area / 8200)));
    stars = [];
    for (let i = 0; i < starCount; i++) {
      const big = Math.random() > 0.85;
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: big ? 1.2 + Math.random() * 1.1 : 0.3 + Math.random() * 0.9,
        base: 0.22 + Math.random() * 0.6,
        tw: Math.random() * TAU,
        tws: 0.4 + Math.random() * 1.5,
        color: Math.random() < 0.28 ? (Math.random() < 0.5 ? '#9ef2ff' : '#ffb4ea') : '#ffffff'
      });
    }

    const nebColors = ['#00e6ff', '#ff2fb8', '#4b6cff', '#00ffd5', '#d24bff'];
    const blobCount = 6;
    blobs = [];
    for (let i = 0; i < blobCount; i++) {
      blobs.push({
        color: nebColors[i % nebColors.length],
        radius: (0.3 + Math.random() * 0.24) * Math.min(w, h),
        orbit: 0.06 + Math.random() * 0.18,
        angle: (i / blobCount) * TAU + Math.random() * 0.5,
        speed: (0.02 + Math.random() * 0.045) * (i % 2 ? 1 : -1),
        alpha: 0.05 + Math.random() * 0.07,
        squash: 0.5 + Math.random() * 0.35
      });
    }

    const arms = 3;
    spirals = [];
    for (let a = 0; a < arms; a++) {
      const dots = [];
      for (let i = 0; i < 26; i++) {
        dots.push({ t: i / 25, jitter: (Math.random() - 0.5) * 0.28 });
      }
      spirals.push({ base: (a / arms) * TAU, dir: a % 2 ? 1 : -1, dots });
    }

    const palette = ['#5cff7a', '#ff5cc8', '#ffa53d', '#5af0ff', '#b45cff', '#ffe14d'];
    const ghostCount = 14;
    ghosts = [];
    for (let i = 0; i < ghostCount; i++) {
      ghosts.push({
        color: palette[i % palette.length],
        round: Math.random() < 0.5,
        size: 24 + Math.random() * 50,
        orbit: 0.24 + Math.random() * 1.0,
        angle: Math.random() * TAU,
        speed: (0.012 + Math.random() * 0.035) * (Math.random() < 0.5 ? 1 : -1),
        bob: Math.random() * TAU,
        bobSpeed: 0.3 + Math.random() * 0.8,
        alpha: 0.05 + Math.random() * 0.09,
        blur: 5 + Math.random() * 9,
        rot: Math.random() * TAU,
        rotSpeed: (Math.random() - 0.5) * 0.4
      });
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function drawBase() {
    const cx = w / 2;
    const cy = h / 2;
    const g = ctx.createRadialGradient(cx, cy * 0.92, 0, cx, cy, Math.hypot(w, h) * 0.62);
    g.addColorStop(0, 'rgba(11,13,32,0.97)');
    g.addColorStop(0.55, 'rgba(6,7,20,0.98)');
    g.addColorStop(1, 'rgba(2,2,8,1)');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function drawNebulae() {
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (const b of blobs) {
      const a = b.angle + time * b.speed;
      const x = cx + Math.cos(a) * b.orbit * R;
      const y = cy + Math.sin(a) * b.orbit * R * b.squash;
      const g = ctx.createRadialGradient(x, y, 0, x, y, b.radius);
      g.addColorStop(0, rgba(b.color, b.alpha));
      g.addColorStop(0.45, rgba(b.color, b.alpha * 0.45));
      g.addColorStop(1, rgba(b.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, b.radius, 0, TAU);
      ctx.fill();
    }
  }

  function drawSpirals() {
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (const arm of spirals) {
      const a0 = arm.base + time * 0.06 * arm.dir;
      for (const d of arm.dots) {
        const ang = a0 + d.t * Math.PI * 1.7 * arm.dir + d.jitter;
        const rad = (0.12 + d.t * 0.62) * R;
        const x = cx + Math.cos(ang) * rad;
        const y = cy + Math.sin(ang) * rad * 0.72;
        ctx.fillStyle = rgba(d.t < 0.5 ? '#66f4ff' : '#ff6ad5', 0.05 + (1 - d.t) * 0.08);
        ctx.beginPath();
        ctx.arc(x, y, 0.6 + (1 - d.t) * 1.1, 0, TAU);
        ctx.fill();
      }
    }
  }

  function drawStars() {
    ctx.globalCompositeOperation = 'source-over';
    for (const s of stars) {
      ctx.globalAlpha = s.base * (0.55 + 0.45 * Math.sin(time * s.tws + s.tw));
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawGhosts() {
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.hypot(w, h) / 2;
    for (const g of ghosts) {
      const a = g.angle + time * g.speed;
      const x = cx + Math.cos(a) * g.orbit * R;
      const y = cy + Math.sin(a) * g.orbit * R * 0.8 + Math.sin(time * g.bobSpeed + g.bob) * 18;
      ctx.save();
      ctx.globalAlpha = g.alpha;
      ctx.fillStyle = g.color;
      if ('filter' in ctx) {
        ctx.filter = `blur(${g.blur}px)`;
      } else {
        ctx.shadowColor = g.color;
        ctx.shadowBlur = g.blur * 2;
      }
      ctx.translate(x, y);
      ctx.rotate(g.rot + time * g.rotSpeed);
      const s = g.size;
      if (g.round) {
        ctx.beginPath();
        ctx.arc(0, 0, s / 2, 0, TAU);
        ctx.fill();
      } else {
        roundRect(ctx, -s / 2, -s / 2, s, s, s * 0.3);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawHalo() {
    const box = getBox ? getBox() : null;
    if (!box || box.w <= 0 || box.h <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(box.x + box.w / 2, box.y + box.h / 2);
    const rx = box.w * 0.82;
    const ry = Math.max(1, box.h * 0.82);
    ctx.scale(1, ry / rx);
    const outer = rx * 1.5;
    const g = ctx.createRadialGradient(0, 0, rx * 0.55, 0, 0, outer);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.34, 'rgba(60,240,255,0.15)');
    g.addColorStop(0.6, 'rgba(255,70,210,0.11)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, outer, 0, TAU);
    ctx.fill();

    const ringA = 0.16 + 0.08 * Math.sin(time * 1.2);
    ctx.strokeStyle = `rgba(150,250,255,${ringA})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, rx * 0.8, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function render() {
    drawBase();
    drawNebulae();
    drawSpirals();
    drawStars();
    drawGhosts();
    drawHalo();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function frame(ts) {
    if (!running) return;
    if (!last) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    time += dt;
    render();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    last = 0;
    time = 0;
    resize();
    if (reduce) {
      render();
      running = false;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function onResize() {
    if (running) resize();
  }

  window.addEventListener('resize', onResize);

  return { start, stop };
}
