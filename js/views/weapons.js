/* ==========================================================================
   views/weapons.js — 무기·클래스 가이드 + 추천 세팅 빌더
   ========================================================================== */
(function (window) {
  "use strict";

  const OGG = (window.OGG = window.OGG || {});
  const U = OGG.util;
  const KEY = "ogg.weapons.v1";

  const ROLES = [
    { id: "all", label: "전체", icon: "filter-list" },
    { id: "melee", label: "근접", icon: "shield" },
    { id: "ranged", label: "원거리", icon: "bow" },
    { id: "control", label: "군중제어", icon: "spark" },
    { id: "support", label: "지원", icon: "heart" }
  ];

  const SORTS = [
    { id: "default", label: "기본 순서" },
    { id: "burst", label: "화력 높은 순" },
    { id: "survival", label: "생존력 높은 순" },
    { id: "control", label: "제어 높은 순" },
    { id: "support", label: "지원 높은 순" }
  ];

  let state = null;

  function initialState(data, params) {
    const saved = U.storeGet(KEY, {});
    const pick = (params && params.get && params.get("w")) || saved.selected || data.weapons[0].id;
    return {
      q: "",
      role: "all",
      sort: "default",
      selected: data.weapons.some((w) => w.id === pick) ? pick : data.weapons[0].id,
      goal: saved.goal && ["farm", "boss", "pvp", "party"].includes(saved.goal) ? saved.goal : "farm",
      savedBuilds: Array.isArray(saved.savedBuilds) ? saved.savedBuilds : []
    };
  }

  function persist() {
    U.storeSet(KEY, { selected: state.selected, goal: state.goal, savedBuilds: state.savedBuilds });
  }

  function matches(w, q) {
    if (!q) return true;
    const hay = [
      w.name,
      w.role,
      w.range,
      w.tagline,
      w.summary,
      ...(w.strengths || []),
      ...(w.cautions || []),
      ...(w.modTips || []),
      ...(w.godHand || [])
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function roleMatch(w, role) {
    switch (role) {
      case "melee":
        return w.range === "근접";
      case "ranged":
        return w.range !== "근접";
      case "control":
        return w.stats.control >= 70;
      case "support":
        return w.stats.support >= 70;
      default:
        return true;
    }
  }

  function filtered(data) {
    let pool = data.weapons;
    if (state.q) {
      /* 무기 이름과 직접 일치하는 항목을 우선한다(궁합 설명에 이름이 등장하는 경우 제외) */
      const byName = pool.filter((w) => w.name.includes(state.q));
      pool = byName.length ? byName : pool.filter((w) => matches(w, state.q));
    }
    let list = pool.filter((w) => roleMatch(w, state.role));
    if (state.sort !== "default") {
      list = list.slice().sort((a, b) => b.stats[state.sort] - a.stats[state.sort]);
    }
    return list;
  }

  function roleCounts(data) {
    const pool = state.q ? data.weapons.filter((w) => w.name.includes(state.q) || matches(w, state.q)) : data.weapons;
    return ROLES.reduce((acc, r) => {
      acc[r.id] = pool.filter((w) => roleMatch(w, r.id)).length;
      return acc;
    }, {});
  }

  function statRows(w) {
    const rows = [
      ["화력", w.stats.burst],
      ["지속력", w.stats.sustain],
      ["제어", w.stats.control],
      ["지원", w.stats.support],
      ["기동", w.stats.mobility],
      ["생존", w.stats.survival]
    ];
    return rows
      .map(
        ([label, value]) => `
      <div class="statbar">
        <span class="sl">${label}</span>
        <span class="bar ${value >= 80 ? "" : "is-soft"}"><i style="width:${value}%"></i></span>
        <span class="sv">${value}</span>
      </div>`
      )
      .join("");
  }

  function card(w) {
    const avg = Math.round((w.stats.burst + w.stats.control + w.stats.survival + w.stats.support) / 4);
    return `
      <button class="weapon-card ${w.id === state.selected ? "is-selected" : ""}" type="button" data-weapon="${w.id}" aria-pressed="${w.id === state.selected}">
        <div class="weapon-card-top">
          <span class="icon-tile">${U.icon(w.icon)}</span>
          <div style="min-width:0">
            <h3>${U.esc(w.name)}</h3>
            <div class="role">${U.esc(w.role)}</div>
          </div>
          <span class="spacer"></span>
          <span class="badge badge-ghost">${U.esc(w.range)}</span>
        </div>
        <p class="tagline">${U.esc(w.tagline)}</p>
        <div class="statbars">${statRows(w)}</div>
        <div class="weapon-foot">
          <span class="row" style="gap:6px">${U.confBadge(w.confidence)}</span>
          <span class="mono" style="color:var(--gold)">${avg}<span style="color:var(--text-4)">/100</span></span>
        </div>
      </button>`;
  }

  function classBlock(data, w) {
    const list = data.classes.filter((c) => c.weapon === w.id || c.weapon === "all");
    return list
      .map(
        (c) => `
      <div class="class-chip">
        <span class="cn">${U.esc(c.name)} ${c.id === "unknown" ? "" : U.confBadge(c.confidence)}</span>
        <span class="cr">${U.esc(c.role)}</span>
        <span class="cd">${U.esc(c.summary)}</span>
        <span class="cd" style="color:var(--text-2)">${U.esc(c.goodFor || "")}</span>
        <span class="weapon-tags" style="margin-top:4px">${(c.keywords || []).map((k) => `<span class="post-tag">#${U.esc(k)}</span>`).join("")}</span>
      </div>`
      )
      .join("");
  }

  function detail(data, w) {
    return `
      <div class="detail" id="weaponDetail">
        <div class="detail-head">
          <span class="icon-tile">${U.icon(w.icon)}</span>
          <div style="min-width:0;flex:1 1 260px">
            <div class="row-wrap" style="gap:8px;margin-bottom:6px">
              <span class="badge badge-soft-gold">${U.esc(w.role)}</span>
              ${U.confBadge(w.confidence)}
            </div>
            <h2>${U.esc(w.name)}</h2>
            <p class="sub">${U.esc(w.summary)}</p>
          </div>
          <a class="btn btn-primary btn-sm" href="#/simulator?slot=weapon">${U.icon("gauge")}이 계열로 시뮬</a>
        </div>

        <div class="notice">
          ${U.icon("info")}
          <span><b>공식 소개 요약</b> · ${U.esc(w.officialCue)} <span class="dim">(보도된 발표 내용을 요약했습니다)</span></span>
        </div>

        <div class="detail-cols">
          <div>
            <p class="subhead">전투 지표 <span class="dim" style="text-transform:none;letter-spacing:0">팬 평가 지수</span></p>
            <div class="statbars">${statRows(w)}</div>
            <p class="tiny dim" style="margin-top:8px">${U.confBadge("estimate")} 계열 간 상대 비교를 위한 자체 지표이며 공식 수치가 아닙니다.</p>
          </div>
          <div>
            <p class="subhead">강점</p>
            <ul class="bullet-list">${w.strengths.map((s) => `<li>${U.esc(s)}</li>`).join("")}</ul>
            <p class="subhead" style="margin-top:14px">주의할 점</p>
            <ul class="bullet-list is-warn">${w.cautions.map((s) => `<li>${U.esc(s)}</li>`).join("")}</ul>
          </div>
        </div>

        <div class="detail-cols">
          <div>
            <p class="subhead">파티 궁합</p>
            <div class="weapon-tags">${w.partyFit.map((p) => `<span class="badge badge-ghost">${U.esc(p)}</span>`).join("")}</div>
            <p class="subhead" style="margin-top:16px">무기 개조 방향</p>
            <ul class="bullet-list">${w.modTips.map((s) => `<li>${U.esc(s)}</li>`).join("")}</ul>
          </div>
          <div>
            <p class="subhead">갓 핸드 메모리</p>
            <ul class="bullet-list">${w.godHand.map((s) => `<li>${U.esc(s)}</li>`).join("")}</ul>
            <p class="subhead" style="margin-top:16px">추천 슬롯 순서</p>
            <div class="row-wrap" style="gap:6px">
              ${data.builds[w.id][state.goal].priority
                .map((p, i) => `<span class="badge badge-ghost"><span class="mono" style="color:var(--gold)">${i + 1}</span> ${U.esc(p)}</span>`)
                .join('<span class="dim tiny">→</span>')}
            </div>
          </div>
        </div>

        <div>
          <p class="subhead">클래스</p>
          <div class="class-grid">${classBlock(data, w)}</div>
          <p class="tiny dim" style="margin-top:8px">${U.esc(w.classNote)}</p>
        </div>
      </div>`;
  }

  function buildText(data, w, goal) {
    const b = data.builds[w.id][goal];
    return [
      `[${data.game.name}] ${w.name} · ${b.label} 추천 세팅`,
      `무기 개조: ${b.mod}`,
      `갓 핸드: 공격형 ${b.godHand.attack} / 방어형 ${b.godHand.defense} / 보조형 ${b.godHand.support}`,
      `오버기어드 우선순위: ${b.priority.join(" → ")}`,
      `오버클럭 운용: ${b.oc}`,
      `한 줄 팁: ${b.tip}`,
      `※ 팬 제작 추천이며 공식 세팅이 아닙니다. over.gg`
    ].join("\n");
  }

  function builder(data) {
    const w = OGG.index.weapons[state.selected];
    const b = data.builds[w.id][state.goal];
    const goals = [
      ["farm", "솔로 파밍"],
      ["boss", "보스·레이드"],
      ["pvp", "PvP"],
      ["party", "파티 지원"]
    ];
    return `
      <div class="builder" id="buildBuilder">
        <div class="builder-head">
          <h3>${U.icon("wand")}추천 세팅 빌더</h3>
          <span class="spacer"></span>
          <div class="segmented" role="group" aria-label="무기 계열 선택">
            ${data.weapons
              .map(
                (item) =>
                  `<button type="button" data-build-weapon="${item.id}" class="${item.id === w.id ? "is-active" : ""}">${U.esc(item.name)}</button>`
              )
              .join("")}
          </div>
        </div>
        <div class="builder-body">
          <div class="row-wrap" style="gap:10px">
            <span class="filter-label">목표</span>
            <div class="segmented" role="group" aria-label="플레이 목표 선택">
              ${goals
                .map(
                  ([id, label]) =>
                    `<button type="button" data-build-goal="${id}" class="${id === state.goal ? "is-active" : ""}">${label}</button>`
                )
                .join("")}
            </div>
          </div>

          <div class="build-result" id="buildResult">
            <div class="build-head">
              <span class="icon-tile is-sm">${U.icon(w.icon)}</span>
              <span class="bt">${U.esc(w.name)} · ${U.esc(b.label)}</span>
              <span class="badge badge-cyan">추천</span>
              <span class="spacer"></span>
              ${U.confBadge("estimate")}
            </div>
            <div class="build-rows">
              <div class="build-row"><span class="bk">무기 개조</span><span class="bv">${U.esc(b.mod)}<small>날·손잡이·키링으로 성능 방향을 정합니다.</small></span></div>
              <div class="build-row"><span class="bk">갓 핸드</span><span class="bv">공격형 ${U.esc(b.godHand.attack)} · 방어형 ${U.esc(b.godHand.defense)} · 보조형 ${U.esc(b.godHand.support)}<small>유형별 1개씩, 프리셋으로 저장해 두고 상황에 맞게 교체</small></span></div>
              <div class="build-row"><span class="bk">슬롯 순서</span><span class="bv">${b.priority.map((p, i) => `${i + 1}. ${U.esc(p)}`).join(" &nbsp;→&nbsp; ")}<small>파브라늄이 부족할 때 투자 순서</small></span></div>
              <div class="build-row"><span class="bk">오버클럭</span><span class="bv">${U.esc(b.oc)}</span></div>
              <div class="build-row"><span class="bk">한 줄 팁</span><span class="bv">${U.esc(b.tip)}</span></div>
            </div>
            <div class="build-actions">
              <button class="btn btn-primary btn-sm" type="button" data-save-build>${U.icon("save")}세팅 저장</button>
              <button class="btn btn-ghost btn-sm" type="button" data-copy-build>${U.icon("copy")}텍스트 복사</button>
              <a class="btn btn-ghost btn-sm" href="#/simulator">${U.icon("gauge")}시뮬레이터로</a>
            </div>
          </div>

          ${
            state.savedBuilds.length
              ? `<div>
                  <p class="subhead">저장한 세팅 <span class="dim" style="text-transform:none;letter-spacing:0">브라우저 저장</span></p>
                  <div class="row-wrap" style="gap:6px">
                    ${state.savedBuilds
                      .map((s, i) => {
                        const sw = OGG.index.weapons[s.weapon];
                        const label = sw && data.builds[s.weapon] ? `${sw.name} · ${data.builds[s.weapon][s.goal].label}` : s.weapon;
                        return `<span class="chip">${U.icon("save")}${U.esc(label)}
                          <button type="button" data-load-build="${i}" class="dim" style="margin-left:2px" aria-label="불러오기">${U.icon("arrow-right")}</button>
                          <button type="button" data-del-build="${i}" class="dim" aria-label="삭제">${U.icon("x")}</button>
                        </span>`;
                      })
                      .join("")}
                  </div>
                </div>`
              : ""
          }
        </div>
      </div>`;
  }

  function comparison(data) {
    const rows = [
      ["역할", (w) => U.esc(w.role)],
      ["사거리", (w) => U.esc(w.range)],
      ["화력", (w) => w.stats.burst],
      ["지속력", (w) => w.stats.sustain],
      ["군중제어", (w) => w.stats.control],
      ["지원", (w) => w.stats.support],
      ["생존", (w) => w.stats.survival],
      ["공개 클래스", (w) => (w.classes.length ? w.classes.map((id) => U.esc(OGG.index.classes[id].name)).join(", ") : "미공개")],
      ["추천 상황", (w) => U.esc(w.partyFit.slice(0, 2).join(" / "))]
    ];
    return `
      <div class="table-wrap">
        <table class="cmp">
          <thead>
            <tr><th>항목</th>${data.weapons.map((w) => `<th class="wcol">${U.esc(w.name)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows.map(([label, fn]) => `<tr><td>${label}</td>${data.weapons.map((w) => `<td>${fn(w)}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
      <p class="tiny dim" style="margin-top:8px">${U.confBadge("press")} 계열별 역할은 공식 발표 보도 기준, ${U.confBadge("estimate")} 지표는 팬 평가입니다. 클래스 전체 목록은 공개되지 않았습니다.</p>`;
  }

  function render(data, params) {
    state = initialState(data, params);
    const list = filtered(data);
    const counts = roleCounts(data);
    const w = OGG.index.weapons[state.selected];

    return `
    <div class="stack" style="gap:22px">
      <section class="section">
        <div class="section-head">
          <div class="titles">
            <span class="eyebrow">Weapons &amp; Classes</span>
            <h2 class="section-title">4대 무기 비교 · 추천 세팅</h2>
            <p class="section-desc">
              출시 시점 무기는 <b>지팡이·대검·활·바이블</b> 4계열. 같은 무기라도 클래스 전용 스킬에 따라 전투 방식이 달라집니다.
              검색·역할 필터로 좁히고, 카드를 눌러 세부 정보를 확인하세요.
            </p>
          </div>
        </div>

        <div class="filter-panel">
          <div class="search-field">
            ${U.icon("search")}
            <input type="search" id="weaponSearch" placeholder="무기 · 역할 · 키워드 검색" value="${U.esc(state.q)}" autocomplete="off" />
            <button class="clear ${state.q ? "" : "hidden"}" type="button" id="weaponClear" aria-label="검색어 지우기">${U.icon("x")}</button>
          </div>
          <div class="filter-row" id="roleFilters">
            ${ROLES.map(
              (r) =>
                `<button class="chip ${state.role === r.id ? "is-active" : ""}" type="button" data-role="${r.id}">
                  ${U.icon(r.icon)}${r.label}<span class="count">${counts[r.id]}</span>
                </button>`
            ).join("")}
            <span class="filter-divider"></span>
            <select class="select" id="weaponSort" aria-label="정렬 기준">
              ${SORTS.map((s) => `<option value="${s.id}" ${state.sort === s.id ? "selected" : ""}>${s.label}</option>`).join("")}
            </select>
          </div>
          <div class="result-line">
            <span>검색 결과 <b id="weaponCount">${list.length}</b> / ${data.weapons.length}계열</span>
            <span class="tiny dim hide-sm">전투 지표는 계열 간 상대 비교용 추정치입니다</span>
          </div>
        </div>

        <div class="weapon-grid" id="weaponGrid">
          ${list.length ? list.map(card).join("") : `<div class="empty" style="grid-column:1/-1">${U.icon("search")}<b>조건에 맞는 계열이 없습니다</b><span>검색어를 줄이거나 필터를 전체로 바꿔 보세요.</span></div>`}
        </div>
      </section>

      <div id="weaponDetailWrap">${detail(data, w)}</div>

      ${builder(data)}

      ${OGG.adSlot("infeed", "인피드 · 무기 목록 하단")}

      <section class="section">
        <div class="section-head">
          <div class="titles">
            <span class="eyebrow">Compare</span>
            <h2 class="section-title">한눈에 비교표</h2>
          </div>
        </div>
        ${comparison(data)}
      </section>

      <div class="notice notice-info">
        ${U.icon("info")}
        <span>
          이 페이지의 클래스 정보는 <b>쇼케이스에서 공개된 예시</b>(블러드 워리어·크러셔)만 담았습니다. 전체 클래스 목록과 클래스별 수치는 공개되지 않아
          추측으로 채우지 않았고, 3개월 차 업데이트에서 계열별 신규 클래스가 추가될 예정입니다.
        </span>
      </div>
    </div>`;
  }

  function reRenderList(root, data) {
    const list = filtered(data);
    const grid = root.querySelector("#weaponGrid");
    const count = root.querySelector("#weaponCount");
    const clear = root.querySelector("#weaponClear");
    if (grid) {
      grid.innerHTML = list.length
        ? list.map(card).join("")
        : `<div class="empty" style="grid-column:1/-1">${U.icon("search")}<b>조건에 맞는 계열이 없습니다</b><span>검색어를 줄이거나 필터를 전체로 바꿔 보세요.</span></div>`;
    }
    if (count) count.textContent = String(list.length);
    if (clear) clear.classList.toggle("hidden", !state.q);
    const counts = roleCounts(data);
    U.qsa("[data-role]", root).forEach((btn) => {
      const c = btn.querySelector(".count");
      if (c) c.textContent = String(counts[btn.getAttribute("data-role")] || 0);
      btn.classList.toggle("is-active", btn.getAttribute("data-role") === state.role);
    });
  }

  function rerenderDetail(root, data) {
    const wrap = root.querySelector("#weaponDetailWrap");
    if (wrap) wrap.innerHTML = detail(data, OGG.index.weapons[state.selected]);
    U.qsa("[data-weapon]", root).forEach((el) => {
      const on = el.getAttribute("data-weapon") === state.selected;
      el.classList.toggle("is-selected", on);
      el.setAttribute("aria-pressed", on ? "true" : "false");
    });
    const builderEl = root.querySelector("#buildBuilder");
    if (builderEl) builderEl.outerHTML = builder(data);
  }

  function mount(root, data) {
    const search = root.querySelector("#weaponSearch");
    if (search) {
      search.addEventListener(
        "input",
        U.debounce(function () {
          state.q = search.value.trim();
          reRenderList(root, data);
        }, 140)
      );
    }

    U.on(root, "click", "[data-role]", function (event, el) {
      state.role = el.getAttribute("data-role");
      reRenderList(root, data);
    });

    U.on(root, "change", "#weaponSort", function (event, el) {
      state.sort = el.value;
      reRenderList(root, data);
    });

    U.on(root, "click", "#weaponClear", function () {
      state.q = "";
      if (search) search.value = "";
      reRenderList(root, data);
      if (search) search.focus();
    });

    U.on(root, "click", "[data-weapon]", function (event, el) {
      state.selected = el.getAttribute("data-weapon");
      persist();
      rerenderDetail(root, data);
      const target = root.querySelector("#weaponDetail");
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY - 84;
        window.scrollTo({ top, behavior: "smooth" });
      }
    });

    U.on(root, "click", "[data-build-weapon]", function (event, el) {
      state.selected = el.getAttribute("data-build-weapon");
      persist();
      rerenderDetail(root, data);
    });

    U.on(root, "click", "[data-build-goal]", function (event, el) {
      state.goal = el.getAttribute("data-build-goal");
      persist();
      const builderEl = root.querySelector("#buildBuilder");
      if (builderEl) builderEl.outerHTML = builder(data);
    });

    U.on(root, "click", "[data-copy-build]", function () {
      const w = OGG.index.weapons[state.selected];
      U.copyText(buildText(data, w, state.goal)).then((ok) => {
        U.toast(ok ? "세팅을 텍스트로 복사했습니다" : "복사에 실패했습니다. 브라우저 권한을 확인해 주세요", ok ? "copy" : "alert");
      });
    });

    U.on(root, "click", "[data-save-build]", function () {
      const exists = state.savedBuilds.some((s) => s.weapon === state.selected && s.goal === state.goal);
      if (exists) {
        U.toast("이미 저장한 세팅입니다", "info");
        return;
      }
      state.savedBuilds.unshift({ weapon: state.selected, goal: state.goal, at: new Date().toISOString() });
      state.savedBuilds = state.savedBuilds.slice(0, 6);
      persist();
      const builderEl = root.querySelector("#buildBuilder");
      if (builderEl) builderEl.outerHTML = builder(data);
      U.toast("세팅을 브라우저에 저장했습니다", "save");
    });

    U.on(root, "click", "[data-del-build]", function (event, el) {
      const index = Number(el.getAttribute("data-del-build"));
      state.savedBuilds.splice(index, 1);
      persist();
      const builderEl = root.querySelector("#buildBuilder");
      if (builderEl) builderEl.outerHTML = builder(data);
      U.toast("저장한 세팅을 삭제했습니다", "x");
    });

    U.on(root, "click", "[data-load-build]", function (event, el) {
      const index = Number(el.getAttribute("data-load-build"));
      const item = state.savedBuilds[index];
      if (!item) return;
      state.selected = item.weapon;
      state.goal = item.goal;
      persist();
      rerenderDetail(root, data);
      U.toast("저장한 세팅을 불러왔습니다", "check");
    });
  }

  OGG.views = OGG.views || {};
  OGG.views.weapons = { render, mount };
})(window);
