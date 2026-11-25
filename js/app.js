/* ==========================================================================
   app.js — 해시 라우터, 헤더/모달/광고 토글, 전역 검색
   ========================================================================== */
(function (window) {
  "use strict";

  const OGG = (window.OGG = window.OGG || {});
  const U = OGG.util;

  const ROUTES = {
    home: { view: "home", title: "템빨: 오버기어드 정보 · 오버기어드 시뮬레이터 | over.gg" },
    weapons: { view: "weapons", title: "무기·클래스 가이드 — 지팡이·대검·활·바이블 | over.gg" },
    simulator: { view: "simulator", title: "오버기어드·오버클럭 시뮬레이터 | over.gg" },
    board: { view: "board", title: "공략·파티 모집 보드 | over.gg" },
    patches: { view: "patches", title: "패치·업데이트 로드맵 | over.gg" }
  };

  let currentRoute = null;
  let currentView = null;
  let data = null;

  /* ------------------------------------------------------------- routing */
  function parseHash() {
    const raw = (window.location.hash || "#/home").replace(/^#\/?/, "");
    const [pathPart, queryPart] = raw.split("?");
    const name = (pathPart || "home").split("/")[0];
    return {
      name: ROUTES[name] ? name : "home",
      params: new URLSearchParams(queryPart || "")
    };
  }

  function setNav(name) {
    U.qsa("[data-route]").forEach((link) => {
      const on = link.getAttribute("data-route") === name;
      if (on) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function renderRoute(scroll) {
    const { name, params } = parseHash();
    const route = ROUTES[name];
    const app = document.getElementById("app");
    if (!app || !data) return;

    if (currentView && OGG.views[currentView] && typeof OGG.views[currentView].unmount === "function") {
      OGG.views[currentView].unmount();
    }

    const view = OGG.views[route.view];
    if (!view) {
      app.innerHTML = `<div class="empty">${U.icon("alert")}<b>페이지를 찾을 수 없습니다</b><a class="btn btn-primary btn-sm" href="#/home">홈으로</a></div>`;
      return;
    }

    app.innerHTML = view.render(data, params);
    if (typeof view.mount === "function") view.mount(app, data);

    document.title = route.title;
    setNav(name);
    currentRoute = name;
    currentView = route.view;

    document.body.dataset.route = name;
    if (scroll) window.scrollTo({ top: 0, behavior: "auto" });
  }

  function onHashChange() {
    const { name } = parseHash();
    const routeChanged = name !== currentRoute;
    renderRoute(routeChanged);
  }

  /* ------------------------------------------------------------ drawers */
  function initDrawer() {
    const toggle = document.getElementById("menuToggle");
    const drawer = document.getElementById("drawer");
    if (!toggle || !drawer) return;
    toggle.addEventListener("click", function () {
      const open = drawer.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.innerHTML = U.icon(open ? "x" : "menu");
    });
    drawer.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        drawer.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.innerHTML = U.icon("menu");
      }
    });
  }

  /* ------------------------------------------------------------- modals */
  function openModal(el) {
    if (!el) return;
    el.classList.add("is-open");
    document.body.style.overflow = "hidden";
    const focusable = el.querySelector("input, button");
    if (focusable) window.setTimeout(() => focusable.focus(), 40);
  }
  function closeModal(el) {
    if (!el) return;
    el.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function initLegal() {
    const modal = document.getElementById("legalModal");
    if (!modal) return;
    const title = document.getElementById("legalTitle");
    const body = document.getElementById("legalBody");

    U.on(document, "click", "[data-open-legal]", function (event, el) {
      const key = el.getAttribute("data-open-legal");
      const doc = OGG.legal[key];
      if (!doc) return;
      title.textContent = doc.title;
      body.innerHTML = doc.body;
      openModal(modal);
    });
    U.on(modal, "click", "[data-close-legal]", () => closeModal(modal));
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal(modal);
    });
  }

  /* ------------------------------------------------------------- search */
  function buildSearchIndex() {
    const items = [];
    data.weapons.forEach((w) => {
      items.push({
        type: "무기",
        title: `${w.name} — ${w.role}`,
        desc: w.tagline,
        href: `#/weapons?w=${w.id}`,
        icon: w.icon
      });
    });
    data.systems.forEach((s) => {
      items.push({ type: "시스템", title: s.name, desc: s.summary, href: "#/patches", icon: "book" });
    });
    data.roadmap.forEach((r) => {
      items.push({ type: "로드맵", title: r.label, desc: r.items.join(" · "), href: "#/patches", icon: "calendar" });
    });
    data.patches.forEach((p) => {
      items.push({ type: "패치", title: `v${p.version} ${p.title}`, desc: p.summary, href: "#/patches", icon: "scroll" });
    });
    data.faq.forEach((f) => {
      items.push({ type: "FAQ", title: f.q, desc: f.a, href: "#/patches", icon: "info" });
    });
    data.boardSeed.forEach((p) => {
      items.push({
        type: "게시글",
        title: p.title,
        desc: `${p.author} · ${(p.tags || []).join(", ")}`,
        href: `#/board?post=${encodeURIComponent(p.id)}`,
        icon: "board"
      });
    });
    return items;
  }

  function initSearch() {
    const modal = document.getElementById("searchModal");
    const input = document.getElementById("globalSearch");
    const results = document.getElementById("globalResults");
    if (!modal || !input || !results) return;
    const index = buildSearchIndex();

    function search(q) {
      const query = q.trim().toLowerCase();
      if (!query) {
        results.innerHTML = `
          <p class="tiny dim">무기·시스템·패치·게시글을 한 번에 찾습니다.</p>
          <div class="row-wrap" style="gap:6px">
            ${["오버클럭", "파브라늄", "바이블", "시그니처", "인마대전"].map((k) => `<button class="chip" type="button" data-kw="${k}">${k}</button>`).join("")}
          </div>`;
        return;
      }
      const hits = index
        .filter((item) => `${item.title} ${item.desc} ${item.type}`.toLowerCase().includes(query))
        .slice(0, 8);
      results.innerHTML = hits.length
        ? hits
            .map(
              (h) => `
          <a class="tool-card" href="${h.href}" style="padding:13px;gap:6px" data-search-hit>
            <div class="row" style="gap:9px">
              <span class="icon-tile is-sm">${U.icon(h.icon || "search")}</span>
              <div style="min-width:0">
                <div class="tiny" style="color:var(--gold)">${U.esc(h.type)}</div>
                <div style="font-size:13px;font-weight:700">${U.esc(h.title)}</div>
              </div>
            </div>
            <p class="tiny dim" style="margin:0">${U.esc(String(h.desc || "").slice(0, 90))}</p>
          </a>`
            )
            .join("")
        : `<div class="empty" style="padding:26px">${U.icon("search")}<b>결과가 없습니다</b><span>다른 키워드로 검색해 보세요.</span></div>`;
    }

    U.on(document, "click", "[data-open-search]", function () {
      openModal(modal);
      input.value = "";
      search("");
    });
    U.on(modal, "click", "[data-close-search]", () => closeModal(modal));
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal(modal);
    });
    input.addEventListener("input", () => search(input.value));
    U.on(modal, "click", "[data-kw]", function (event, el) {
      input.value = el.getAttribute("data-kw");
      search(input.value);
      input.focus();
    });
    U.on(modal, "click", "[data-search-hit]", function () {
      closeModal(modal);
    });
    document.addEventListener("keydown", function (event) {
      const tag = (event.target.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || event.target.isContentEditable;
      if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        openModal(modal);
        input.focus();
      } else if (event.key === "/" && !typing) {
        event.preventDefault();
        openModal(modal);
        input.focus();
      } else if (event.key === "Escape") {
        closeModal(modal);
        closeModal(document.getElementById("legalModal"));
      }
    });
  }

  /* --------------------------------------------------------------- ads */
  function initAds() {
    const toggle = document.getElementById("adsToggle");
    /* 광고 영역은 기본으로 숨김 — 주소에 ?ads=1을 붙였을 때만 확인용으로 표시됩니다. */
    const on = /[?&]ads=1/.test(window.location.search + window.location.hash);
    if (on) document.body.classList.add("ads-on");
    if (toggle) {
      toggle.checked = !!on;
      toggle.addEventListener("change", function () {
        document.body.classList.toggle("ads-on", toggle.checked);
        U.storeSet("ogg.ads.on", toggle.checked);
        OGG.mountAds();
        U.toast(toggle.checked ? "광고 영역 플레이스홀더를 표시합니다" : "광고 영역을 숨겼습니다", "info");
      });
    }
    OGG.mountAds();
  }

  /* -------------------------------------------------------------- boot */
  function boot() {
    initDrawer();
    initLegal();
    initAds();

    const topAd = document.getElementById("topAd");
    if (topAd) {
      topAd.innerHTML =
        OGG.adSlot("top", "상단 리더보드", { variant: "desktop" }) +
        OGG.adSlot("top", "상단 리더보드", { variant: "mobile" });
    }

    OGG.dataReady
      .then((loaded) => {
        data = loaded;
        initSearch();
        renderRoute(true);
        window.addEventListener("hashchange", onHashChange);
        if (OGG.dataSource === "fallback") {
          U.toast("저장된 사본으로 표시 중입니다", "info");
        }
      })
      .catch((err) => {
        const app = document.getElementById("app");
        if (!app) return;
        app.innerHTML = `
          <div class="empty" style="padding:60px 20px">
            ${U.icon("alert")}
            <b>게임 정보를 불러오지 못했습니다</b>
            <span>잠시 후 새로고침해 주세요. 계속 같은 화면이 나오면 문의 메일로 알려 주세요.</span>
            <a class="btn btn-primary btn-sm" href="mailto:dkahdekd@naver.com">문의하기</a>
          </div>`;
      });
  }

  OGG.app = { renderRoute, parseHash };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window);
