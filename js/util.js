/* ==========================================================================
   util.js — small DOM / format helpers shared by every view
   ========================================================================== */
(function (window) {
  "use strict";

  const OGG = (window.OGG = window.OGG || {});

  /** Escape text for safe interpolation into HTML. */
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /** Inline SVG sprite reference. */
  function icon(name, cls) {
    return `<svg class="${cls || ""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
  }

  /** Number with thousands separators. */
  function num(value) {
    const n = Number(value) || 0;
    return n.toLocaleString("ko-KR");
  }

  function pct(value, digits) {
    const n = Number(value) || 0;
    return `${(n * 100).toFixed(digits == null ? 0 : digits)}%`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /** "3분 전" style relative time from an ISO string. */
  function timeAgo(iso, now) {
    const then = new Date(iso).getTime();
    if (!Number.isFinite(then)) return "";
    const base = now ? new Date(now).getTime() : Date.now();
    const diff = Math.max(0, base - then);
    const minute = 60000;
    const hour = minute * 60;
    const day = hour * 24;
    if (diff < minute) return "방금 전";
    if (diff < hour) return `${Math.floor(diff / minute)}분 전`;
    if (diff < day) return `${Math.floor(diff / hour)}시간 전`;
    if (diff < day * 7) return `${Math.floor(diff / day)}일 전`;
    const d = new Date(then);
    return `${d.getMonth() + 1}.${d.getDate()}`;
  }

  function formatDate(iso, withTime) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const base = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    if (!withTime) return base;
    return `${base} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  /** Days between two dates (b - a), rounded down. */
  function dayDiff(a, b) {
    const ms = new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0);
    return Math.round(ms / 86400000);
  }

  /* ---------- storage (localStorage with graceful failure) ---------- */
  const memStore = {};
  function storeGet(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      return key in memStore ? memStore[key] : fallback;
    }
  }
  function storeSet(key, value) {
    memStore[key] = value;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }
  function storeRemove(key) {
    delete memStore[key];
    try {
      window.localStorage.removeItem(key);
    } catch (err) {
      /* ignore */
    }
  }

  /* ---------- toast ---------- */
  function toast(message, iconName) {
    const wrap = document.getElementById("toastWrap");
    if (!wrap) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `${icon(iconName || "check")}<span>${esc(message)}</span>`;
    wrap.appendChild(el);
    window.setTimeout(() => {
      el.classList.add("is-out");
      window.setTimeout(() => el.remove(), 260);
    }, 2400);
  }

  /* ---------- clipboard ---------- */
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(
        () => true,
        () => legacyCopy(text)
      );
    }
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch (err) {
      return false;
    }
  }

  function debounce(fn, wait) {
    let timer = 0;
    return function debounced() {
      const args = arguments;
      const self = this;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn.apply(self, args), wait || 180);
    };
  }

  /** Confidence badge (공식 / 보도 / 추정). */
  function confBadge(level) {
    const map = {
      official: ["conf-official", "공식 확인"],
      press: ["conf-press", "공식 발표 보도"],
      estimate: ["conf-estimate", "추정치"]
    };
    const entry = map[level] || map.estimate;
    return `<span class="conf ${entry[0]}">${entry[1]}</span>`;
  }

  /** Delegate helper. */
  function on(root, eventName, selector, handler) {
    root.addEventListener(eventName, function (event) {
      const target = event.target.closest(selector);
      if (target && root.contains(target)) handler(event, target);
    });
  }

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }
  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  OGG.util = {
    esc,
    icon,
    num,
    pct,
    clamp,
    timeAgo,
    formatDate,
    dayDiff,
    storeGet,
    storeSet,
    storeRemove,
    toast,
    copyText,
    debounce,
    confBadge,
    on,
    qs,
    qsa
  };
})(window);
