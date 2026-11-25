/* ==========================================================================
   views/home.js — 대시보드
   ========================================================================== */
(function (window) {
  "use strict";

  const OGG = (window.OGG = window.OGG || {});
  const U = OGG.util;

  function heroHud() {
    const state = OGG.sim.load();
    const score = OGG.sim.coreScore(state);
    const { current, next } = OGG.sim.tierFor(score);
    const progress = next
      ? U.clamp(((score - (current ? current.threshold : 0)) / (next.threshold - (current ? current.threshold : 0))) * 100, 0, 100)
      : 100;
    const weapon = state.slots.weapon;
    const cap = OGG.sim.maxLevel(state, "weapon");

    return `
      <div class="hud">
        <div class="hud-top">
          <span class="hud-label">My Core Status</span>
          <span class="badge badge-soft-gold">${current ? current.name : "미해금"}</span>
        </div>
        <div class="hud-score">
          <strong>${U.num(score)}</strong>
          <span>CORES</span>
        </div>
        <div class="hud-gauge">
          <div class="hud-gauge-head">
            <span>${next ? `다음 단계 ${next.name} · ${U.num(next.threshold)}` : "최고 단계 도달"}</span>
            <span>${Math.round(progress)}%</span>
          </div>
          <div class="bar"><i style="width:${progress}%"></i></div>
        </div>
        <div class="hud-rows">
          <div class="hud-row">
            <span class="k">${U.icon("greatsword")} 무기 슬롯</span>
            <span class="v">+${weapon.level} <span style="color:var(--text-4)">/ ${cap}</span></span>
          </div>
          <div class="hud-row">
            <span class="k">${U.icon("gauge")} 오버클럭 게이지</span>
            <span class="v">${state.gauge}%</span>
          </div>
          <div class="hud-row">
            <span class="k">${U.icon("chip")} 파브라늄</span>
            <span class="v">${U.num(state.fabranium)}</span>
          </div>
        </div>
        <div class="hud-foot">
          <span>팬 모델 · 실제 코어 점수 아님</span>
          <a class="link-arrow" href="#/simulator" style="font-size:10px">시뮬레이터 ${U.icon("arrow-up-right")}</a>
        </div>
      </div>`;
  }

  function statStrip(data) {
    return `<div class="stat-strip">
      ${data.stats
        .map(
          (s) => `
        <div class="stat-card">
          <span class="label">${U.esc(s.label)}</span>
          <span class="value">${U.esc(s.value)}<span class="unit">${U.esc(s.unit)}</span></span>
          <span class="hint">${U.esc(s.hint)}</span>
        </div>`
        )
        .join("")}
    </div>`;
  }

  function toolCards() {
    const tools = [
      {
        icon: "swords",
        title: "무기 4계열 비교",
        desc: "지팡이·대검·활·바이블의 역할과 강점을 같은 기준으로 비교하고, 플레이 목표에 맞는 세팅을 뽑아봅니다.",
        href: "#/weapons",
        go: "가이드 열기"
      },
      {
        icon: "gauge",
        title: "오버기어드 시뮬레이터",
        desc: "부위별 슬롯 강화·돌파를 직접 눌러보고 코어 점수와 오버클럭 단계가 어떻게 열리는지 확인합니다.",
        href: "#/simulator",
        go: "시뮬레이션 시작"
      },
      {
        icon: "chip",
        title: "코어 점수 · 티어 설계",
        desc: "슬롯·등급·시그니처 증폭이 코어 점수에 어떻게 쌓이는지 보고, 다음 오버클럭까지 남은 점수를 계산합니다.",
        href: "#/simulator",
        go: "계산해 보기"
      },
      {
        icon: "board",
        title: "공략 · 파티 보드",
        desc: "태그로 공략을 찾고, 파티·길드 모집 글을 남겨 보세요. 작성한 글은 이 브라우저에 저장됩니다.",
        href: "#/board",
        go: "게시판 열기"
      }
    ];
    return `<div class="tool-grid">
      ${tools
        .map(
          (t) => `
        <a class="tool-card" href="${t.href}">
          <span class="icon-tile">${U.icon(t.icon)}</span>
          <h3>${U.esc(t.title)}</h3>
          <p>${U.esc(t.desc)}</p>
          <span class="go">${U.esc(t.go)} ${U.icon("arrow-right")}</span>
        </a>`
        )
        .join("")}
    </div>`;
  }

  function weaponMini(data) {
    return `<div class="mini-weapons">
      ${data.weapons
        .map((w) => {
          const score = Math.round((w.stats.burst + w.stats.control + w.stats.support + w.stats.survival) / 4);
          return `
          <a class="mini-weapon" href="#/weapons?w=${w.id}">
            <span class="mw-icon">${U.icon(w.icon)}</span>
            <span>
              <span class="mw-name">${U.esc(w.name)}</span>
              <span class="mw-role">${U.esc(w.role)}</span>
            </span>
            <span class="mw-bar">
              <span class="bar"><i style="width:${score}%"></i></span>
            </span>
          </a>`;
        })
        .join("")}
    </div>`;
  }

  function patchRows(data) {
    return data.patches
      .slice(0, 4)
      .map(
        (p) => `
      <a class="patch-row" href="#/patches">
        <span class="pv">v${U.esc(p.version)}</span>
        <span>
          <span class="pt">${U.esc(p.title)}</span>
          <span class="pd">${U.formatDate(p.date)} · ${U.esc((p.tags || []).join(" · "))}</span>
        </span>
        <span class="badge ${p.date > "2026-11-26" ? "badge-ghost" : "badge-soft-gold"}">${p.date > "2026-11-26" ? "예고" : "적용"}</span>
      </a>`
      )
      .join("");
  }

  function roadmapWidget(data) {
    const upcoming = data.roadmap.filter((r) => r.status !== "live").slice(0, 3);
    return `<section class="widget">
      <div class="widget-head"><span class="wh-l">${U.icon("calendar")} 다음 업데이트</span><a class="link-arrow" href="#/patches" style="font-size:11px">전체 ${U.icon("chevron-right")}</a></div>
      <div class="widget-body">
        <div class="roadmap-mini">
          ${upcoming
            .map(
              (r) => `
            <div class="rm-item">
              <span class="rm-date">${U.formatDate(r.date).slice(5)}</span>
              <span>
                <span class="rm-title">${U.esc(r.label)}</span>
                <span class="rm-sub">${U.esc(r.items.slice(0, 2).join(" · "))}</span>
              </span>
            </div>`
            )
            .join("")}
        </div>
        <div class="tiny dim" style="border-top:1px dashed var(--line);padding-top:9px">${U.icon("info")} 날짜는 공식 발표 시점 기준 근사치입니다.</div>
      </div>
    </section>`;
  }

  function tagWidget(data) {
    const counts = {};
    data.boardSeed.forEach((p) => (p.tags || []).forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
    const tags = Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .slice(0, 12);
    return `<section class="widget">
      <div class="widget-head"><span class="wh-l">${U.icon("filter")} 인기 태그</span></div>
      <div class="widget-body">
        <div class="tag-cloud">
          ${tags.map((t) => `<button class="post-tag" type="button" data-tag="${U.esc(t)}">#${U.esc(t)}</button>`).join("")}
        </div>
      </div>
    </section>`;
  }

  function render(data) {
    const launch = data.game.launchAt;
    const dPlus = U.dayDiff(launch, new Date());
    const dLabel = dPlus === 0 ? "D-DAY" : dPlus > 0 ? `D+${dPlus}` : `D${dPlus}`;

    return `
    <div class="stack" style="gap:22px">
      <section class="hero">
        <div class="hero-grid">
          <div class="hero-copy">
            <div class="hero-kicker">
              <span class="badge badge-ghost">비공식 팬 프로젝트</span>
              <span class="badge badge-green"><span class="live-dot"></span>정식 출시 ${dLabel}</span>
              <span class="badge badge-soft-gold">${U.esc(data.game.launchLabel)}</span>
            </div>
            <h1 class="hero-title">
              장비로 강해지는<br />
              <span class="line-2">모든 경로를 한 화면에.</span>
            </h1>
            <p class="hero-lead">
              <b>지팡이·대검·활·바이블</b> 4계열 비교부터 부위별 슬롯 강화, 코어 점수로 열리는
              <b>오버클럭</b> 단계까지. 공식 발표와 보도로 확인된 사실만 정리하고,
              비공개 수치는 <b>팬 모델</b>임을 화면마다 표시했습니다.
            </p>
            <div class="hero-actions">
              <a class="btn btn-primary btn-lg" href="#/simulator">${U.icon("flame")}강화 시뮬레이터 열기</a>
              <a class="btn btn-ghost btn-lg" href="#/weapons">무기 가이드 보기 ${U.icon("arrow-right")}</a>
            </div>
            <div class="hero-meta">
              <span>${U.icon("monitor")}PC · Android · iOS</span>
              <span>${U.icon("users")}${U.esc(data.game.developer)} / ${U.esc(data.game.publisher)}</span>
              <span>${U.icon("book")}원작 ${U.esc(data.game.originalWork)}</span>
            </div>
          </div>
          ${heroHud()}
        </div>
      </section>

      ${statStrip(data)}

      <div class="layout">
        <div class="stack" style="gap:26px">
          <section class="section">
            <div class="section-head">
              <div class="titles">
                <span class="eyebrow">Toolkit</span>
                <h2 class="section-title">오늘 바로 써먹는 도구</h2>
                <p class="section-desc">정보를 읽는 데서 끝내지 않고, 내 세팅에 대입해 볼 수 있게 만들었습니다.</p>
              </div>
            </div>
            ${toolCards()}
          </section>

          ${OGG.adSlot("infeed", "인피드 · 본문 중간 네이티브")}

          <section class="section">
            <div class="section-head">
              <div class="titles">
                <span class="eyebrow">Weapon Classes</span>
                <h2 class="section-title">4계열, 같은 무기도 다른 전투</h2>
                <p class="section-desc">무기 계열 스킬 위에 클래스 전용 스킬이 쌓이는 구조. 계열별 역할을 먼저 잡으면 세팅이 쉬워집니다.</p>
              </div>
              <a class="link-arrow" href="#/weapons">전체 비교 ${U.icon("arrow-up-right")}</a>
            </div>
            <div class="card"><div class="card-pad" style="padding:12px">${weaponMini(data)}</div></div>
          </section>

          <section class="section">
            <div class="section-head">
              <div class="titles">
                <span class="eyebrow">Patch Log</span>
                <h2 class="section-title">패치 · 업데이트</h2>
                <p class="section-desc">출시 이후 6개월 로드맵까지, 확인된 일정만 시간순으로 정리했습니다.</p>
              </div>
              <a class="link-arrow" href="#/patches">타임라인 ${U.icon("arrow-up-right")}</a>
            </div>
            <div class="stack-sm">${patchRows(data)}</div>
          </section>

          <section class="card">
            <div class="card-head">
              <h3>${U.icon("info")} 이 사이트의 정보 등급</h3>
              <span class="conf conf-estimate">팬 프로젝트</span>
            </div>
            <div class="card-body stack-sm">
              <div class="row-wrap" style="gap:8px">
                ${U.confBadge("official")}<span class="tiny muted">공식 홈페이지·공식 채널에서 직접 확인한 내용</span>
              </div>
              <div class="row-wrap" style="gap:8px">
                ${U.confBadge("press")}<span class="tiny muted">복수 매체가 동일하게 보도한 공식 발표 내용</span>
              </div>
              <div class="row-wrap" style="gap:8px">
                ${U.confBadge("estimate")}<span class="tiny muted">공개되지 않은 수치를 체험용으로 모델링한 값 (실제와 다름)</span>
              </div>
              <div class="divider"></div>
              <p class="tiny dim">출처 목록은 <a href="#/patches" style="color:var(--gold)">패치·업데이트</a> 페이지 하단에 있습니다. 권리자 요청 시 즉시 수정·삭제합니다.</p>
            </div>
          </section>
        </div>

        <aside class="aside">
          ${OGG.adSlot("300x250", "우측 사이드 · 300×250")}
          ${roadmapWidget(data)}
          ${tagWidget(data)}
          <section class="widget">
            <div class="widget-head"><span class="wh-l">${U.icon("shield")} 고지</span></div>
            <div class="widget-body">
              <p class="tiny" style="color:#d9cba6;line-height:1.7">
                본 사이트는 <b style="color:var(--gold)">비공식 팬 사이트</b>이며, 템빨: 오버기어드의 상표 및 저작권은 원저작권자에게 있습니다.
              </p>
              <a class="btn btn-ghost btn-sm btn-block" href="mailto:dkahdekd@naver.com">${U.icon("link")}문의하기</a>
            </div>
          </section>
        </aside>
      </div>
    </div>`;
  }

  function mount(root, data) {
    U.on(root, "click", "[data-tag]", function (event, el) {
      const tag = el.getAttribute("data-tag");
      window.location.hash = `#/board?tag=${encodeURIComponent(tag)}`;
    });
  }

  OGG.views = OGG.views || {};
  OGG.views.home = { render, mount };
})(window);
