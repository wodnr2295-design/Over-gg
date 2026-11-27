/* ==========================================================================
   views/patches.js — 패치 · 업데이트 · 출처
   ========================================================================== */
(function (window) {
  "use strict";

  const OGG = (window.OGG = window.OGG || {});
  const U = OGG.util;

  function timeline(data) {
    return `
      <div class="timeline">
        ${data.roadmap
          .map(
            (r) => `
          <div class="tl-item ${r.status === "live" ? "is-live" : ""}">
            <div class="tl-card">
              <div class="tl-head">
                <span class="tl-date">${U.formatDate(r.date)}${r.dateNote ? `<small>${U.esc(r.dateNote)}</small>` : ""}</span>
                <span class="badge ${r.status === "live" ? "badge-gold" : "badge-ghost"}">${r.status === "live" ? "진행 중" : "예정"}</span>
                ${U.confBadge(r.confidence)}
              </div>
              <h3>${U.esc(r.label)}</h3>
              <ul class="tl-list">${r.items.map((i) => `<li>${U.esc(i)}</li>`).join("")}</ul>
            </div>
          </div>`
          )
          .join("")}
      </div>`;
  }

  function noticeCards(data) {
    const list = data.notices || [];
    if (!list.length) return "";
    return list
      .map(
        (n) => `
      <article class="patch-card">
        <div class="patch-card-head">
          <span class="badge badge-soft-gold">${U.esc(n.category)}</span>
          <h3 style="flex:1 1 200px">${U.esc(n.title)}</h3>
          <span class="tiny dim mono">${U.formatDate(n.date, true)}</span>
          ${U.confBadge(n.confidence)}
        </div>
        <p class="small muted">${U.esc(n.summary)}</p>
        <ul class="patch-notes">${n.items.map((i) => `<li>${U.esc(i)}</li>`).join("")}</ul>
        ${(n.links || []).length
          ? `<div class="row-wrap" style="gap:6px 14px">${n.links
              .map(
                (l) =>
                  `<a class="link-arrow" href="${U.esc(l.url)}" target="_blank" rel="noopener noreferrer" style="font-size:11px">${U.esc(l.label)} ${U.icon("external")}</a>`
              )
              .join("")}</div>`
          : ""}
      </article>`
      )
      .join("");
  }

  function issueCards(data) {
    const group = data.knownIssues || {};
    const list = group.items || [];
    if (!list.length) return "";
    return list
      .map(
        (i) => `
      <article class="issue-card ${i.status === "done" ? "is-done" : ""}">
        <div class="issue-head">
          <span class="badge badge-ghost">${U.esc(i.category)}</span>
          <h3>${U.esc(i.title)}</h3>
          <span class="badge ${i.status === "done" ? "badge-green" : "badge-soft-gold"}">${i.status === "done" ? "완료" : "확인 중"}</span>
          <span class="tiny dim mono">등록 ${U.formatDate(i.registeredAt)}${i.appliedAt ? ` · 적용 ${U.formatDate(i.appliedAt)}` : ""}</span>
        </div>
        <p class="issue-answer">${U.esc(i.answer)}</p>
      </article>`
      )
      .join("");
  }

  function issueSection(data) {
    const group = data.knownIssues || {};
    const list = group.items || [];
    if (!list.length) return "";
    const fixing = list.filter((i) => i.status !== "done").length;
    const done = list.length - fixing;
    return `
      <section class="section" id="known-issues">
        <div class="section-head">
          <div class="titles">
            <span class="eyebrow">Known Issues</span>
            <h2 class="section-title">확인 중인 현상</h2>
            <p class="section-desc">
              넥슨 공식 '확인 중인 현상' 게시판에 등록된 항목을 그대로 정리했습니다.
              내 계정에서 같은 증상이 보이면 대응 방법을 먼저 확인하세요.
            </p>
          </div>
          <div class="row-wrap" style="gap:6px">
            <span class="badge badge-soft-gold">확인 중 ${fixing}</span>
            <span class="badge badge-green">완료 ${done}</span>
          </div>
        </div>

        <div class="notice notice-warn">
          ${U.icon("alert")}
          <span>
            ${U.esc(U.formatDate(group.checkedAt))} 기준 ${list.length}건을 확인했습니다. 수정 전 거래로 부족하게 정산된 금액처럼 <b>사후 지급이 걸린 항목</b>도 있으니, 우편함과 공식 게시판에서 처리 결과를 다시 확인하는 편이 좋습니다.
            ${group.sourceUrl ? `<a href="${U.esc(group.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="link-arrow" style="font-size:11px;margin-left:4px">${U.esc(group.sourceLabel || "공식 게시판")} ${U.icon("external")}</a>` : ""}
          </span>
        </div>

        <div class="issue-list">${issueCards(data)}</div>
      </section>`;
  }

  function patchCards(data) {
    return data.patches
      .map(
        (p) => `
      <article class="patch-card">
        <div class="patch-card-head">
          <span class="vtag">v${U.esc(p.version)}</span>
          <h3 style="flex:1 1 200px">${U.esc(p.title)}</h3>
          <span class="tiny dim mono">${U.formatDate(p.date)}</span>
          ${(p.tags || []).map((t) => `<span class="badge badge-ghost">${U.esc(t)}</span>`).join("")}
        </div>
        <p class="small muted">${U.esc(p.summary)}</p>
        <ul class="patch-notes">${p.notes.map((n) => `<li>${U.esc(n)}</li>`).join("")}</ul>
      </article>`
      )
      .join("");
  }

  function systemCards(data) {
    const icons = {
      overgeared: "armor",
      fabranium: "chip",
      overclock: "gauge",
      signature: "star",
      modification: "hammer",
      godhand: "party",
      dimension: "server",
      royal: "crown"
    };
    return `
      <div class="weapon-grid">
        ${data.systems
          .map(
            (s) => `
          <div class="card card-pad" style="display:grid;gap:10px">
            <div class="row" style="gap:10px;align-items:flex-start">
              <span class="icon-tile is-sm">${U.icon(icons[s.id] || "spark")}</span>
              <div style="flex:1 1 auto;min-width:0">
                <h3 style="font-size:15px">${U.esc(s.name)}</h3>
                <div class="tiny" style="color:var(--gold)">${U.esc(s.kicker)}</div>
              </div>
              ${U.confBadge(s.confidence)}
            </div>
            <p class="small muted" style="line-height:1.7">${U.esc(s.summary)}</p>
            <ul class="bullet-list">${s.points.map((p) => `<li>${U.esc(p)}</li>`).join("")}</ul>
          </div>`
          )
          .join("")}
      </div>`;
  }

  function sources(data) {
    return `
      <div class="source-list">
        ${data.sources
          .map(
            (s) => `
          <a class="source-item" href="${U.esc(s.url)}" target="_blank" rel="noopener noreferrer">
            <span class="sp">${U.esc(s.publisher)}${s.date ? `<br />${U.esc(s.date)}` : ""}</span>
            <span>
              <span class="st">${U.esc(s.title)} ${U.icon("external")}</span>
              <span class="sd">${U.esc(s.used || "")}</span>
            </span>
          </a>`
          )
          .join("")}
      </div>
      <p class="tiny dim" style="margin-top:10px">
        기사 본문을 복사하지 않고, 확인된 사실만 요약했습니다. 강화 경험치 확률은 공식 공개표를 그대로 쓰고, 공개되지 않은 수치·비용은 '추정치'로 구분해 표시합니다.
      </p>`;
  }

  function faq(data) {
    return `
      <div class="faq">
        ${data.faq
          .map(
            (f) => `<details><summary>${U.esc(f.q)}</summary><div class="faq-a">${U.esc(f.a)}</div></details>`
          )
          .join("")}
      </div>`;
  }

  function render(data) {
    const live = data.roadmap.filter((r) => r.status === "live").length;
    return `
    <div class="stack" style="gap:22px">
      <section class="section">
        <div class="section-head">
          <div class="titles">
            <span class="eyebrow">Patch &amp; Roadmap</span>
            <h2 class="section-title">패치 · 업데이트 타임라인</h2>
            <p class="section-desc">
              출시(2026.11.26)부터 6개월 차 신규 무기 계열까지. 공식 발표로 확인된 항목만 정리했고,
              날짜가 확정되지 않은 구간은 <b>근사치</b>로 표기했습니다.
            </p>
          </div>
          <div class="row-wrap" style="gap:6px">
            <span class="badge badge-gold">진행 ${live}</span>
            <span class="badge badge-ghost">예정 ${data.roadmap.length - live}</span>
          </div>
        </div>

        <div class="notice notice-info">
          ${U.icon("calendar")}
          <span>출시 초기에는 <b>두 리전을 별도 운영</b>하고, 차원 교류·경쟁은 리전 내부에서 진행됩니다. 두 지역 통합 콘텐츠는 이후 순차 공개 예정입니다.</span>
        </div>

        ${timeline(data)}
      </section>

      <div class="layout">
        <div class="stack" style="gap:24px">
          <section class="section">
            <div class="section-head">
              <div class="titles">
                <span class="eyebrow">Official Notices</span>
                <h2 class="section-title">공식 공지 · 지금 확인할 것</h2>
                <p class="section-desc">넥슨 공식 공지사항에서 직접 확인한 내용만 요약했습니다. 실제 조건·일정은 원문 링크에서 확인하세요.</p>
              </div>
              <span class="badge badge-gold">공식 확인 ${(data.notices || []).length}건</span>
            </div>
            <div class="stack">${noticeCards(data)}</div>
          </section>

          ${issueSection(data)}

          <section class="section">
            <div class="section-head">
              <div class="titles">
                <span class="eyebrow">Patch Notes</span>
                <h2 class="section-title">패치노트 요약</h2>
                <p class="section-desc">적용된 내용과 예고된 내용을 구분해 표시합니다. 세부 수치는 공식 패치노트를 확인하세요.</p>
              </div>
            </div>
            <div class="stack">${patchCards(data)}</div>
          </section>

          ${OGG.adSlot("infeed", "인피드 · 패치노트 사이")}

          <section class="section">
            <div class="section-head">
              <div class="titles">
                <span class="eyebrow">Systems</span>
                <h2 class="section-title">핵심 시스템 요약</h2>
                <p class="section-desc">오버기어드·오버클럭·파브라늄·시그니처 장비·차원까지, 성장 구조를 한 번에.</p>
              </div>
            </div>
            ${systemCards(data)}
          </section>
        </div>

        <aside class="aside">
          ${OGG.adSlot("300x250", "우측 사이드 · 300×250")}
          <section class="widget">
            <div class="widget-head"><span class="wh-l">${U.icon("refresh")} 업데이트 안내</span></div>
            <div class="widget-body stack-sm">
              <p class="tiny" style="color:var(--text-2);line-height:1.7">
                공식 공지·패치 노트가 공개되는 대로 반영됩니다.
                강화 경험치 확률은 넥슨 공개표를 그대로 쓰고, 아직 공개되지 않은 비용·산식은 체험용 추정치로 표시합니다.
              </p>
              <div class="kv-row"><span class="k">최종 기준</span><span class="v">${U.formatDate(data.updatedAt)}</span></div>
              <div class="kv-row"><span class="k">확인한 출처</span><span class="v">${data.sources.length}건</span></div>
            </div>
          </section>
          <section class="widget">
            <div class="widget-head"><span class="wh-l">${U.icon("info")} 고지</span></div>
            <div class="widget-body">
              <p class="tiny" style="color:#d9cba6;line-height:1.7">
                본 사이트는 비공식 팬 사이트이며, 템빨: 오버기어드의 상표 및 저작권은 원저작권자에게 있습니다.
              </p>
              <p class="tiny dim" style="line-height:1.6">문의 · 정정 요청: <a href="mailto:dkahdekd@naver.com" style="color:var(--gold)">dkahdekd@naver.com</a></p>
            </div>
          </section>
        </aside>
      </div>

      <section class="section">
        <div class="section-head">
          <div class="titles">
            <span class="eyebrow">Sources</span>
            <h2 class="section-title">출처</h2>
            <p class="section-desc">공식 채널과, 동일 내용을 보도한 매체를 함께 적었습니다. 원문 링크로 직접 확인할 수 있습니다.</p>
          </div>
        </div>
        ${sources(data)}
      </section>

      <section class="section">
        <div class="section-head">
          <div class="titles">
            <span class="eyebrow">FAQ</span>
            <h2 class="section-title">자주 묻는 질문</h2>
          </div>
        </div>
        ${faq(data)}
      </section>
    </div>`;
  }

  function mount() {
    /* 정적 콘텐츠 — 인터랙션은 <details> 기본 동작 사용 */
  }

  OGG.views = OGG.views || {};
  OGG.views.patches = { render, mount };
})(window);
