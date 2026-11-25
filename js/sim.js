/* ==========================================================================
   sim.js — 오버기어드 / 오버클럭 시뮬레이션 모델
   --------------------------------------------------------------------------
   IMPORTANT: 공식 확률·비용·코어 점수 산식은 공개되지 않았습니다.
   이 파일의 수치는 data/game-data.json 의 simModel 값을 그대로 쓰는
   "팬 모델"이며, 화면에서는 항상 추정치로 표시됩니다.
   수치를 바꾸고 싶다면 JSON의 simModel만 수정하면 됩니다.
   ========================================================================== */
(function (window) {
  "use strict";

  const OGG = (window.OGG = window.OGG || {});
  const KEY = "ogg.sim.v1";

  function model() {
    return OGG.data.simModel;
  }

  function createState() {
    const m = model();
    const slots = {};
    OGG.data.slots.forEach((s) => {
      slots[s.id] = { level: 0, bt: 0 };
    });
    return {
      fabranium: m.fabraniumStart,
      selected: "weapon",
      signature: false,
      grade: "epic",
      slots,
      gauge: 0,
      active: false,
      stats: { attempts: 0, success: 0, fail: 0, breakthrough: 0, spent: 0, gained: 0, activations: 0 },
      log: []
    };
  }

  function load() {
    const saved = OGG.util.storeGet(KEY, null);
    const fresh = createState();
    if (!saved || typeof saved !== "object" || !saved.slots) return fresh;
    /* shallow-merge so a data update with new slots does not break a save */
    const state = Object.assign(fresh, saved, {
      slots: Object.assign({}, fresh.slots, saved.slots),
      stats: Object.assign({}, fresh.stats, saved.stats || {})
    });
    if (!state.slots[state.selected]) state.selected = "weapon";
    return state;
  }

  function save(state) {
    OGG.util.storeSet(KEY, state);
  }

  function maxLevel(state, slotId) {
    const m = model();
    const slot = state.slots[slotId];
    return m.baseMaxLevel + slot.bt * m.levelsPerBreakthrough;
  }

  function safeLimit(state) {
    const m = model();
    return m.safeEnhanceBase + (state.signature ? m.signatureSafeBonus : 0);
  }

  function tableFor(targetLevel) {
    return model().successRateByLevel.find((row) => targetLevel >= row.from && targetLevel <= row.to);
  }

  /** Chance that the next attempt on this slot succeeds. */
  function chance(state, slotId) {
    const slot = state.slots[slotId];
    const target = slot.level + 1;
    if (target <= safeLimit(state)) return 1;
    const row = tableFor(target);
    return row ? row.rate : 0.18;
  }

  function attemptCost(state, slotId) {
    const slot = state.slots[slotId];
    const target = slot.level + 1;
    if (target <= safeLimit(state)) {
      const row = tableFor(target);
      return Math.round((row ? row.cost : 20) * 0.8);
    }
    const row = tableFor(target);
    return row ? row.cost : 120;
  }

  function breakthroughCost(state, slotId) {
    const slot = state.slots[slotId];
    return 200 + slot.bt * 150;
  }

  /**
   * One enhancement attempt.
   * kind: "success" | "fail" | "capped" | "nofab"
   */
  function attempt(state, slotId) {
    const m = model();
    const slot = state.slots[slotId];
    const cap = maxLevel(state, slotId);
    if (slot.level >= cap) return { kind: "capped" };
    const cost = attemptCost(state, slotId);
    if (state.fabranium < cost) return { kind: "nofab", cost };
    const target = slot.level + 1;
    const p = chance(state, slotId);
    const roll = Math.random();

    state.fabranium -= cost;
    state.stats.attempts += 1;
    state.stats.spent += cost;

    if (roll < p) {
      slot.level = target;
      state.stats.success += 1;
      return { kind: "success", level: slot.level, cap, cost, chance: p, target };
    }

    /* 실패: 공식적으로 강화 실패 시 파브라늄을 획득합니다. */
    const refund = m.failRefundBase + Math.floor(target / 2);
    state.fabranium += refund;
    state.stats.gained += refund;
    state.stats.fail += 1;
    return { kind: "fail", level: slot.level, cap, cost, refund, chance: p, target };
  }

  /** kind: "ok" | "notcapped" | "max" | "nofab" */
  function breakthrough(state, slotId) {
    const m = model();
    const slot = state.slots[slotId];
    if (slot.bt >= m.maxBreakthrough) return { kind: "max" };
    if (slot.level < maxLevel(state, slotId)) return { kind: "notcapped" };
    const cost = breakthroughCost(state, slotId);
    if (state.fabranium < cost) return { kind: "nofab", cost };
    state.fabranium -= cost;
    state.stats.spent += cost;
    slot.bt += 1;
    state.stats.breakthrough += 1;
    return { kind: "ok", bt: slot.bt, cap: maxLevel(state, slotId), cost };
  }

  /** 파브라늄 수급(장비 분해 / 필드 획득) */
  function scavenge(state) {
    const amount = 60 + Math.floor(Math.random() * 121); /* 60~180 */
    state.fabranium += amount;
    state.stats.gained += amount;
    return amount;
  }

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
    return Math.round((base * weight + grade.coreFlat * weight + amp * weight));
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
    const slot = state.slots[slotId];
    let count = 0;
    if (slot.level >= 3) count += 1;
    if (slot.level >= 7) count += 1;
    if (slot.bt >= 2) count += 1;
    return count;
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
    maxLevel,
    safeLimit,
    chance,
    attemptCost,
    breakthroughCost,
    attempt,
    breakthrough,
    scavenge,
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
