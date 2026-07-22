/* ==========================================================================
   Раздолье — поздравление Андрею Грибкову
   Логика мини-игры: HTML5 / CSS3 / vanilla JS
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * 1. Данные: последовательность фраз (порядок менять нельзя)
   * ------------------------------------------------------------------ */
  var PHRASES = [
    "Андрей Грибков",
    "Основатель и вдохновитель",
    "Генератор идей",
    "Мотиватор и искуситель",
    "Позитив и вечный двигатель",
    "Лучший руководитель",
    "Всегда знает, как должно быть",
    "Находит выход из любой ситуации",
    "Настоящий лидер",
    "С днём рождения, Андрей Александрович Грибков!"
  ];

  var TOTAL = PHRASES.length;

  // Направления появления фразы — чередуются, чтобы каждое нажатие
  // ощущалось немного иначе (сверху / снизу / слева / справа / по центру).
  var DIRECTIONS = ["top", "right", "bottom", "left", "top", "right", "bottom", "left", "top", "bottom"];

  // Время блокировки повторного нажатия во время анимации смены фразы (мс)
  var LOCK_MS = 550;

  /* ------------------------------------------------------------------ *
   * 2. Состояние игры
   * ------------------------------------------------------------------ */
  var state = {
    step: 0,          // сколько фраз уже показано (0..TOTAL)
    isAnimating: false,
    isFinished: false,
    lastActionTime: 0
  };

  /* ------------------------------------------------------------------ *
   * 3. Ссылки на DOM-элементы
   * ------------------------------------------------------------------ */
  var els = {
    title: document.getElementById("mainTitle"),
    hint: document.getElementById("hintText"),
    phraseText: document.getElementById("phraseText"),
    logo: document.getElementById("logoBtn"),
    logoFallback: document.getElementById("logoFallback"),
    logoGlow: document.getElementById("logoGlow"),
    progressWrap: document.getElementById("progressWrap"),
    progressFill: document.getElementById("progressFill"),
    progressLabel: document.getElementById("progressLabel"),
    finale: document.getElementById("finaleScreen"),
    restartBtn: document.getElementById("restartBtn")
  };

  /* ------------------------------------------------------------------ *
   * 4. Интеграция с Telegram Web Apps SDK (безопасно вне Telegram)
   * ------------------------------------------------------------------ */
  var tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

  function initTelegram() {
    if (!tg) return; // работаем как обычная веб-страница, если Telegram недоступен
    try {
      tg.ready();
      tg.expand();
      // Мягко подстраиваемся под тему Telegram, не теряя фирменный стиль:
      // используем цвет темы только для системной шапки, а не для контента.
      if (tg.setHeaderColor) {
        try { tg.setHeaderColor("#040c1f"); } catch (e) { /* некоторые версии клиента не поддерживают конкретный цвет */ }
      }
      if (tg.setBackgroundColor) {
        try { tg.setBackgroundColor("#040c1f"); } catch (e) { /* игнорируем, если недоступно */ }
      }
      tg.disableVerticalSwipes && tg.disableVerticalSwipes();
    } catch (err) {
      // Не даём ошибке SDK сломать игру
      console.warn("Telegram WebApp init warning:", err);
    }
  }

  function hapticImpact() {
    // Приоритет — нативный Haptic Feedback Telegram
    if (tg && tg.HapticFeedback && tg.HapticFeedback.impactOccurred) {
      try {
        tg.HapticFeedback.impactOccurred("light");
        return;
      } catch (e) { /* переходим к запасному варианту */ }
    }
    // Запасной вариант — обычная вибрация браузера
    if (window.navigator && typeof window.navigator.vibrate === "function") {
      try { window.navigator.vibrate(30); } catch (e) { /* устройство не поддерживает */ }
    }
  }

  /* ------------------------------------------------------------------ *
   * 5. Обработка отсутствия изображения логотипа
   * ------------------------------------------------------------------ */
  function setupLogoFallback() {
    els.logo.addEventListener("error", function () {
      els.logo.hidden = true;
      els.logoFallback.hidden = false;
      activeLogoEl = els.logoFallback;
    });
  }

  var activeLogoEl = els.logo;

  /* ------------------------------------------------------------------ *
   * 6. Показ фразы с анимацией направления и подсветкой
   * ------------------------------------------------------------------ */
  function showPhrase(index) {
    var text = PHRASES[index];
    var dir = DIRECTIONS[index % DIRECTIONS.length];

    // Убираем предыдущие классы анимации
    els.phraseText.classList.remove(
      "is-in", "is-out", "is-highlight",
      "dir-top", "dir-bottom", "dir-left", "dir-right"
    );

    // Плавное исчезновение предыдущей фразы
    if (els.phraseText.textContent) {
      els.phraseText.classList.add("is-out");
    }

    window.setTimeout(function () {
      els.phraseText.textContent = text;
      els.phraseText.classList.remove("is-out");
      els.phraseText.classList.add("dir-" + dir, "is-in");

      // Небольшая подсветка после появления
      window.setTimeout(function () {
        els.phraseText.classList.add("is-highlight");
      }, 480);
    }, els.phraseText.textContent ? 220 : 0);
  }

  /* ------------------------------------------------------------------ *
   * 7. Обновление прогресса
   * ------------------------------------------------------------------ */
  function updateProgress(step) {
    var pct = Math.round((step / TOTAL) * 100);
    els.progressFill.style.width = pct + "%";
    els.progressLabel.textContent = step + " из " + TOTAL;
  }

  /* ------------------------------------------------------------------ *
   * 8. Эффект нажатия на логотип: сжатие, свечение, круги, искры
   * ------------------------------------------------------------------ */
  function pressLogoVisual() {
    activeLogoEl.classList.add("is-pressed");
    window.setTimeout(function () {
      activeLogoEl.classList.remove("is-pressed");
    }, 180);

    els.logoGlow.classList.add("is-active");
    window.setTimeout(function () {
      if (!state.isFinished) {
        els.logoGlow.classList.remove("is-active");
      }
    }, 500);
  }

  function spawnRipple(x, y) {
    var wrap = activeLogoEl.parentElement;
    var rect = wrap.getBoundingClientRect();
    var ripple = document.createElement("span");
    ripple.className = "ripple";

    var size = Math.max(rect.width, rect.height) * 0.9;
    ripple.style.width = size + "px";
    ripple.style.height = size + "px";
    ripple.style.left = (x - rect.left) + "px";
    ripple.style.top = (y - rect.top) + "px";

    wrap.appendChild(ripple);
    window.setTimeout(function () {
      ripple.remove();
    }, 750);
  }

  /* ------------------------------------------------------------------ *
   * 9. Основной обработчик нажатия на логотип
   * ------------------------------------------------------------------ */
  function handleLogoActivate(clientX, clientY) {
    var now = Date.now();

    // Блокировка: игра завершена, идёт анимация, либо нажатия происходят
    // слишком часто (двойное срабатывание click/touch/pointer)
    if (state.isFinished) return;
    if (state.isAnimating) return;
    if (now - state.lastActionTime < 120) return;

    state.lastActionTime = now;
    state.isAnimating = true;

    pressLogoVisual();
    if (typeof clientX === "number") {
      spawnRipple(clientX, clientY);
    }
    hapticImpact();

    state.step += 1;
    updateProgress(state.step);
    showPhrase(state.step - 1);

    // Заголовок и подсказка мягко скрываются после первого нажатия
    if (state.step === 1) {
      els.title.style.opacity = "0";
      els.hint.style.opacity = "0.4";
    }

    if (state.step >= TOTAL) {
      state.isFinished = true;
      window.setTimeout(triggerFinale, 650);
    }

    window.setTimeout(function () {
      state.isAnimating = false;
    }, LOCK_MS);
  }

  /* ------------------------------------------------------------------ *
   * 10. Финальная сцена
   * ------------------------------------------------------------------ */
  function triggerFinale() {
    els.logoGlow.classList.add("is-final");
    els.finale.hidden = false;
    els.progressWrap.setAttribute("aria-hidden", "true");
    els.hint.style.opacity = "0";

    launchConfetti();

    // Дополнительный отклик Telegram по завершении (мягкий, не навязчивый)
    if (tg && tg.HapticFeedback && tg.HapticFeedback.notificationOccurred) {
      try { tg.HapticFeedback.notificationOccurred("success"); } catch (e) { /* игнорируем */ }
    }

    els.restartBtn.focus();
  }

  /* ------------------------------------------------------------------ *
   * 11. Сброс игры к начальному состоянию (без перезагрузки страницы)
   * ------------------------------------------------------------------ */
  function resetGame() {
    state.step = 0;
    state.isAnimating = false;
    state.isFinished = false;
    state.lastActionTime = 0;

    updateProgress(0);
    els.phraseText.textContent = "";
    els.phraseText.className = "phrase";

    els.title.style.opacity = "0.92";
    els.hint.style.opacity = "0.75";

    els.logoGlow.classList.remove("is-active", "is-final");
    els.finale.hidden = true;
    els.progressWrap.setAttribute("aria-hidden", "false");

    stopConfetti();
  }

  /* ------------------------------------------------------------------ *
   * 12. Ввод: мышь, касание, указатель и клавиатура — без двойных срабатываний
   * ------------------------------------------------------------------ */
  function setupInputHandlers() {
    [els.logo, els.logoFallback].forEach(function (el) {
      // pointerup покрывает мышь, перо и touch в современных браузерах —
      // используем его как основной источник событий.
      el.addEventListener("pointerup", function (e) {
        handleLogoActivate(e.clientX, e.clientY);
      });

      // preventDefault на touchend не даём браузеру сгенерировать
      // "призрачный" клик вслед за pointerup/touch.
      el.addEventListener("touchend", function (e) {
        e.preventDefault();
      }, { passive: false });

      // Клавиатура: Enter и Space активируют логотип как кнопку
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          var rect = el.getBoundingClientRect();
          handleLogoActivate(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
      });

      // Запасной вариант для очень старых браузеров без Pointer Events
      if (!window.PointerEvent) {
        el.addEventListener("click", function (e) {
          handleLogoActivate(e.clientX, e.clientY);
        });
      }

      // Отключаем контекстное меню при долгом нажатии на мобильных
      el.addEventListener("contextmenu", function (e) {
        e.preventDefault();
      });
    });

    els.restartBtn.addEventListener("click", resetGame);
  }

  /* ------------------------------------------------------------------ *
   * 13. Фоновые частицы (лёгкая атмосфера)
   * ------------------------------------------------------------------ */
  var bgCanvas = document.getElementById("bg-particles");
  var bgCtx = bgCanvas.getContext("2d");
  var bgParticles = [];
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resizeCanvas(canvas) {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function initBgParticles() {
    resizeCanvas(bgCanvas);
    var count = reducedMotion ? 0 : Math.min(40, Math.floor(window.innerWidth / 22));
    bgParticles = [];
    for (var i = 0; i < count; i++) {
      bgParticles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 0.6 + Math.random() * 1.6,
        speed: 0.06 + Math.random() * 0.18,
        drift: (Math.random() - 0.5) * 0.12,
        alpha: 0.15 + Math.random() * 0.35
      });
    }
  }

  function drawBgParticles() {
    bgCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (var i = 0; i < bgParticles.length; i++) {
      var p = bgParticles[i];
      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      bgCtx.fillStyle = "rgba(188, 214, 255, " + p.alpha + ")";
      bgCtx.fill();

      p.y -= p.speed;
      p.x += p.drift;
      if (p.y < -10) {
        p.y = window.innerHeight + 10;
        p.x = Math.random() * window.innerWidth;
      }
    }
    requestAnimationFrame(drawBgParticles);
  }

  /* ------------------------------------------------------------------ *
   * 14. Лёгкое конфетти на канвасе (без внешних зависимостей)
   * ------------------------------------------------------------------ */
  var confettiCanvas = document.getElementById("confetti-canvas");
  var confettiCtx = confettiCanvas.getContext("2d");
  var confettiParticles = [];
  var confettiRAF = null;
  var CONFETTI_COLORS = ["#2f6fe0", "#bcd6ff", "#d8b169", "#f0d9a6", "#ffffff"];

  function launchConfetti() {
    resizeCanvas(confettiCanvas);
    var burstCount = reducedMotion ? 0 : 140; // ограниченное количество частиц

    confettiParticles = [];
    for (var i = 0; i < burstCount; i++) {
      confettiParticles.push(makeConfettiParticle());
    }

    if (!confettiRAF && confettiParticles.length) {
      confettiRAF = requestAnimationFrame(updateConfetti);
    }
  }

  function makeConfettiParticle() {
    var w = window.innerWidth;
    return {
      x: w / 2 + (Math.random() - 0.5) * w * 0.6,
      y: window.innerHeight * 0.32 + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 5.5,
      vy: -(3 + Math.random() * 5.5),
      gravity: 0.13 + Math.random() * 0.05,
      size: 5 + Math.random() * 6,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      life: 0,
      maxLife: 130 + Math.random() * 60
    };
  }

  function updateConfetti() {
    confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    var alive = false;
    for (var i = 0; i < confettiParticles.length; i++) {
      var p = confettiParticles[i];
      if (p.life > p.maxLife) continue;

      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.life += 1;

      var fade = 1 - Math.max(0, (p.life - p.maxLife * 0.7) / (p.maxLife * 0.3));

      confettiCtx.save();
      confettiCtx.globalAlpha = Math.max(0, Math.min(1, fade));
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate(p.rotation);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      confettiCtx.restore();

      if (p.y < window.innerHeight + 40 && p.life <= p.maxLife) alive = true;
    }

    if (alive) {
      confettiRAF = requestAnimationFrame(updateConfetti);
    } else {
      confettiRAF = null;
      confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  function stopConfetti() {
    confettiParticles = [];
    if (confettiRAF) {
      cancelAnimationFrame(confettiRAF);
      confettiRAF = null;
    }
    confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }

  /* ------------------------------------------------------------------ *
   * 15. Инициализация приложения
   * ------------------------------------------------------------------ */
  function init() {
    initTelegram();
    setupLogoFallback();
    setupInputHandlers();
    updateProgress(0);

    initBgParticles();
    if (!reducedMotion) {
      requestAnimationFrame(drawBgParticles);
    }

    window.addEventListener("resize", function () {
      resizeCanvas(bgCanvas);
      resizeCanvas(confettiCanvas);
      initBgParticles();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
