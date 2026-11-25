/* ==========================================================================
   sim.js — 오버기어드 강화(경험치 누적) · 오버클럭 시뮬레이션 모델
   --------------------------------------------------------------------------
   · 강화 1회에 지급되는 '강화 경험치'의 확률은 넥슨 공식 확률 공개표
     (data/game-data.json > enhanceExp, Lv.0~20 · 전 부위 공통)를 그대로 씁니다.
     공식 표에는 성공/실패 구분이 없고, 시도마다 경험치가 지급됩니다.
   · 레벨업에 필요한 경험치, 강화 비용, 돌파 비용, 코어 점수 산식처럼
     공식에 없는 값은 같은 JSON의 simModel(추정치)에서 읽습니다.
   수치를 바꾸고 싶다면 JSON의 enhanceExp / simModel 만 수정하면 됩니다.
   ========================================================================== */
(function (window) {
  "use strict";

  const OGG = (window.OGG = window.OGG || {});
  const KEY = "ogg.sim.v2"; /* v1은 성공/실패 모델이라 저장 형식이 다릅니다 */

  function model() {
    return OGG.data.simModel;
  }

  function officialTable() {
    return OGG.data.enhanceExp;
  }

  /* ------------------------------------------------------------- brackets */
  /**
   * 현재 레벨에서 강화했을 때 쓰이는 확률 구간.
   * 공식 표는 Lv.0~20 까지라 그 위는 마지막 공개 구간을 그대로 씁니다(추정).
   */
  function bracketFor(level) {
    const table = officialTable();
    const found = table.brackets.find((b) => level >= b.from && level <= b.to);
    if (found) return { outcomes: found.outcomes, official: true };
    const last = table.brackets[table.brackets.length - 1];
    return { outcomes: last.outcomes, official: false };
  }

  function odds(state, slotId) {
    const slot = state.slots[slotId];
    const b = bracketFor(slot.level);
    return b.outcomes.map((o) => ({ exp: o.exp, rate: o.rate, official: b.official }));
  }

  function expectedExp(state, slotId) {
    return odds(state, slotId).reduce((sum, o) => sum + (o.exp * o.rate) / 100, 0);
  }

  function rollExp(level) {
    const b = bracketFor(level);
    let r = Math.random() * 100;
    let acc = 0;
    for (let i = 0; i < b.outcomes.length; i += 1) {
      acc += b.outcomes[i].rate;
      if (r < acc) return b.outcomes[i];
    }
    return b.outcomes[b.outcomes.length - 1];
  }

  /* --------------------------------------------------------- requirements */
  /** 다음 레벨에 필요한 경험치 (추정치) */
  function requiredExpFor(targetLevel) {
    const m = model();
    const arr = m.requiredExpByTarget;
    if (targetLevel <= arr.length) return arr[targetLevel - 1];
    return m.requiredExpBeyondBase + (targetLevel - arr.length - 1) * m.requiredExpBeyondStep;
  }

  /** 강화 1회 비용 (추정치) */
  function attemptCostFor(targetLevel) {
    const m = model();
    return m.costBase + m.costPerLevel * targetLevel;
  }

  /* ---------------------------------------------------------------- state */
  function createState() {
    const m = model();
    const slots = {};
    OGG.data.slots.forEach((s) => {
      slots[s.id] = { level: 0, exp: 0, bt: 0 };
    });
    return {
      fabranium: m.fabraniumStart,
      selected: "weapon",
      signature: false,
      grade: "epic",
      slots,
      gauge: 0,
      active: false,
      stats: {
        attempts: 0,
        levelUps: 0,
        exp: 0,
        spent: 0,
        breakthrough: 0,
        activations: 0,
        plus1000: 0,
        plus400: 0,
        plus150: 0
      },
      log: []
    };
  }

  function load() {
    const saved = OGG.util.storeGet(KEY, null);
    const fresh = createState();
    if (!saved || typeof saved !== "object" || !saved.slots) return fresh;
    /* 데이터가 바뀌어도 저장된 진행이 깨지지 않게 얕게 병합합니다. */
    const state = Object.assign(fresh, saved, {
      slots: Object.assign({}, fresh.slots, saved.slots),
      stats: Object.assign({}, fresh.stats, saved.stats || {})
    });
    Object.keys(state.slots).forEach((id) => {
      const slot = state.slots[id];
      slot.level = Number(slot.level) || 0;
      slot.exp = Number(slot.exp) || 0;
      slot.bt = Number(slot.bt) || 0;
    });
    if (!state.slots[state.selected]) state.selected = "weapon";
    return state;
  }

  function save(state) {
    OGG.util.storeSet(KEY, state);
  }

  /* -------------------------------------------------------------- helpers */
  function maxLevel(state, slotId) {
    const m = model();
    const slot = state.slots[slotId];
    return m.baseMaxLevel + slot.bt * m.levelsPerBreakthrough;
  }

  /** 선택한 슬롯의 진행 상태(레벨·경험치·필요 경험치) */
  function progress(state, slotId) {
    const slot = state.slots[slotId];
    const cap = maxLevel(state, slotId);
    const capped = slot.level >= cap;
    const need = capped ? 0 : requiredExpFor(slot.level + 1);
    return {
      level: slot.level,
      cap,
      exp: slot.exp,
      need,
      capped,
      ratio: need ? OGG.util.clamp(slot.exp / need, 0, 1) : 1,
      remaining: need ? Math.max(0, need - slot.exp) : 0,
      tries: need ? Math.ceil((need - slot.exp) / expectedExp(state, slotId)) : 0
    };
  }

  /**
   * 강화 1회.
   * kind: "levelup" | "exp" | "capped" | "nofab"
   */
  function attempt(state, slotId) {
    const slot = state.slots[slotId];
    const cap = maxLevel(state, slotId);
    if (slot.level >= cap) return { kind: "capped", cap };

    const cost = attemptCostFor(slot.level + 1);
    if (state.fabranium < cost) return { kind: "nofab", cost };

    const from = slot.level;
    const outcome = rollExp(from);
    const bracketOfficial = bracketFor(from).official;

    state.fabranium -= cost;
    state.stats.attempts += 1;
    state.stats.spent += cost;
    state.stats.exp += outcome.exp;
    const key = `plus${outcome.exp}`;
    if (key in state.stats) state.stats[key] += 1;

    slot.exp += outcome.exp;
    let levelUps = 0;
    while (slot.level < cap) {
      const need = requiredExpFor(slot.level + 1);
      if (slot.exp < need) break;
      slot.exp -= need;
      slot.level += 1;
      levelUps += 1;
      state.stats.levelUps += 1;
    }
    if (slot.level >= cap) slot.exp = 0;

    return {
      kind: levelUps ? "levelup" : "exp",
      exp: outcome.exp,
      rate: outcome.rate,
      official: bracketOfficial,
      cost,
      from,
      level: slot.level,
      levelUps,
      cap
    };
  }

  function breakthroughCost(state, slotId) {
    const m = model();
    const slot = state.slots[slotId];
    return m.breakthroughCostBase + slot.bt * m.breakthroughCostStep;
  }

  /** kind: "ok" | "notcapped" | "max" | "nofab" */
  function breakthrough(state, slotId) {
    const m = model();
    const slot = state.slots[slotId];
    if (slot.bt >= m.maxBreakthrough) return { kind: "max" };
    if (slot.level < maxLevel(state, slotId)) return { kind: "notcapped", need: maxLevel(state, slotId) };
    const cost = breakthroughCost(state, slotId);
    if (state.fabranium < cost) return { kind: "nofab", cost };
    state.fabranium -= cost;
    state.stats.spent += cost;
    slot.bt += 1;
    state.stats.breakthrough += 1;
    return { kind: "ok", bt: slot.bt, cap: maxLevel(state, slotId), cost };
  }

  /** 파브라늄 수급(장비 분해) */
  function scavenge(state) {
    const m = model();
    const amount = m.scavengeBase + Math.floor(Math.random() * m.scavengeRange);
    state.fabranium += amount;
    return amount;
  }

  /* ------------------------------------------------------- projections */
  const projectionCache = {};

  /**
   * 공식 확률 + 추정 필요 경험치로 '레벨 start → target' 도달까지
   * 시도 횟수·파브라늄을 몬테카를로로 계산합니다. (상태는 바꾸지 않음)
   */
  function project(start, target, runs) {
    const n = runs || 4000;
    const key = `${start}:${target}:${n}`;
    if (projectionCache[key]) return projectionCache[key];

    const tries = [];
    let costSum = 0;
    for (let i = 0; i < n; i += 1) {
      let level = start;
      let exp = 0;
      let t = 0;
      let cost = 0;
      while (level < target && t < 4000) {
        const outcome = rollExp(level);
        exp += outcome.exp;
        t += 1;
        cost += attemptCostFor(level + 1);
        while (level < target) {
          const need = requiredExpFor(level + 1);
          if (exp < need) break;
          exp -= need;
          level += 1;
        }
      }
      tries.push(t);
      costSum += cost;
    }
    tries.sort((a, b) => a - b);
    const sum = tries.reduce((a, b) => a + b, 0);
    const result = {
      runs: n,
      mean: Math.round((sum / n) * 10) / 10,
      p50: tries[Math.floor(n * 0.5)],
      p90: tries[Math.floor(n * 0.9)],
      meanCost: Math.round(costSum / n)
    };
    projectionCache[key] = result;
    return result;
  }

  /* ------------------------------------------------------- core · battle */
  function gradeOf(state) {
    return OGG.index.grades[state.grade] || OGG.data.grades[0];
  }

  function slotCore(state, slotId) {
    const m = model();
    const slot = state.slots[slotId];
    const meta = OGG.index.slots[slotId];
    const grade = gradeOf(state);
    const weight = meta ? meta.weight : 1;
    const base = slot.level * m.corePerLevel + slot.bt * m.corePerBreakthrough;
    const amp = state.signature ? m.signatureAmpBase * grade.mult : 0;
    return Math.round(base * weight + grade.coreFlat * weight + amp * weight);
  }

  function coreScore(state) {
    return Object.keys(state.slots).reduce((sum, id) => sum + slotCore(state, id), 0);
  }

  function tierFor(score) {
    const tiers = OGG.data.overclockTiers;
    let current = null;
    let next = null;
    tiers.forEach((t) => {
      if (score >= t.threshold) current = t;
      else if (!next) next = t;
    });
    return { current, next, tiers };
  }

  function sealedUnlocked(state, slotId) {
    const m = model();
    const slot = state.slots[slotId];
    return (m.sealedLevels || [5, 10, 15]).filter((lv) => slot.level >= lv).length;
  }

  /** 전투 1사이클: 일반 공격 3회 + 치명타 1회 */
  function battleCycle(state) {
    const m = model();
    const gain = m.cycleNormal * m.gaugeNormal + m.cycleCrit * m.gaugeCrit;
    const before = state.gauge;
    state.gauge = OGG.util.clamp(state.gauge + gain, 0, m.gaugeMax);
    const fired = state.gauge >= m.gaugeMax;
    return { gain, before, after: state.gauge, fired };
  }

  function activate(state) {
    const m = model();
    if (state.gauge < m.gaugeMax) return false;
    state.gauge = 0;
    state.active = true;
    state.stats.activations += 1;
    return true;
  }

  OGG.sim = {
    KEY,
    createState,
    load,
    save,
    bracketFor,
    odds,
    expectedExp,
    requiredExpFor,
    attemptCostFor,
    maxLevel,
    progress,
    attempt,
    breakthroughCost,
    breakthrough,
    scavenge,
    project,
    gradeOf,
    slotCore,
    coreScore,
    tierFor,
    sealedUnlocked,
    battleCycle,
    activate,
    reset() {
      const fresh = createState();
      OGG.util.storeSet(KEY, fresh);
      return fresh;
    }
  };
})(window);
