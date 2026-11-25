/* ==========================================================================
   views/simulator.js — 오버기어드 / 오버클럭 인터랙티브 시뮬레이터
   ========================================================================== */
(function (window) {
  "use strict";

  const OGG = (window.OGG = window.OGG || {});
  const U = OGG.util;

  let state = null;
  let activeTimer = 0;

  function pushLog(s, kind, text) {
    const d = new Date();
    const stamp = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
    s.log.unshift({ t: stamp, kind, text });
    s.log = s.log.slice(0, 40);
  }

  function ensureState() {
    if (!state) {
      state = OGG.sim.load();
      if (!state.log.length) {
        pushLog(state, "sys", "시뮬레이터 준비 완료 · 팬 모델 v1 (공식 수치 아님)");
        OGG.sim.save(state);
      }
    }
    return state;
  }

  /* ---------------------------------------------------------------- slots */
  function slotTile(data, s, slotId) {
    const slot = s.slots[slotId];
    const meta = OGG.index.slots[slotId];
    const cap = OGG.sim.maxLevel(s, slotId);
    const m = OGG.data.simModel;
    const baseCap = m.baseMaxLevel;
    const ticks = [];
    for (let i = 1; i <= cap; i += 1) {
      const on = i <= slot.level;
      const bt = i > baseCap;
      ticks.push(`<i class="${on ? "on" : ""} ${bt ? "bt" : ""}"></i>`);
    }
    const sealed = OGG.sim.sealedUnlocked(s, slotId);
    const capped = slot.level >= cap;
    return `
      <button class="slot ${slotId === s.selected ? "is-selected" : ""} ${capped ? "is-capped" : ""}" type="button" data-slot="${slotId}" aria-pressed="${slotId === s.selected}">
        <div class="slot-top">
          ${U.icon(meta.icon)}
          <span class="slot-name">${U.esc(meta.name)}</span>
          <span class="slot-lv"><b>+${slot.level}</b>/${cap}</span>
        </div>
        <div class="ticks" aria-hidden="true">${ticks.join("")}</div>
        <div class="slot-foot">
          <span class="pips" title="돌파 ${slot.bt}단계">${[0, 1, 2].map((i) => `<i class="${i < slot.bt ? "on" : ""}"></i>`).join("")}</span>
          <span class="slot-sealed ${sealed ? "is-open" : ""}">봉인 ${sealed}/3</span>
        </div>
      </button>`;
  }

  function slotsPanel(s) {
    return OGG.data.slots.map((slot) => slotTile(OGG.data, s, slot.id)).join("");
  }

  /* -------------------------------------------------------- slot control */
  function slotControl(s) {
    const meta = OGG.index.slots[s.selected];
    const slot = s.slots[s.selected];
    const cap = OGG.sim.maxLevel(s, s.selected);
    const p = OGG.sim.chance(s, s.selected);
    const cost = OGG.sim.attemptCost(s, s.selected);
    const btCost = OGG.sim.breakthroughCost(s, s.selected);
    const safe = OGG.sim.safeLimit(s);
    const capped = slot.level >= cap;
    const maxBt = OGG.data.simModel.maxBreakthrough;
    const canBreak = capped && slot.bt < maxBt;
    const sealed = OGG.sim.sealedUnlocked(s, s.selected);
    const nextSealed = [3, 7].find((lv) => slot.level < lv);

    return `
      <div class="slot-control">
        <div class="sc-head">
          <span class="icon-tile is-sm">${U.icon(meta.icon)}</span>
          <div style="flex:1 1 auto;min-width:0">
            <h3>${U.esc(meta.name)} 슬롯</h3>
            <span class="stat">${U.esc(meta.stat)} · ${U.esc(meta.note)}</span>
          </div>
          <span class="badge ${capped ? "badge-cyan" : "badge-ghost"}">${capped ? "상한 도달" : `${cap - slot.level}단계 남음`}</span>
        </div>

        <div class="sc-level">
          <span class="big">+${slot.level}</span>
          <span class="of">/ 최대 +${cap} · 돌파 ${slot.bt}/${maxBt}</span>
        </div>

        <div class="bar ${capped ? "is-cyan" : ""}"><i style="width:${(slot.level / cap) * 100}%"></i></div>

        <div class="sc-meta">
          <div class="meta-box">
            <span class="mk">성공 확률</span>
            <span class="mv ${slot.level + 1 <= safe ? "is-safe" : p < 0.5 ? "is-risk" : ""}">${U.pct(p)}${slot.level + 1 <= safe ? " · 안전" : ""}</span>
          </div>
          <div class="meta-box">
            <span class="mk">소모 파브라늄</span>
            <span class="mv">${U.num(cost)}</span>
          </div>
          <div class="meta-box">
            <span class="mk">봉인 해제</span>
            <span class="mv">${sealed}/3${nextSealed ? ` <span style="color:var(--text-4);font-weight:400">(+${nextSealed} 필요)</span>` : ""}</span>
          </div>
        </div>

        <div class="sc-actions">
          <button class="btn btn-primary" type="button" data-act="enhance" ${capped ? "disabled" : ""}>${U.icon("hammer")}1회 강화</button>
          <button class="btn" type="button" data-act="enhance10" ${capped ? "disabled" : ""}>${U.icon("refresh")}10회</button>
          <button class="btn ${canBreak ? "btn-cyan" : "btn-ghost"}" type="button" data-act="break" ${canBreak ? "" : "disabled"}>
            ${U.icon("spark")}돌파 ${slot.bt < maxBt ? `(${U.num(btCost)})` : ""}
          </button>
        </div>

        <div class="row-wrap" style="gap:8px;justify-content:space-between">
          <span class="tiny dim">${U.icon("info")} 실패해도 단계는 유지되고 파브라늄을 일부 돌려받습니다(팬 모델).</span>
          <button class="btn btn-ghost btn-sm" type="button" data-act="scavenge">${U.icon("download")}장비 분해</button>
        </div>
      </div>`;
  }

  /* ------------------------------------------------------------- core */
  function corePanel(data, s) {
    const score = OGG.sim.coreScore(s);
    const info = OGG.sim.tierFor(score);
    const current = info.current;
    const next = info.next;
    const from = current ? current.threshold : 0;
    const progress = next ? U.clamp(((score - from) / (next.threshold - from)) * 100, 0, 100) : 100;
    const grade = OGG.sim.gradeOf(s);

    return `
      <div class="core-panel">
        <div class="row" style="justify-content:space-between">
          <span class="hud-label">Core Score</span>
          ${U.confBadge("estimate")}
        </div>
        <div class="core-score-line">
          <span class="core-score" id="coreScoreValue">${U.num(score)}<small>cores</small></span>
          <span class="badge ${current ? "badge-soft-gold" : "badge-ghost"}">${current ? current.name : "미해금"}</span>
        </div>
        <div class="hud-gauge">
          <div class="hud-gauge-head">
            <span>${next ? `${next.name}까지 ${U.num(Math.max(0, next.threshold - score))}` : "최고 단계"}</span>
            <span>${Math.round(progress)}%</span>
          </div>
          <div class="bar"><i style="width:${progress}%"></i></div>
        </div>

        <div class="tier-ladder">
          ${info.tiers
            .map((t) => {
              const unlocked = score >= t.threshold;
              const isCurrent = current && current.tier === t.tier;
              return `
              <div class="tier-row ${unlocked ? "is-unlocked" : "is-locked"} ${isCurrent ? "is-current" : ""}">
                <span class="tt">${t.name}</span>
                <span>
                  <span class="td">${U.esc(t.model)}</span>
                  <span class="tmin" style="display:block">${U.num(t.threshold)} 코어</span>
                </span>
                <span style="color:${unlocked ? "var(--green)" : "var(--text-4)"}">${U.icon(unlocked ? "check" : "lock")}</span>
              </div>`;
            })
            .join("")}
        </div>

        <div class="divider"></div>

        <div class="core-options">
          <div class="opt-row">
            <span class="ol">${U.icon("star")}장비 등급</span>
            <select class="select" id="gradeSelect" aria-label="장비 등급">
              ${data.grades
                .map((g) => `<option value="${g.id}" ${g.id === s.grade ? "selected" : ""}>${U.esc(g.name)}</option>`)
                .join("")}
            </select>
          </div>
          <div class="opt-row">
            <span class="ol">${U.icon("shield")}시그니처 장비</span>
            <label class="switch">
              <input type="checkbox" id="signatureToggle" ${s.signature ? "checked" : ""} />
              <span class="switch-track"></span>
              <span class="tiny dim">안전 +2 · 코어 증폭</span>
            </label>
          </div>
        </div>
        <p class="tiny dim" style="line-height:1.6">
          ${U.icon("info")} 등급은 전 부위 동일 가정, 시그니처는 전 부위 적용 가정입니다.
          등급 명칭은 공개된 계열별 클래스 등급 표현을 참고한 <b>예시</b>입니다.
        </p>
      </div>`;
  }

  /* ----------------------------------------------------------- battle */
  function battlePanel(s) {
    const score = OGG.sim.coreScore(s);
    const info = OGG.sim.tierFor(score);
    const current = info.current;
    const full = s.gauge >= OGG.data.simModel.gaugeMax;
    let statusLabel = "잠김";
    let statusValue = info.next ? `코어 점수 ${U.num(info.next.threshold)} 이상 필요` : "코어 점수 부족";
    let activeClass = "";
    if (current && !s.active) {
      statusLabel = "대기";
      statusValue = `게이지를 채우면 ${current.name} · ${current.model}`;
    }
    if (s.active && current) {
      statusLabel = "발동 중";
      statusValue = `${current.name} · ${current.model}`;
      activeClass = "is-active";
    }

    return `
      <div class="battle">
        <div class="row" style="justify-content:space-between">
          <span class="hud-label">Overclock</span>
          <span class="badge ${current ? "badge-cyan" : "badge-ghost"}">${current ? current.name : "잠김"}</span>
        </div>
        <div class="gauge-wrap">
          <div class="gauge-head">
            <span>일반 공격 +${OGG.data.simModel.gaugeNormal} · 치명타 +${OGG.data.simModel.gaugeCrit}</span>
            <span id="gaugeText">${s.gauge} / ${OGG.data.simModel.gaugeMax}</span>
          </div>
          <div class="gauge ${full ? "is-full" : ""}"><i style="width:${s.gauge}%"></i></div>
        </div>
        <div class="gauge-actions">
          <button class="btn btn-sm" type="button" data-act="cycle">${U.icon("swords")}전투 1사이클</button>
          <button class="btn btn-sm" type="button" data-act="cycle3">${U.icon("refresh")}3사이클</button>
          <button class="btn btn-sm ${full ? "btn-cyan" : "btn-ghost"}" type="button" data-act="activate" ${full && current ? "" : "disabled"}>${U.icon("flame")}발동</button>
        </div>
        <div class="oc-live ${activeClass}">
          <span class="ocl">${statusLabel}</span>
          <span class="ocv">${U.esc(statusValue)}</span>
        </div>
        <p class="tiny dim" style="line-height:1.6">${U.icon("info")} 게이지 충전량·효과는 예시값입니다. 공식 수치는 미공개.</p>
      </div>`;
  }

  function summaryPanel(s) {
    return `
      <div class="sim-summary">
        <div class="meta-box"><span class="mk">시도</span><span class="mv">${U.num(s.stats.attempts)}</span></div>
        <div class="meta-box"><span class="mk">성공</span><span class="mv" style="color:var(--green)">${U.num(s.stats.success)}</span></div>
        <div class="meta-box"><span class="mk">실패</span><span class="mv" style="color:var(--red)">${U.num(s.stats.fail)}</span></div>
        <div class="meta-box"><span class="mk">돌파</span><span class="mv" style="color:var(--cyan)">${U.num(s.stats.breakthrough)}</span></div>
        <div class="meta-box"><span class="mk">발동</span><span class="mv" style="color:var(--gold)">${U.num(s.stats.activations)}</span></div>
        <div class="meta-box"><span class="mk">파브라늄</span><span class="mv">${U.num(s.fabranium)}</span></div>
      </div>`;
  }

  /* 슬롯별 코어 기여도 — 빈 공간을 정보로 채우고, 어느 부위를 올려야 하는지 보여줍니다 */
  function contributionPanel(s) {
    const total = OGG.sim.coreScore(s) || 1;
    const rows = OGG.data.slots
      .map((slot) => {
        const value = OGG.sim.slotCore(s, slot.id);
        const share = Math.round((value / total) * 100);
        const state2 = s.slots[slot.id];
        return { slot, value, share, state: state2 };
      })
      .sort((a, b) => b.value - a.value);
    const maxValue = Math.max(1, ...rows.map((r) => r.value));

    return `
      <div class="card">
        <div class="card-head">
          <h3>${U.icon("chip")}슬롯별 코어 기여</h3>
          <span class="tiny dim">높은 부위부터 강화하면 티어가 빨리 열립니다</span>
        </div>
        <div class="card-body stack-sm">
          ${rows
            .map(
              (r) => `
            <button class="contrib-row" type="button" data-slot="${r.slot.id}">
              <span class="cr-icon">${U.icon(r.slot.icon)}</span>
              <span class="cr-name">${U.esc(r.slot.name)}<small>+${r.state.level} · 돌파 ${r.state.bt}</small></span>
              <span class="cr-bar"><span class="bar"><i style="width:${Math.round((r.value / maxValue) * 100)}%"></i></span></span>
              <span class="cr-val mono">${U.num(r.value)}<small>${r.share}%</small></span>
            </button>`
            )
            .join("")}
          <p class="tiny dim" style="margin-top:2px">합계 <b class="mono" style="color:var(--gold)">${U.num(OGG.sim.coreScore(s))}</b> 코어 · 등급·시그니처 증폭이 부위별로 합산된 값입니다(팬 모델).</p>
        </div>
      </div>`;
  }

  function logPanel(s) {
    const rows = s.log.length
      ? s.log
          .map(
            (l) => `<div class="log-line is-${l.kind}"><span class="lt">${l.t}</span><span class="lx">${l.text}</span></div>`
          )
          .join("")
      : `<div class="log-empty">아직 기록이 없습니다. 강화를 눌러 보세요.</div>`;
    return `
      <div class="log-panel">
        <div class="log-head">
          <span>Simulation Log</span>
          <span>${U.num(s.stats.attempts)} attempts</span>
        </div>
        <div class="log-body" id="logBody">${rows}</div>
      </div>`;
  }

  /* ------------------------------------------------------------- render */
  function render(data) {
    const s = ensureState();
    state = s;
    const m = data.simModel;

    return `
    <div class="stack" style="gap:20px">
      <section class="section">
        <div class="section-head">
          <div class="titles">
            <span class="eyebrow">Overgeared Simulator</span>
            <h2 class="section-title">부위별 슬롯 강화 · 오버클럭 시뮬레이터</h2>
            <p class="section-desc">
              부위를 고르고 <b>강화</b>와 <b>돌파</b>를 직접 눌러 보세요. 슬롯이 쌓이면 코어 점수가 오르고,
              기준 점수를 넘으면 <b>오버클럭</b> 단계가 열립니다. 진행 상태는 이 브라우저에 저장됩니다.
            </p>
          </div>
          <div class="row-wrap" style="gap:8px">
            <button class="btn btn-ghost btn-sm" type="button" data-act="reset">${U.icon("refresh")}초기화</button>
          </div>
        </div>

        <div class="notice">
          ${U.icon("alert")}
          <span>
            <b>수치 안내 · </b>${U.esc(m.disclaimer)}
            모든 확률·비용·코어 점수는 <code style="color:var(--gold)">data/game-data.json → simModel</code>에서 조정할 수 있습니다.
          </span>
        </div>

        <div class="row-wrap" style="gap:10px;justify-content:space-between">
          <div class="row" style="gap:8px">
            <span class="icon-tile is-sm is-cyan">${U.icon("chip")}</span>
            <span>
              <span class="tiny dim" style="display:block">보유 파브라늄</span>
              <b class="mono" style="font-size:16px;color:var(--gold)" id="fabValue">${U.num(s.fabranium)}</b>
            </span>
          </div>
          <span class="tiny dim">안전 강화 상한 +${OGG.sim.safeLimit(s)}${s.signature ? " (시그니처 +2 적용)" : ""} · 최대 돌파 ${m.maxBreakthrough}단계</span>
        </div>
      </section>

      <div class="sim-shell">
        <div class="sim-main">
          <div class="card">
            <div class="card-head">
              <h3>${U.icon("armor")}장비 슬롯</h3>
              <span class="tiny dim">부위를 선택하면 아래 조작 패널이 바뀝니다</span>
            </div>
            <div class="card-body stack-sm">
              <div class="slot-grid" id="slotGrid">${slotsPanel(s)}</div>
              <div id="slotControlWrap">${slotControl(s)}</div>
            </div>
          </div>

        </div>

        <div class="sim-side">
          <div id="corePanelWrap">${corePanel(data, s)}</div>
          <div id="battlePanelWrap">${battlePanel(s)}</div>
          <section class="widget">
            <div class="widget-head"><span class="wh-l">${U.icon("book")} 읽는 법</span></div>
            <div class="widget-body stack-sm">
              <p class="tiny" style="color:var(--text-2);line-height:1.7"><b style="color:var(--gold)">강화</b> — 슬롯 단계를 올려 해당 부위 능력치를 높입니다.</p>
              <p class="tiny" style="color:var(--text-2);line-height:1.7"><b style="color:var(--cyan)">돌파</b> — 상한에 닿았을 때 최대 레벨을 늘리고 착용 장비 능력치를 비율로 올립니다.</p>
              <p class="tiny" style="color:var(--text-2);line-height:1.7"><b style="color:var(--gold)">코어 점수</b> — 강화·돌파·등급·시그니처 증폭이 합산되어 오버클럭 해금 기준이 됩니다.</p>
              <p class="tiny" style="color:var(--text-2);line-height:1.7"><b style="color:var(--green)">장비 분해</b> — 남는 장비를 파브라늄으로 바꿉니다(공식: 분해·강화 실패로 획득).</p>
              <a class="btn btn-ghost btn-sm btn-block" href="#/weapons">${U.icon("swords")}무기별 추천 세팅 보기</a>
            </div>
          </section>
        </div>

        <div class="sim-extra">
          <div id="simSummaryWrap">${summaryPanel(s)}</div>
          <div id="contribWrap">${contributionPanel(s)}</div>
          <div id="logWrap">${logPanel(s)}</div>
        </div>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------ refresh */
  function refresh(root, data, parts) {
    const s = state;
    const set = (sel, html) => {
      const el = root.querySelector(sel);
      if (el) el.innerHTML = html;
    };
    const want = parts || ["slots", "control", "core", "battle", "summary", "contrib", "log", "fab"];
    if (want.includes("slots")) set("#slotGrid", slotsPanel(s));
    if (want.includes("control")) set("#slotControlWrap", slotControl(s));
    if (want.includes("core")) set("#corePanelWrap", corePanel(data, s));
    if (want.includes("battle")) set("#battlePanelWrap", battlePanel(s));
    if (want.includes("summary")) set("#simSummaryWrap", summaryPanel(s));
    if (want.includes("contrib")) set("#contribWrap", contributionPanel(s));
    if (want.includes("log")) set("#logWrap", logPanel(s));
    if (want.includes("fab")) {
      const fab = root.querySelector("#fabValue");
      if (fab) fab.textContent = U.num(s.fabranium);
    }
    OGG.sim.save(s);
  }

  function doEnhance(root, data, times) {
    const s = state;
    let stopped = null;
    for (let i = 0; i < times; i += 1) {
      const r = OGG.sim.attempt(s, s.selected);
      const name = OGG.index.slots[s.selected].name;
      if (r.kind === "success") {
        pushLog(s, "ok", `[${name}] +${r.level} 강화 성공 · ${U.pct(r.chance)} · 파브라늄 -${r.cost}`);
      } else if (r.kind === "fail") {
        pushLog(s, "fail", `[${name}] +${r.target} 실패 · 파브라늄 +${r.refund} 회수`);
      } else if (r.kind === "capped") {
        pushLog(s, "info", `[${name}] 강화 상한 도달 — 돌파가 필요합니다`);
        stopped = "capped";
        break;
      } else if (r.kind === "nofab") {
        pushLog(s, "info", `파브라늄 부족 (필요 ${r.cost}) — 장비 분해로 보충하세요`);
        stopped = "nofab";
        break;
      }
    }
    if (times > 1) {
      const okCount = s.log.slice(0, times).filter((l) => l.kind === "ok").length;
      U.toast(`${times}회 시도 완료 (성공 ${okCount}회)`, "refresh");
    }
    refresh(root, data);
    if (stopped === "capped") U.toast("상한에 도달했습니다. 돌파를 사용해 보세요", "spark");
    if (stopped === "nofab") U.toast("파브라늄이 부족합니다", "alert");
  }

  function doBreak(root, data) {
    const s = state;
    const name = OGG.index.slots[s.selected].name;
    const r = OGG.sim.breakthrough(s, s.selected);
    if (r.kind === "ok") {
      pushLog(s, "info", `[${name}] 돌파 ${r.bt}단계 완료 · 최대 +${r.cap} · 파브라늄 -${r.cost}`);
      U.toast(`${name} 슬롯 ${r.bt}차 돌파 완료 — 최대 +${r.cap}`, "spark");
    } else if (r.kind === "notcapped") {
      U.toast("강화 상한에 도달해야 돌파할 수 있습니다", "alert");
    } else if (r.kind === "max") {
      U.toast("더 이상 돌파할 수 없습니다", "alert");
    } else if (r.kind === "nofab") {
      pushLog(s, "info", `돌파 실패 · 파브라늄 부족 (필요 ${r.cost})`);
      U.toast("파브라늄이 부족합니다", "alert");
    }
    refresh(root, data);
  }

  function doCycle(root, data, times) {
    const s = state;
    let fired = false;
    for (let i = 0; i < times; i += 1) {
      const r = OGG.sim.battleCycle(s);
      pushLog(s, "sys", `전투 사이클 · 게이지 ${r.before}% → ${r.after}% (+${r.gain})`);
      if (r.after > r.before && r.after >= OGG.data.simModel.gaugeMax) {
        fired = true;
        break;
      }
    }
    refresh(root, data, ["battle", "log"]);
    if (fired) U.toast("게이지가 가득 찼습니다. 오버클럭을 발동하세요", "flame");
  }

  function doActivate(root, data) {
    const s = state;
    const info = OGG.sim.tierFor(OGG.sim.coreScore(s));
    if (!info.current) {
      U.toast("코어 점수가 부족해 오버클럭이 잠겨 있습니다", "alert");
      return;
    }
    if (!OGG.sim.activate(s)) {
      U.toast("게이지가 아직 가득 차지 않았습니다", "info");
      return;
    }
    pushLog(s, "info", `오버클럭 발동 · ${info.current.name} (${info.current.model})`);
    U.toast(`${info.current.name} 발동!`, "flame");
    refresh(root, data, ["battle", "summary", "log"]);
    window.clearTimeout(activeTimer);
    activeTimer = window.setTimeout(() => {
      s.active = false;
      OGG.sim.save(s);
      const live = root.querySelector("#battlePanelWrap");
      if (live) live.innerHTML = battlePanel(s);
    }, 8000);
  }

  /* -------------------------------------------------------------- mount */
  function mount(root, data) {
    U.on(root, "click", "[data-slot]", function (event, el) {
      state.selected = el.getAttribute("data-slot");
      OGG.sim.save(state);
      refresh(root, data, ["slots", "control"]);
    });

    U.on(root, "click", "[data-act]", function (event, el) {
      const act = el.getAttribute("data-act");
      if (act === "enhance") doEnhance(root, data, 1);
      else if (act === "enhance10") doEnhance(root, data, 10);
      else if (act === "break") doBreak(root, data);
      else if (act === "scavenge") {
        const amount = OGG.sim.scavenge(state);
        pushLog(state, "ok", `장비 분해 · 파브라늄 +${amount}`);
        U.toast(`장비 분해로 파브라늄 +${amount}`, "download");
        refresh(root, data, ["fab", "control", "core", "summary", "log"]);
      } else if (act === "cycle") doCycle(root, data, 1);
      else if (act === "cycle3") doCycle(root, data, 3);
      else if (act === "activate") doActivate(root, data);
      else if (act === "reset") {
        if (window.confirm("시뮬레이터 진행 상태와 기록을 초기화할까요?")) {
          state = OGG.sim.reset();
          pushLog(state, "sys", "시뮬레이터 초기화 · 파브라늄 " + U.num(state.fabranium));
          OGG.sim.save(state);
          refresh(root, data);
          U.toast("초기화했습니다", "refresh");
        }
      }
    });

    U.on(root, "change", "#gradeSelect", function (event, el) {
      state.grade = el.value;
      pushLog(state, "sys", `장비 등급 변경 → ${OGG.index.grades[el.value].name}`);
      refresh(root, data, ["core", "battle", "summary", "log", "control"]);
    });

    U.on(root, "change", "#signatureToggle", function (event, el) {
      state.signature = el.checked;
      pushLog(state, "sys", `시그니처 장비 ${el.checked ? "적용" : "해제"} (안전 강화 ${OGG.sim.safeLimit(state)})`);
      refresh(root, data);
    });
  }

  function unmount() {
    window.clearTimeout(activeTimer);
  }

  OGG.views = OGG.views || {};
  OGG.views.simulator = { render, mount, unmount };
})(window);
