/* ==========================================================================
   views/simulator.js — 오버기어드(강화 경험치) · 오버클럭 시뮬레이터
   --------------------------------------------------------------------------
   공식 확률표(넥슨)대로 강화 경험치를 쌓고, 경험치가 가득 차면 레벨이 오릅니다.
   공식에 없는 값(필요 경험치·비용·코어 점수 등)은 '추정치'로 구분해 표시합니다.
   ========================================================================== */
(function (window) {
  "use strict";

  const OGG = (window.OGG = window.OGG || {});
  const U = OGG.util;

  let state = null;
  let activeTimer = 0;

  function stamp() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  }

  function pushLog(s, kind, text) {
    s.log.unshift({ t: stamp(), kind, text });
    s.log = s.log.slice(0, 60);
  }

  function ensureState() {
    if (!state) {
      state = OGG.sim.load();
      if (!state.log.length) {
        pushLog(state, "sys", "시뮬레이터 준비 완료 · 강화 확률은 넥슨 공식 확률표 기준");
        OGG.sim.save(state);
      }
    }
    return state;
  }

  /* ---------------------------------------------------------------- slots */
  function slotTile(s, slotId) {
    const slot = s.slots[slotId];
    const meta = OGG.index.slots[slotId];
    const p = OGG.sim.progress(s, slotId);
    const baseCap = OGG.data.simModel.baseMaxLevel;
    const ticks = [];
    for (let i = 1; i <= p.cap; i += 1) {
      const on = i <= slot.level;
      const bt = i > baseCap;
      ticks.push(`<i class="${on ? "on" : ""} ${bt ? "bt" : ""}"></i>`);
    }
    const sealed = OGG.sim.sealedUnlocked(s, slotId);
    return `
      <button class="slot ${slotId === s.selected ? "is-selected" : ""} ${p.capped ? "is-capped" : ""}" type="button" data-slot="${slotId}" aria-pressed="${slotId === s.selected}">
        <div class="slot-top">
          ${U.icon(meta.icon)}
          <span class="slot-name">${U.esc(meta.name)}</span>
          <span class="slot-lv"><b>+${slot.level}</b>/${p.cap}</span>
        </div>
        <div class="ticks" aria-hidden="true">${ticks.join("")}</div>
        <div class="slot-exp">
          <span class="bar ${p.capped ? "is-cyan" : "is-soft"}"><i style="width:${Math.round(p.ratio * 100)}%"></i></span>
          <span class="slot-exp-t">${p.capped ? "상한" : `${U.num(p.exp)}/${U.num(p.need)}`}</span>
        </div>
        <div class="slot-foot">
          <span class="pips" title="돌파 ${slot.bt}단계">${[0, 1, 2].map((i) => `<i class="${i < slot.bt ? "on" : ""}"></i>`).join("")}</span>
          <span class="slot-sealed ${sealed ? "is-open" : ""}">봉인 ${sealed}/3</span>
        </div>
      </button>`;
  }

  function slotsPanel(s) {
    return OGG.data.slots.map((slot) => slotTile(s, slot.id)).join("");
  }

  /* -------------------------------------------------------- official odds */
  function oddsChips(odds) {
    return odds
      .map((o) => {
        const cls = o.exp >= 1000 ? "is-big" : o.exp >= 400 ? "is-mid" : "is-low";
        return `<span class="odds-chip ${cls}"><b>+${U.num(o.exp)}</b><small>${o.rate}%</small></span>`;
      })
      .join("");
  }

  function bracketLabel(level) {
    const t = OGG.data.enhanceExp;
    const b = t.brackets.find((x) => level >= x.from && level <= x.to);
    if (!b) return "Lv." + t.maxLevel + " 초과 · 구간 미공개";
    return `Lv.${b.from}~${b.to}`;
  }

  /* -------------------------------------------------------- slot control */
  function slotControl(s) {
    const meta = OGG.index.slots[s.selected];
    const slot = s.slots[s.selected];
    const p = OGG.sim.progress(s, s.selected);
    const cost = OGG.sim.attemptCostFor(slot.level + 1);
    const odds = OGG.sim.odds(s, s.selected);
    const ev = OGG.sim.expectedExp(s, s.selected);
    const official = slot.level < OGG.data.enhanceExp.maxLevel;
    const btCost = OGG.sim.breakthroughCost(s, s.selected);
    const maxBt = OGG.data.simModel.maxBreakthrough;
    const canBreak = p.capped && slot.bt < maxBt;
    const sealed = OGG.sim.sealedUnlocked(s, s.selected);
    const nextSealed = (OGG.data.simModel.sealedLevels || []).find((lv) => slot.level < lv);

    const needLeft = p.capped ? 0 : p.remaining;
    const expectTries = p.capped ? 0 : Math.max(1, Math.ceil(needLeft / (ev || 1)));

    return `
      <div class="slot-control">
        <div class="sc-head">
          <span class="icon-tile is-sm">${U.icon(meta.icon)}</span>
          <div style="flex:1 1 auto;min-width:0">
            <h3>${U.esc(meta.name)} 슬롯</h3>
            <span class="stat">${U.esc(meta.stat)} · ${U.esc(meta.note)}</span>
          </div>
          <span class="badge ${p.capped ? "badge-cyan" : "badge-ghost"}">${p.capped ? "상한 도달" : `다음 레벨까지 ${p.tries}회쯤`}</span>
        </div>

        <div class="sc-level">
          <span class="big">+${slot.level}</span>
          <span class="of">/ 최대 +${p.cap} · 돌파 ${slot.bt}/${maxBt}</span>
        </div>

        <div class="bar ${p.capped ? "is-cyan" : ""}"><i style="width:${(slot.level / p.cap) * 100}%"></i></div>

        <div class="sc-exp">
          <div class="sc-exp-head">
            <span>Lv.${slot.level}${p.capped ? "" : ` → Lv.${slot.level + 1}`}</span>
            <b class="mono">${p.capped ? "상한" : `${U.num(p.exp)} / ${U.num(p.need)}`}</b>
          </div>
          <div class="bar is-soft ${p.capped ? "is-cyan" : ""}"><i style="width:${Math.round(p.ratio * 100)}%"></i></div>
          <p class="tiny dim" style="margin:2px 0 0">
            ${p.capped
              ? `${U.icon("spark")} 최대 레벨입니다. 돌파하면 상한이 +${OGG.data.simModel.levelsPerBreakthrough}단계 열립니다.`
              : `${U.icon("info")} 남은 경험치 <b class="mono">${U.num(needLeft)}</b> · 1회 기대 경험치 <b class="mono">+${U.num(ev)}</b> 기준 <b>${expectTries}회</b>쯤`}
          </p>
        </div>

        <div class="odds-box">
          <div class="odds-head">
            <span>공식 확률 ${official ? U.confBadge("official") : `<span class="badge badge-ghost">구간 미공개</span>`}</span>
            <span class="tiny dim mono">${bracketLabel(slot.level)}</span>
          </div>
          <div class="odds-row">${oddsChips(odds)}</div>
          ${official ? "" : `<p class="tiny dim" style="margin:0">Lv.${OGG.data.enhanceExp.maxLevel} 초과 구간은 공식 표에 없어, 마지막 공개 구간(Lv.15~19) 분포를 그대로 쓰는 추정입니다.</p>`}
        </div>

        <div class="sc-meta">
          <div class="meta-box">
            <span class="mk">소모 파브라늄</span>
            <span class="mv">${U.num(cost)}</span>
          </div>
          <div class="meta-box">
            <span class="mk">필요 경험치</span>
            <span class="mv">${p.capped ? "—" : U.num(p.need)}</span>
          </div>
          <div class="meta-box">
            <span class="mk">봉인 해제</span>
            <span class="mv">${sealed}/3${nextSealed ? ` <span style="color:var(--text-4);font-weight:400">(+${nextSealed} 필요)</span>` : ""}</span>
          </div>
        </div>

        <div class="sc-actions">
          <button class="btn btn-primary" type="button" data-act="enhance" ${p.capped ? "disabled" : ""}>${U.icon("hammer")}1회 강화</button>
          <button class="btn" type="button" data-act="enhance10" ${p.capped ? "disabled" : ""}>${U.icon("refresh")}10회</button>
          <button class="btn" type="button" data-act="until" ${p.capped ? "disabled" : ""}>${U.icon("gauge")}레벨업까지</button>
          <button class="btn ${canBreak ? "btn-cyan" : "btn-ghost"}" type="button" data-act="break" ${canBreak ? "" : "disabled"}>
            ${U.icon("spark")}돌파 ${slot.bt < maxBt ? `(${U.num(btCost)})` : ""}
          </button>
        </div>

        <div class="row-wrap" style="gap:8px;justify-content:space-between">
          <span class="tiny dim">${U.icon("info")} 공식 표에는 성공·실패 구분이 없고, 시도할 때마다 경험치가 쌓입니다.</span>
          <button class="btn btn-ghost btn-sm" type="button" data-act="scavenge">${U.icon("download")}장비 분해</button>
        </div>
      </div>`;
  }

  /* ---------------------------------------------------------- 공식 표 카드 */
  function officialCard(s) {
    const t = OGG.data.enhanceExp;
    const slot = s.slots[s.selected];
    const active = t.brackets.findIndex((b) => slot.level >= b.from && slot.level <= b.to);

    const rateOf = (b, exp) => {
      const o = b.outcomes.find((x) => x.exp === exp);
      return o ? `${o.rate}%` : "—";
    };
    const evOf = (b) => Math.round(b.outcomes.reduce((sum, o) => sum + (o.exp * o.rate) / 100, 0));

    const bracketRows = t.brackets
      .map((b, i) => {
        return `
          <tr class="${i === active ? "is-active" : ""}">
            <td>Lv.${b.from} → Lv.${b.to + 1}</td>
            <td>${rateOf(b, 150)}</td>
            <td>${rateOf(b, 400)}</td>
            <td>${rateOf(b, 1000)}</td>
            <td class="mono">+${U.num(evOf(b))}</td>
          </tr>`;
      })
      .join("");

    const levelRows = [];
    for (let level = 0; level < t.maxLevel; level += 1) {
      const b = OGG.sim.bracketFor(level);
      levelRows.push(`
        <tr class="${level === slot.level ? "is-active" : ""}">
          <td>Lv.${level} → Lv.${level + 1}</td>
          <td>${rateOf(b, 150)}</td>
          <td>${rateOf(b, 400)}</td>
          <td>${rateOf(b, 1000)}</td>
        </tr>`);
    }

    return `
      <div class="card" id="expTableCard">
        <div class="card-head">
          <h3>${U.icon("scroll")}공식 확률표 · 강화 경험치</h3>
          ${U.confBadge("official")}
        </div>
        <div class="card-body stack-sm">
          <p class="tiny" style="color:var(--text-2);line-height:1.7;margin:0">
            넥슨 확률형 아이템 공개 페이지의 <b>‘오버기어드 강화’(전 부위 공통)</b> 표를 그대로 옮겼습니다.
            강화 1회마다 아래 확률로 강화 경험치가 지급되고, 경험치가 가득 차면 레벨이 오릅니다.
            <a href="${t.sourceUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--gold);font-weight:700;white-space:nowrap;display:inline-flex;align-items:center;gap:3px;vertical-align:-1px">원문 보기 ${U.icon("external")}</a> <span class="tiny dim" style="white-space:nowrap">(2026.11.26 확인)</span>
          </p>
          <div class="table-wrap">
            <table class="cmp exp-table">
              <thead>
                <tr>
                  <th>적용 구간</th>
                  <th>+150</th>
                  <th>+400</th>
                  <th>+1,000</th>
                  <th>1회 기대 경험치</th>
                </tr>
              </thead>
              <tbody>${bracketRows}</tbody>
            </table>
          </div>
          <details class="exp-levels">
            <summary>${U.icon("chevron-down")} Lv.0 → Lv.20 전체 20단계 보기</summary>
            <div class="table-wrap">
              <table class="cmp exp-table">
                <thead>
                  <tr><th>단계</th><th>+150</th><th>+400</th><th>+1,000</th></tr>
                </thead>
                <tbody>${levelRows.join("")}</tbody>
              </table>
            </div>
          </details>
          <p class="tiny dim" style="margin:0;line-height:1.6">
            ${U.icon("info")} 공식 표에는 <b>레벨업에 필요한 경험치 양</b>과 <b>강화 비용</b>이 없습니다.
            시뮬레이터의 필요 경험치·비용은 ${U.confBadge("estimate")} 체험용으로 계산한 값입니다.
          </p>
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
              <span class="tiny dim">코어 증폭</span>
            </label>
          </div>
        </div>
        <p class="tiny dim" style="line-height:1.6">
          ${U.icon("info")} 등급·시그니처는 코어 점수에만 반영했습니다. 시그니처의 ‘안전 강화 +2단계’는
          공식 확률표가 전 부위 공통 단일 표라 확률 계산에는 넣지 않았습니다.
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

  /* ------------------------------------------------------ 기대값 (추정) */
  function projectionCard(s) {
    const m = OGG.data.simModel;
    const slot = s.slots[s.selected];
    const cap = OGG.sim.maxLevel(s, s.selected);
    const officialMax = OGG.data.enhanceExp.maxLevel;
    const target = cap;
    const next = slot.level < cap ? OGG.sim.project(slot.level, slot.level + 1, 2000) : null;
    const whole = slot.level < target ? OGG.sim.project(slot.level, target, 2000) : null;

    const officialNote = target > officialMax
      ? `Lv.${officialMax} 초과 구간은 공식 표에 없어 마지막 공개 구간(Lv.15~19) 분포로 계산했습니다.`
      : "공식 확률 + 추정 필요 경험치로 2,000번 굴려 본 결과입니다.";

    return `
      <div class="card">
        <div class="card-head">
          <h3>${U.icon("gauge")}기대값 · 몇 번 눌러야 오를까</h3>
          ${U.confBadge("estimate")}
        </div>
        <div class="card-body stack-sm">
          <div class="sim-summary">
            <div class="meta-box">
              <span class="mk">다음 레벨까지 (평균)</span>
              <span class="mv">${next ? `${U.num(next.mean)}회` : "상한"}</span>
            </div>
            <div class="meta-box">
              <span class="mk">운 나쁜 편 (상위 10%)</span>
              <span class="mv">${next ? `${U.num(next.p90)}회` : "—"}</span>
            </div>
            <div class="meta-box">
              <span class="mk">Lv.${target}까지 (평균)</span>
              <span class="mv">${whole ? `${U.num(whole.mean)}회` : "도달"}</span>
            </div>
            <div class="meta-box">
              <span class="mk">Lv.${target} 도달 상위 10%</span>
              <span class="mv">${whole ? `${U.num(whole.p90)}회` : "—"}</span>
            </div>
            <div class="meta-box">
              <span class="mk">예상 파브라늄</span>
              <span class="mv gold">${whole ? U.num(whole.meanCost) : "—"}</span>
            </div>
            <div class="meta-box">
              <span class="mk">보유 파브라늄</span>
              <span class="mv gold">${U.num(s.fabranium)}</span>
            </div>
          </div>
          <p class="tiny dim" style="margin:0;line-height:1.6">
            ${U.icon("info")} ${officialNote} 평균은 기대값, 상위 10%는 운이 나쁜 쪽입니다.
            필요 경험치가 공개되면 숫자가 달라집니다.
          </p>
        </div>
      </div>`;
  }

  function summaryPanel(s) {
    const st = s.stats;
    return `
      <div class="card">
        <div class="card-head">
          <h3>${U.icon("hammer")}강화 통계</h3>
          <span class="tiny dim">시도마다 경험치 결과를 세어 둡니다</span>
        </div>
        <div class="card-body">
          <div class="sim-summary">
            <div class="meta-box"><span class="mk">시도</span><span class="mv">${U.num(st.attempts)}</span></div>
            <div class="meta-box"><span class="mk">레벨업</span><span class="mv" style="color:var(--green)">${U.num(st.levelUps)}</span></div>
            <div class="meta-box"><span class="mk">+1,000 적중</span><span class="mv" style="color:var(--green)">${U.num(st.plus1000)}</span></div>
            <div class="meta-box"><span class="mk">+400 적중</span><span class="mv" style="color:var(--gold)">${U.num(st.plus400)}</span></div>
            <div class="meta-box"><span class="mk">+150 적중</span><span class="mv" style="color:var(--red)">${U.num(st.plus150)}</span></div>
            <div class="meta-box"><span class="mk">총 경험치</span><span class="mv">${U.num(st.exp)}</span></div>
            <div class="meta-box"><span class="mk">소모 파브라늄</span><span class="mv">${U.num(st.spent)}</span></div>
            <div class="meta-box"><span class="mk">돌파</span><span class="mv" style="color:var(--cyan)">${U.num(st.breakthrough)}</span></div>
            <div class="meta-box"><span class="mk">발동</span><span class="mv" style="color:var(--gold)">${U.num(st.activations)}</span></div>
          </div>
        </div>
      </div>`;
  }

  /* 슬롯별 코어 기여도 */
  function contributionPanel(s) {
    const total = OGG.sim.coreScore(s) || 1;
    const rows = OGG.data.slots
      .map((slot) => {
        const value = OGG.sim.slotCore(s, slot.id);
        const share = Math.round((value / total) * 100);
        return { slot, value, share, state: s.slots[slot.id] };
      })
      .sort((a, b) => b.value - a.value);
    const maxValue = Math.max(1, ...rows.map((r) => r.value));

    return `
      <div class="card">
        <div class="card-head">
          <h3>${U.icon("chip")}슬롯별 코어 기여</h3>
          <span class="tiny dim">높은 부위부터 올리면 티어가 빨리 열립니다</span>
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
          <p class="tiny dim" style="margin-top:2px">합계 <b class="mono" style="color:var(--gold)">${U.num(OGG.sim.coreScore(s))}</b> 코어 · 등급·시그니처 증폭이 부위별로 합산된 값입니다.</p>
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
    const t = data.enhanceExp;

    return `
    <div class="stack" style="gap:20px">
      <section class="section">
        <div class="section-head">
          <div class="titles">
            <span class="eyebrow">Overgeared Simulator</span>
            <h2 class="section-title">부위별 슬롯 강화 · 오버클럭 시뮬레이터</h2>
            <p class="section-desc">
              공식 확률표대로 강화를 눌러 보세요. 시도할 때마다 <b>강화 경험치</b>가 쌓이고,
              경험치가 가득 차면 슬롯 레벨이 오릅니다. 슬롯이 쌓이면 코어 점수가 오르고,
              기준 점수를 넘으면 <b>오버클럭</b>이 열립니다. 진행 상태는 이 브라우저에 저장됩니다.
            </p>
          </div>
          <div class="row-wrap" style="gap:8px">
            <button class="btn btn-ghost btn-sm" type="button" data-act="reset">${U.icon("refresh")}초기화</button>
          </div>
        </div>

        <div class="notice notice-info">
          ${U.icon("check")}
          <span>
            <b>공식 확률 그대로 · </b>Lv.0~10은 <b>+1000 100%</b>, Lv.10~15는 <b>+400 70% · +1000 30%</b>,
            Lv.15~20은 <b>+150 45% · +400 35% · +1000 20%</b>. 넥슨 확률형 아이템 공개표
            <a href="${t.sourceUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--cyan);font-weight:700">원문</a>과 같은 값입니다.
          </span>
        </div>
        <div class="notice">
          ${U.icon("alert")}
          <span>
            <b>추정치 안내 · </b>${U.esc(m.disclaimer)}
            공식 수치가 공개되면 반영해 업데이트합니다.
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
          <span class="tiny dim">공식 표 기준 Lv.10까지는 100%로 경험치가 쌓입니다 · 최대 돌파 ${m.maxBreakthrough}단계(추정)</span>
        </div>
      </section>

      <div class="sim-shell">
        <div class="sim-main">
          <div class="card">
            <div class="card-head">
              <h3>${U.icon("armor")}장비 슬롯</h3>
              <span class="tiny dim">부위를 선택하면 아래 조작 패널과 확률이 바뀝니다</span>
            </div>
            <div class="card-body stack-sm">
              <div class="slot-grid" id="slotGrid">${slotsPanel(s)}</div>
              <div id="slotControlWrap">${slotControl(s)}</div>
            </div>
          </div>
          <div id="expTableWrap">${officialCard(s)}</div>
        </div>

        <div class="sim-side">
          <div id="corePanelWrap">${corePanel(data, s)}</div>
          <div id="battlePanelWrap">${battlePanel(s)}</div>
          <section class="widget">
            <div class="widget-head"><span class="wh-l">${U.icon("book")} 읽는 법</span></div>
            <div class="widget-body stack-sm">
              <p class="tiny" style="color:var(--text-2);line-height:1.7"><b style="color:var(--gold)">강화</b> — 한 번 누를 때마다 공식 확률로 강화 경험치가 쌓입니다. 가득 차면 레벨이 오르고, 단계가 내려가지 않습니다.</p>
              <p class="tiny" style="color:var(--text-2);line-height:1.7"><b style="color:var(--green)">경험치</b> — 같은 레벨이라도 +1,000이 터지면 한 번에, +150이면 여러 번 필요합니다.</p>
              <p class="tiny" style="color:var(--text-2);line-height:1.7"><b style="color:var(--cyan)">돌파</b> — 최대 레벨(+${m.baseMaxLevel})에 닿았을 때 상한을 +${m.levelsPerBreakthrough} 늘리고 착용 장비 능력치를 비율로 올립니다. 비용·확률은 비공개 추정치입니다.</p>
              <p class="tiny" style="color:var(--text-2);line-height:1.7"><b style="color:var(--gold)">코어 점수</b> — 강화·돌파·등급·시그니처 증폭이 합산되어 오버클럭 해금 기준이 됩니다(추정).</p>
              <p class="tiny" style="color:var(--text-2);line-height:1.7"><b style="color:var(--green)">장비 분해</b> — 남는 장비를 파브라늄으로 바꿉니다(공식: 분해·강화 실패로 획득).</p>
              <a class="btn btn-ghost btn-sm btn-block" href="#/weapons">${U.icon("swords")}무기별 추천 세팅 보기</a>
            </div>
          </section>
        </div>

        <div class="sim-extra">
          <div id="simSummaryWrap">${summaryPanel(s)}</div>
          <div id="projectionWrap">${projectionCard(s)}</div>
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
    const want = parts || ["slots", "control", "core", "battle", "summary", "proj", "contrib", "log", "fab", "expTable"];
    if (want.includes("slots")) set("#slotGrid", slotsPanel(s));
    if (want.includes("control")) set("#slotControlWrap", slotControl(s));
    if (want.includes("core")) set("#corePanelWrap", corePanel(data, s));
    if (want.includes("battle")) set("#battlePanelWrap", battlePanel(s));
    if (want.includes("summary")) set("#simSummaryWrap", summaryPanel(s));
    if (want.includes("proj")) set("#projectionWrap", projectionCard(s));
    if (want.includes("contrib")) set("#contribWrap", contributionPanel(s));
    if (want.includes("log")) set("#logWrap", logPanel(s));
    if (want.includes("expTable")) set("#expTableWrap", officialCard(s));
    if (want.includes("fab")) {
      const fab = root.querySelector("#fabValue");
      if (fab) fab.textContent = U.num(s.fabranium);
    }
    OGG.sim.save(s);
  }

  /* ------------------------------------------------------------- actions */
  function logAttempt(s, name, r) {
    if (r.kind === "levelup") {
      pushLog(
        s,
        "lv",
        `[${name}] +${U.num(r.exp)} (${r.rate}%) → Lv.${r.level} 달성${r.levelUps > 1 ? ` · ${r.levelUps}레벨 상승` : ""} · 파브라늄 -${U.num(r.cost)}`
      );
      return;
    }
    const p = OGG.sim.progress(s, s.selected);
    const kind = r.exp >= 1000 ? "big" : r.exp >= 400 ? "mid" : "low";
    pushLog(s, kind, `[${name}] +${U.num(r.exp)} (${r.rate}%) · 경험치 ${U.num(p.exp)}/${U.num(p.need)} · 파브라늄 -${U.num(r.cost)}`);
  }

  function doEnhance(root, data, mode) {
    const s = state;
    const name = OGG.index.slots[s.selected].name;
    const limit = mode === "one" ? 1 : mode === "ten" ? 10 : 300;
    let tries = 0;
    let expSum = 0;
    let levelUps = 0;
    let stopped = null;

    for (let i = 0; i < limit; i += 1) {
      const r = OGG.sim.attempt(s, s.selected);
      if (r.kind === "capped") {
        stopped = "capped";
        break;
      }
      if (r.kind === "nofab") {
        stopped = "nofab";
        break;
      }
      tries += 1;
      expSum += r.exp;
      levelUps += r.levelUps;
      logAttempt(s, name, r);
      if (mode === "until" && levelUps > 0) break;
    }

    if (stopped === "capped") pushLog(s, "info", `[${name}] 최대 레벨 도달 — 돌파가 필요합니다`);
    if (stopped === "nofab") pushLog(s, "info", "파브라늄 부족 — 장비 분해로 보충하세요");

    refresh(root, data, ["slots", "control", "core", "summary", "proj", "contrib", "log", "fab", "expTable"]);

    if (!tries && stopped === "nofab") {
      U.toast("파브라늄이 부족합니다", "alert");
      return;
    }
    if (!tries && stopped === "capped") {
      U.toast("최대 레벨입니다. 돌파로 상한을 늘려 보세요", "spark");
      return;
    }
    const label = mode === "until" ? "레벨업까지" : `${tries}회`;
    if (levelUps > 0) U.toast(`${label} · 경험치 +${U.num(expSum)} · ${levelUps}레벨 상승`, "spark");
    else if (mode !== "one") U.toast(`${label} · 경험치 +${U.num(expSum)} (아직 레벨업 전)`, "refresh");
    if (stopped === "capped") U.toast("최대 레벨 도달 — 돌파를 사용할 수 있습니다", "spark");
    if (stopped === "nofab") U.toast("파브라늄이 부족합니다", "alert");
  }

  function doBreak(root, data) {
    const s = state;
    const name = OGG.index.slots[s.selected].name;
    const r = OGG.sim.breakthrough(s, s.selected);
    if (r.kind === "ok") {
      pushLog(s, "info", `[${name}] 돌파 ${r.bt}단계 완료 · 최대 +${r.cap} · 파브라늄 -${U.num(r.cost)}`);
      U.toast(`${name} 슬롯 ${r.bt}차 돌파 — 최대 +${r.cap}`, "spark");
    } else if (r.kind === "notcapped") {
      U.toast(`최대 레벨(+${r.need})에 도달해야 돌파할 수 있습니다`, "alert");
    } else if (r.kind === "max") {
      U.toast("더 이상 돌파할 수 없습니다", "alert");
    } else if (r.kind === "nofab") {
      pushLog(s, "info", `돌파 실패 · 파브라늄 부족 (필요 ${U.num(r.cost)})`);
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
      refresh(root, data, ["slots", "control", "expTable", "proj"]);
    });

    U.on(root, "click", "[data-act]", function (event, el) {
      const act = el.getAttribute("data-act");
      if (act === "enhance") doEnhance(root, data, "one");
      else if (act === "enhance10") doEnhance(root, data, "ten");
      else if (act === "until") doEnhance(root, data, "until");
      else if (act === "break") doBreak(root, data);
      else if (act === "scavenge") {
        const amount = OGG.sim.scavenge(state);
        pushLog(state, "ok", `장비 분해 · 파브라늄 +${U.num(amount)}`);
        U.toast(`장비 분해로 파브라늄 +${U.num(amount)}`, "download");
        refresh(root, data, ["fab", "control", "summary", "log", "proj"]);
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
      pushLog(state, "sys", `장비 등급 변경 → ${OGG.index.grades[el.value].name} (코어 점수 추정)`);
      refresh(root, data, ["core", "battle", "summary", "log", "control", "contrib"]);
    });

    U.on(root, "change", "#signatureToggle", function (event, el) {
      state.signature = el.checked;
      pushLog(state, "sys", `시그니처 장비 ${el.checked ? "적용" : "해제"} · 코어 증폭 ${el.checked ? "적용" : "해제"} (추정)`);
      refresh(root, data);
    });
  }

  function unmount() {
    window.clearTimeout(activeTimer);
  }

  OGG.views = OGG.views || {};
  OGG.views.simulator = { render, mount, unmount };
})(window);
