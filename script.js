(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var supportsFinePointer = window.matchMedia("(pointer: fine)").matches && window.matchMedia("(hover: hover)").matches;

  /* ------------------------------------------------------------------ */
  /* Header: solid background + progress bar on scroll                  */
  /* ------------------------------------------------------------------ */
  var header = document.getElementById("siteHeader");
  var progressBar = document.getElementById("scrollProgressBar");

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.setAttribute("data-solid", y > 24 ? "true" : "false");

    if (progressBar) {
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docHeight > 0 ? (y / docHeight) * 100 : 0;
      progressBar.style.transform = "scaleX(" + (Math.min(100, Math.max(0, pct)) / 100) + ")";
    }
  }
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------------ */
  /* Mobile nav toggle                                                   */
  /* ------------------------------------------------------------------ */
  var navToggle = document.getElementById("navToggle");
  var mobileNav = document.getElementById("mobileNav");

  function closeMobileNav() {
    if (!mobileNav || !navToggle) return;
    mobileNav.setAttribute("data-open", "false");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
  }

  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = mobileNav.getAttribute("data-open") === "true";
      mobileNav.setAttribute("data-open", isOpen ? "false" : "true");
      navToggle.setAttribute("aria-expanded", isOpen ? "false" : "true");
      navToggle.setAttribute("aria-label", isOpen ? "Open menu" : "Close menu");
    });

    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMobileNav);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Scroll reveal animations (GSAP + ScrollTrigger, with IO fallback)   */
  /* ------------------------------------------------------------------ */
  var hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);
  }

  function revealWithGSAP() {
    var revealEls = document.querySelectorAll(".reveal-up");
    revealEls.forEach(function (el, i) {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
        delay: prefersReducedMotion ? 0 : Math.min(i % 4, 3) * 0.06,
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          toggleActions: "play none none none"
        }
      });
    });

    var lines = document.querySelectorAll(".reveal-line span");
    gsap.set(lines, { yPercent: prefersReducedMotion ? 0 : 110, opacity: prefersReducedMotion ? 1 : 0 });

    var heroLines = [], sectionLines = [];
    lines.forEach(function (el) {
      (el.closest(".hero-title") ? heroLines : sectionLines).push(el);
    });

    /* Hero lines are already in view on load, so they play immediately. */
    gsap.to(heroLines, {
      yPercent: 0,
      opacity: 1,
      duration: 0.9,
      ease: "power4.out",
      stagger: 0.12,
      delay: 0.15
    });

    /* Section headings are below the fold — scroll-trigger them like the
       rest of the section content instead of animating on page load,
       otherwise they'd finish before the user ever scrolls to see them. */
    sectionLines.forEach(function (el, i) {
      gsap.to(el, {
        yPercent: 0,
        opacity: 1,
        duration: 0.9,
        ease: "power4.out",
        delay: prefersReducedMotion ? 0 : (i % 2) * 0.1,
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          toggleActions: "play none none none"
        }
      });
    });
  }

  function revealWithFallback() {
    var revealEls = document.querySelectorAll(".reveal-up, .reveal-line span");
    if (!("IntersectionObserver" in window)) {
      revealEls.forEach(function (el) { el.classList.add("is-visible"); el.style.opacity = 1; });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  }

  if (hasGSAP) {
    revealWithGSAP();
  } else {
    revealWithFallback();
  }

  /* ------------------------------------------------------------------ */
  /* Hero bay water: a real 2D height-field ripple simulation (the       */
  /* classic wave-propagation algorithm — two buffers, average of        */
  /* neighbors minus the previous frame, damped) distorts an actual      */
  /* reflection of the bridge/moon in real time. The cursor injects      */
  /* energy into the simulation directly; it isn't a decorative overlay. */
  /* Skipped entirely under reduced motion.                              */
  /* ------------------------------------------------------------------ */
  (function () {
    var canvas = document.getElementById("heroWaterCanvas");
    var heroEl = document.querySelector(".hero");
    if (!canvas || !heroEl || prefersReducedMotion) return;

    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var SRC_W = 1440, SRC_H = 800;
    var WATER_TOP = 468;
    var REFLECT_H = SRC_H - WATER_TOP;
    var sliceScale = 1, sliceOffsetX = 0, sliceOffsetY = 0;

    function resizeCanvas() {
      var rect = heroEl.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      sliceScale = Math.max(rect.width / SRC_W, rect.height / SRC_H);
      sliceOffsetX = (rect.width - SRC_W * sliceScale) / 2;
      sliceOffsetY = (rect.height - SRC_H * sliceScale) / 2;
      ctx.setTransform(dpr * sliceScale, 0, 0, dpr * sliceScale, dpr * sliceOffsetX, dpr * sliceOffsetY);
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    /* Perlin noise — drives only the ambient mist drift now. */
    function createNoise() {
      var permutation = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
      var p = new Array(512);
      for (var i = 0; i < 256; i++) p[256 + i] = p[i] = permutation[i];
      function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
      function lerp(t, a, b) { return a + t * (b - a); }
      function grad(hash, x, y, z) {
        var h = hash & 15;
        var u = h < 8 ? x : y;
        var v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
      }
      return {
        simplex3: function (x, y, z) {
          var X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
          x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
          var u = fade(x), v = fade(y), w = fade(z);
          var A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
          var B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
          return lerp(w,
            lerp(v, lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)), lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))),
            lerp(v, lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)), lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1)))
          );
        }
      };
    }
    var noise = createNoise();

    var mist = [];
    for (var m = 0; m < 40; m++) {
      mist.push({
        x: Math.random() * SRC_W, y: Math.random() * SRC_H,
        size: Math.random() * 1.3 + 0.6,
        life: Math.random() * 140, maxLife: 140 + Math.random() * 90
      });
    }

    /* ---- Reflection source: a soft, undistorted "light on water" image
       (deck glow, pile streaks, moon glow) that the ripple sim will warp.
       Built once into an offscreen canvas so the per-frame cost is just
       sampling it, not redrawing it. ---- */
    var reflectCanvas = document.createElement("canvas");
    reflectCanvas.width = SRC_W;
    reflectCanvas.height = REFLECT_H;
    var rctx = reflectCanvas.getContext("2d");
    var MOON_X = 820;
    var PILE_XS = [210,260,310,360,410,460,510,560,610,660,710,760,810,860,910,960,1010,1060,1110,1160,1210];

    (function buildReflection() {
      rctx.clearRect(0, 0, SRC_W, REFLECT_H);

      var deckGrad = rctx.createLinearGradient(0, 0, 0, 28);
      deckGrad.addColorStop(0, "rgba(243, 239, 228, 0.55)");
      deckGrad.addColorStop(1, "rgba(243, 239, 228, 0)");
      rctx.fillStyle = deckGrad;
      rctx.fillRect(0, 0, SRC_W, 28);

      PILE_XS.forEach(function (px) {
        var g = rctx.createLinearGradient(0, 0, 0, 64);
        g.addColorStop(0, "rgba(243, 239, 228, 0.22)");
        g.addColorStop(1, "rgba(243, 239, 228, 0)");
        rctx.fillStyle = g;
        rctx.fillRect(px - 1, 0, 2, 64);
      });

      var moonG = rctx.createRadialGradient(MOON_X, 6, 0, MOON_X, 6, 100);
      moonG.addColorStop(0, "rgba(243, 239, 228, 0.4)");
      moonG.addColorStop(1, "rgba(243, 239, 228, 0)");
      rctx.fillStyle = moonG;
      rctx.beginPath();
      rctx.ellipse(MOON_X, 10, 100, 78, 0, 0, Math.PI * 2);
      rctx.fill();

      var accentG = rctx.createLinearGradient(0, 0, 0, 40);
      accentG.addColorStop(0, "rgba(201, 123, 74, 0.16)");
      accentG.addColorStop(1, "rgba(201, 123, 74, 0)");
      rctx.fillStyle = accentG;
      rctx.fillRect(0, 0, SRC_W, 40);

      var fade = rctx.createLinearGradient(0, 0, 0, REFLECT_H);
      fade.addColorStop(0, "rgba(255,255,255,1)");
      fade.addColorStop(0.45, "rgba(255,255,255,0.35)");
      fade.addColorStop(1, "rgba(255,255,255,0)");
      rctx.globalCompositeOperation = "destination-in";
      rctx.fillStyle = fade;
      rctx.fillRect(0, 0, SRC_W, REFLECT_H);
      rctx.globalCompositeOperation = "source-over";
    })();

    /* ---- Ripple physics: classic two-buffer height-field wave equation.
       newHeight = (sum of 4 neighbors)/2 - previousHeight, then damped.
       This naturally produces expanding, interfering, decaying waves —
       real wave propagation, not an approximated sine sum. ---- */
    var COLS = 88, ROWS = 34;
    var cellW = SRC_W / (COLS - 1);
    var cellH = REFLECT_H / (ROWS - 1);
    var bufA = new Float32Array(COLS * ROWS);
    var bufB = new Float32Array(COLS * ROWS);
    var bufC = new Float32Array(COLS * ROWS);
    var heightCur = bufA, heightOld = bufB, heightNext = bufC;

    function gi(cx, cy) { return cy * COLS + cx; }

    var MAX_HEIGHT = 34;

    function stepSimulation() {
      for (var y = 1; y < ROWS - 1; y++) {
        for (var x = 1; x < COLS - 1; x++) {
          var i = gi(x, y);
          var v = (heightCur[gi(x - 1, y)] + heightCur[gi(x + 1, y)] + heightCur[gi(x, y - 1)] + heightCur[gi(x, y + 1)]) * 0.5 - heightOld[i];
          v *= 0.965;
          /* Hard clamp — the wave equation is only marginally stable, and
             without a bound, continuous small impulses slowly accumulate
             into runaway spikes that read as glitching/popping. */
          if (v > MAX_HEIGHT) v = MAX_HEIGHT;
          else if (v < -MAX_HEIGHT) v = -MAX_HEIGHT;
          heightNext[i] = v;
        }
      }
      var tmp = heightOld;
      heightOld = heightCur;
      heightCur = heightNext;
      heightNext = tmp;
    }

    function clampCell(i) {
      if (heightCur[i] > MAX_HEIGHT) heightCur[i] = MAX_HEIGHT;
      else if (heightCur[i] < -MAX_HEIGHT) heightCur[i] = -MAX_HEIGHT;
    }

    function addImpulse(svgX, svgY, strength) {
      var gx = Math.round((svgX / SRC_W) * (COLS - 1));
      var gy = Math.round(((svgY - WATER_TOP) / REFLECT_H) * (ROWS - 1));
      if (gx < 1 || gx > COLS - 2 || gy < 1 || gy > ROWS - 2) return;
      var c = gi(gx, gy), l = gi(gx - 1, gy), rr = gi(gx + 1, gy), u = gi(gx, gy - 1), d = gi(gx, gy + 1);
      heightCur[c] += strength;
      heightCur[l] += strength * 0.5;
      heightCur[rr] += strength * 0.5;
      heightCur[u] += strength * 0.5;
      heightCur[d] += strength * 0.5;
      clampCell(c); clampCell(l); clampCell(rr); clampCell(u); clampCell(d);
    }

    function heightAt(gx, gy) {
      gx = Math.max(0, Math.min(COLS - 1, gx));
      gy = Math.max(0, Math.min(ROWS - 1, gy));
      return heightCur[gi(gx, gy)];
    }

    /* Bilinear-interpolated sample — smooths out the visible per-cell
       stepping that made the surface line and reflection look jagged. */
    function heightAtF(gxF, gyF) {
      gxF = Math.max(0, Math.min(COLS - 1.001, gxF));
      gyF = Math.max(0, Math.min(ROWS - 1.001, gyF));
      var gx0 = Math.floor(gxF), gx1 = gx0 + 1;
      var gy0 = Math.floor(gyF), gy1 = gy0 + 1;
      var fx = gxF - gx0, fy = gyF - gy0;
      var h00 = heightCur[gi(gx0, gy0)], h10 = heightCur[gi(gx1, gy0)];
      var h01 = heightCur[gi(gx0, gy1)], h11 = heightCur[gi(gx1, gy1)];
      var top = h00 + (h10 - h00) * fx;
      var bot = h01 + (h11 - h01) * fx;
      return top + (bot - top) * fy;
    }

    function toSvgXY(clientX, clientY) {
      var r = heroEl.getBoundingClientRect();
      return {
        x: ((clientX - r.left) - sliceOffsetX) / sliceScale,
        y: ((clientY - r.top) - sliceOffsetY) / sliceScale
      };
    }

    var lastSpawn = 0;
    heroEl.addEventListener("mousemove", function (e) {
      var now = performance.now();
      if (now - lastSpawn < 45) return;
      lastSpawn = now;
      var p = toSvgXY(e.clientX, e.clientY);
      if (p.y > WATER_TOP) addImpulse(p.x, p.y, -9);
    });
    heroEl.addEventListener("click", function (e) {
      var p = toSvgXY(e.clientX, e.clientY);
      if (p.y > WATER_TOP) addImpulse(p.x, p.y, -40);
    });

    var t = 0;
    var STRIP_W = 10;
    var REFRACTION = 3.4;
    var chopTimer = 0;

    function animate() {
      t += 0.016;
      ctx.clearRect(-60, -60, SRC_W + 120, SRC_H + 120);

      stepSimulation();
      /* Gentle ambient chop so the water is never perfectly still — a
         single small, softly-timed nudge rather than frequent random
         spikes, which is what was reading as glitchy. */
      chopTimer -= 1;
      if (chopTimer <= 0) {
        chopTimer = 10 + Math.random() * 14;
        var rx = 1 + Math.floor(Math.random() * (COLS - 2));
        var ry = 1 + Math.floor(Math.random() * (ROWS - 2));
        heightCur[gi(rx, ry)] += (Math.random() - 0.5) * 1.6;
      }

      /* Base body of water: clean vertical gradient, top edge tracing the
         simulated surface row of the height field. */
      function surfaceY(x) {
        var gx = (x / SRC_W) * (COLS - 1);
        return WATER_TOP + heightAtF(gx, 0) * 0.5;
      }

      var grad = ctx.createLinearGradient(0, WATER_TOP, 0, SRC_H);
      grad.addColorStop(0, "rgba(41, 92, 88, 0.88)");
      grad.addColorStop(0.35, "rgba(23, 52, 54, 0.92)");
      grad.addColorStop(1, "rgba(11, 17, 21, 0.97)");

      ctx.beginPath();
      ctx.moveTo(-60, surfaceY(-60));
      for (var x = -60; x <= SRC_W + 60; x += 18) ctx.lineTo(x, surfaceY(x));
      ctx.lineTo(SRC_W + 60, SRC_H + 60);
      ctx.lineTo(-60, SRC_H + 60);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      /* Distorted reflection: each vertical strip of the reflection image
         is shifted horizontally by the local wave slope — the classic
         cheap-but-convincing 2D water refraction technique. */
      ctx.save();
      ctx.beginPath();
      ctx.rect(-60, WATER_TOP - 4, SRC_W + 120, REFLECT_H + 4);
      ctx.clip();
      for (var sx = 0; sx < SRC_W; sx += STRIP_W) {
        var gx2 = (sx / SRC_W) * (COLS - 1);
        var slope = heightAtF(gx2 + 0.6, 1) - heightAtF(gx2 - 0.6, 1);
        var dx = slope * REFRACTION;
        var bend = heightAtF(gx2, 3) * 0.35;
        ctx.drawImage(reflectCanvas, sx, 0, STRIP_W + 1, REFLECT_H, sx + dx, WATER_TOP + bend, STRIP_W + 1, REFLECT_H);
      }
      ctx.restore();

      /* Crest highlight line */
      ctx.beginPath();
      ctx.moveTo(-60, surfaceY(-60));
      for (var x2 = -60; x2 <= SRC_W + 60; x2 += 18) ctx.lineTo(x2, surfaceY(x2));
      ctx.strokeStyle = "rgba(243, 239, 228, 0.42)";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      /* Foam glints where the wave field peaks — fade in smoothly with a
         soft threshold rather than a hard on/off cutoff, which was
         popping distractingly as values crossed the line frame to frame. */
      for (var gcx = 1; gcx < COLS - 1; gcx += 2) {
        for (var gcy = 1; gcy < ROWS - 1; gcy += 3) {
          var hv = heightCur[gi(gcx, gcy)];
          var glow = (hv - 12) / 10;
          if (glow > 0) {
            if (glow > 1) glow = 1;
            var px2 = gcx * cellW;
            var py2 = WATER_TOP + gcy * cellH + hv * 0.3;
            ctx.beginPath();
            ctx.arc(px2, py2, 0.6 + glow * 1.1, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(243, 239, 228, " + (glow * 0.4) + ")";
            ctx.fill();
          }
        }
      }

      /* Ambient mist over the whole scene */
      mist.forEach(function (p) {
        p.life += 0.4;
        if (p.life > p.maxLife) {
          p.life = 0;
          p.x = Math.random() * SRC_W;
          p.y = Math.random() * SRC_H;
        }
        var opacity = Math.sin((p.life / p.maxLife) * Math.PI) * 0.13;
        var n = noise.simplex3(p.x * 0.004, p.y * 0.004, Date.now() * 0.00006);
        var angle = n * Math.PI * 2;
        p.x += Math.cos(angle) * 0.4;
        p.y += Math.sin(angle) * 0.4 - 0.06;
        if (p.x < 0) p.x = SRC_W;
        if (p.x > SRC_W) p.x = 0;
        if (p.y < 0) p.y = SRC_H;
        if (p.y > SRC_H) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(243, 239, 228, " + opacity + ")";
        ctx.fill();
      });

      requestAnimationFrame(animate);
    }
    animate();
  })();

  /* ------------------------------------------------------------------ */
  /* Hero wireframe wave: gentle looping drift (skipped if reduced motion)*/
  /* ------------------------------------------------------------------ */
  if (hasGSAP && !prefersReducedMotion) {
    gsap.to(".hero-bridge-lamp-glow", { opacity: 0.4, scale: 1.3, duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 50%" });

    gsap.fromTo(".hero-boat-distant", { x: -100 }, { x: 1700, duration: 85, ease: "none", repeat: -1, delay: 6 });

    gsap.to(".hero-moon, .hero-moon-glow", { opacity: 0.55, duration: 4, ease: "sine.inOut", yoyo: true, repeat: -1 });
    gsap.to(".hero-moon-shimmer path", {
      opacity: 0.1,
      duration: 1.8,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      stagger: { each: 0.25, from: "random" }
    });
    gsap.to(".hero-stars circle", {
      opacity: 0.15,
      duration: 2.2,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      stagger: { each: 0.3, from: "random" }
    });

    gsap.fromTo(".hero-boat", { x: -140 }, { x: 1560, duration: 60, ease: "none", repeat: -1 });

    gsap.to(".hero-gull--1", { x: 240, y: -16, duration: 13, ease: "sine.inOut", yoyo: true, repeat: -1 });
    gsap.to(".hero-gull--2", { x: -220, y: 14, duration: 17, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.2 });
    gsap.to(".hero-gull--3", { x: 160, y: -10, duration: 10, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 0.6 });

    gsap.to(".product-art", {
      y: -18,
      ease: "none",
      scrollTrigger: {
        trigger: "#towel",
        start: "top bottom",
        end: "bottom top",
        scrub: 0.6
      }
    });

    var heroFar = document.querySelector(".hero-layer-far");
    var heroNear = document.querySelector(".hero-layer-near");
    var heroWaterCanvas = document.getElementById("heroWaterCanvas");
    var heroSection = document.querySelector(".hero");
    if (heroFar && heroNear && heroSection && supportsFinePointer) {
      var farXTo = gsap.quickTo(heroFar, "x", { duration: 0.9, ease: "power3.out" });
      var farYTo = gsap.quickTo(heroFar, "y", { duration: 0.9, ease: "power3.out" });
      var nearXTo = gsap.quickTo(heroNear, "x", { duration: 0.7, ease: "power3.out" });
      var nearYTo = gsap.quickTo(heroNear, "y", { duration: 0.7, ease: "power3.out" });
      var waterXTo = heroWaterCanvas ? gsap.quickTo(heroWaterCanvas, "x", { duration: 0.8, ease: "power3.out" }) : null;
      var waterYTo = heroWaterCanvas ? gsap.quickTo(heroWaterCanvas, "y", { duration: 0.8, ease: "power3.out" }) : null;
      heroSection.addEventListener("mousemove", function (e) {
        var r = heroSection.getBoundingClientRect();
        var relX = (e.clientX - r.left) / r.width - 0.5;
        var relY = (e.clientY - r.top) / r.height - 0.5;
        farXTo(relX * 10);
        farYTo(relY * 6);
        nearXTo(relX * 28);
        nearYTo(relY * 18);
        if (waterXTo) { waterXTo(relX * 18); waterYTo(relY * 12); }
      });
      heroSection.addEventListener("mouseleave", function () {
        farXTo(0);
        farYTo(0);
        nearXTo(0);
        nearYTo(0);
        if (waterXTo) { waterXTo(0); waterYTo(0); }
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Spotlight glow on cards/form — tracks cursor position via CSS vars  */
  /* ------------------------------------------------------------------ */
  if (supportsFinePointer && !prefersReducedMotion) {
    var spotlightEls = document.querySelectorAll(".service-card, .stat-card, .quote-form");
    spotlightEls.forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--spot-x", (e.clientX - r.left) + "px");
        el.style.setProperty("--spot-y", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Magnetic pull on large buttons                                      */
  /* ------------------------------------------------------------------ */
  if (supportsFinePointer && !prefersReducedMotion) {
    document.querySelectorAll(".btn--large").forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2;
        var y = e.clientY - r.top - r.height / 2;
        btn.style.transform = "translate(" + (x * 0.22) + "px, " + (y * 0.22 - 2) + "px)";
      });
      btn.addEventListener("mouseleave", function () {
        btn.style.transform = "";
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Stat count-up on scroll into view                                   */
  /* ------------------------------------------------------------------ */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count-to") || "0");
    var prefix = el.getAttribute("data-count-prefix") || "";
    if (prefersReducedMotion) {
      el.textContent = prefix + target;
      return;
    }
    var obj = { val: 0 };
    if (hasGSAP) {
      gsap.to(obj, {
        val: target,
        duration: 1.4,
        ease: "power2.out",
        onUpdate: function () { el.textContent = prefix + Math.round(obj.val); }
      });
    } else {
      el.textContent = prefix + target;
    }
  }

  var statEls = document.querySelectorAll(".stat-number");
  if (statEls.length) {
    if ("IntersectionObserver" in window) {
      var statIO = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCount(entry.target);
              statIO.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.6 }
      );
      statEls.forEach(function (el) { statIO.observe(el); });
    } else {
      statEls.forEach(animateCount);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Setup-note visibility: only show when placeholders are unreplaced   */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll("[data-setup-note]").forEach(function (el) {
    el.style.display = "none";
  });

  /* ------------------------------------------------------------------ */
  /* mailto links: also copy the address, since a mailto: click does     */
  /* nothing visible on a device with no default mail client set up.     */
  /* ------------------------------------------------------------------ */
  document.querySelectorAll('a[href^="mailto:"]').forEach(function (link) {
    link.addEventListener("click", function () {
      var address = link.getAttribute("href").replace("mailto:", "").split("?")[0];
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(address).then(function () {
        var original = link.textContent;
        link.textContent = "Copied " + address;
        setTimeout(function () { link.textContent = original; }, 1800);
      }).catch(function () {});
    });
  });

  var buyBtn = document.getElementById("buyTowelBtn");
  if (buyBtn) {
    var stripeLink = buyBtn.getAttribute("data-stripe-link") || "";
    var stripeConfigured = stripeLink && stripeLink.indexOf("REPLACE_WITH") === -1;

    if (stripeConfigured) {
      buyBtn.setAttribute("href", stripeLink);
      buyBtn.setAttribute("target", "_blank");
      buyBtn.setAttribute("rel", "noopener");
    } else {
      var buyNote = buyBtn.closest(".product-actions") ? buyBtn.closest(".product-actions").parentElement.querySelector("[data-setup-note]") : null;
      if (buyNote) buyNote.style.display = "block";
      buyBtn.addEventListener("click", function (e) {
        e.preventDefault();
        if (buyNote) buyNote.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Custom cursor glow — fine-pointer devices only, additive            */
  /* ------------------------------------------------------------------ */
  var cursorGlow = document.getElementById("cursorGlow");

  if (cursorGlow && supportsFinePointer && !prefersReducedMotion) {
    var targetX = 0, targetY = 0, currentX = 0, currentY = 0;
    var hasMoved = false;

    document.addEventListener("mousemove", function (e) {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!hasMoved) {
        hasMoved = true;
        currentX = targetX;
        currentY = targetY;
        cursorGlow.classList.add("is-visible");
      }
    });

    document.addEventListener("mouseleave", function () {
      cursorGlow.classList.remove("is-visible");
    });
    document.addEventListener("mouseenter", function () {
      if (hasMoved) cursorGlow.classList.add("is-visible");
    });

    function tick() {
      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;
      cursorGlow.style.transform = "translate3d(" + currentX + "px, " + currentY + "px, 0)";
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    var interactiveSelector = "a, button, .service-card, .stat-card, input, textarea, select";
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest(interactiveSelector)) cursorGlow.classList.add("is-active");
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest(interactiveSelector)) cursorGlow.classList.remove("is-active");
    });

    var towelSection = document.getElementById("towel");
    if (towelSection && "IntersectionObserver" in window) {
      var tulipSwapTimer = null;
      var towelIO = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            var shouldBeTulip = entry.isIntersecting;
            clearTimeout(tulipSwapTimer);
            tulipSwapTimer = setTimeout(function () {
              cursorGlow.classList.toggle("is-tulip", shouldBeTulip);
            }, 220);
          });
        },
        { threshold: 0.35 }
      );
      towelIO.observe(towelSection);
    }

    var productArt = document.querySelector(".product-art");
    if (productArt) {
      productArt.addEventListener("mouseenter", function () { cursorGlow.classList.add("is-shop"); });
      productArt.addEventListener("mouseleave", function () { cursorGlow.classList.remove("is-shop"); });
    }
  }

  var quoteForm = document.getElementById("quoteForm");
  if (quoteForm) {
    var formAction = quoteForm.getAttribute("action") || "";
    var formConfigured = formAction.indexOf("REPLACE_WITH") === -1;
    var formNote = quoteForm.querySelector("[data-setup-note]");
    var formStatus = document.getElementById("formStatus");
    var submitBtn = document.getElementById("quoteSubmitBtn");

    if (!formConfigured) {
      if (formNote) formNote.style.display = "block";
      quoteForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (formStatus) {
          formStatus.textContent = "This form isn't connected yet. See the README for one-time setup, or email us directly.";
        }
      });
    } else {
      quoteForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (submitBtn) submitBtn.setAttribute("disabled", "true");
        if (formStatus) formStatus.textContent = "Sending…";

        fetch(formAction, {
          method: "POST",
          body: new FormData(quoteForm),
          headers: { Accept: "application/json" }
        })
          .then(function (res) {
            if (res.ok) {
              if (formStatus) formStatus.textContent = "Thanks. We’ll follow up by email within one business day.";
              quoteForm.reset();
            } else {
              if (formStatus) formStatus.textContent = "Something went wrong. Please email us directly at beachfrontprintco@gmail.com.";
            }
          })
          .catch(function () {
            if (formStatus) formStatus.textContent = "Something went wrong. Please email us directly at beachfrontprintco@gmail.com.";
          })
          .finally(function () {
            if (submitBtn) submitBtn.removeAttribute("disabled");
          });
      });
    }
  }
})();
