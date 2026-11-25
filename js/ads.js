/* ==========================================================================
   ads.js — AdSense-ready ad slots
   --------------------------------------------------------------------------
   지금은 개발용 플레이스홀더만 그립니다. 실제 광고를 붙일 때는 아래
   config 세 줄만 채우면 모든 슬롯이 실제 AdSense 유닛으로 교체됩니다.

     1) <head>에 AdSense 스크립트 추가
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXX" crossorigin="anonymous"></script>
     2) OGG.ads.client / slots / enabled 수정
     3) 끝. (슬롯 위치·크기는 이미 예약되어 있어 레이아웃 시프트 없음)
   ========================================================================== */
(function (window) {
  "use strict";

  const OGG = (window.OGG = window.OGG || {});

  OGG.ads = {
    enabled: false,
    client: "", /* 예: "ca-pub-1234567890123456" */
    slots: {
      top: "", /* 728x90 / 320x100 리더보드 */
      infeed: "", /* 반응형 인피드 */
      side: "" /* 300x250 */
    }
  };

  const UNITS = {
    top: { label: "상단 리더보드", desktop: "728x90", mobile: "320x100" },
    infeed: { label: "본문 인피드", desktop: "infeed", mobile: "infeed" },
    side: { label: "사이드", desktop: "300x250", mobile: "300x250" }
  };

  /**
   * Placeholder markup. Reserves the exact space the ad will occupy, so
   * turning ads on never pushes content around.
   */
  function adSlot(unit, label, opts) {
    const meta = UNITS[unit] || UNITS.infeed;
    const text = label || meta.label;
    const variant = (opts && opts.variant) || "";
    const size = variant === "mobile" ? meta.mobile : meta.desktop;
    const variantClass = variant === "mobile" ? "is-mobile" : variant === "desktop" ? "is-desktop" : "";
    return `
      <div class="ad-slot ${variantClass}" data-size="${size}" data-ad-unit="${unit}" data-ad-variant="${variant}" aria-label="광고 영역">
        <div class="ad-inner">
          <span class="ad-tag">AD SLOT</span>
          <span>[AD SLOT · Google AdSense 영역] ${text}</span>
          <span style="font-size:9px;opacity:.7">${size} · 개발 토글로 표시</span>
        </div>
      </div>`;
  }

  /** Replace every placeholder with a real <ins class="adsbygoogle"> unit. */
  function mountAds() {
    if (!OGG.ads.enabled || !OGG.ads.client) return;
    document.querySelectorAll(".ad-slot[data-ad-unit]").forEach((slot) => {
      const unit = slot.getAttribute("data-ad-unit");
      const variant = slot.getAttribute("data-ad-variant");
      if (variant === "mobile" || variant === "desktop") {
        /* 반응형으로 하나만 노출되는 두 벌 중복 유닛은 건너뜁니다 */
        return;
      }
      const slotId = OGG.ads.slots[unit];
      if (!slotId) return;
      slot.innerHTML = `
        <div class="ad-unit">
          <ins class="adsbygoogle" style="display:block"
               data-ad-client="${OGG.ads.client}"
               data-ad-slot="${slotId}"
               data-ad-format="auto"
               data-full-width-responsive="true"></ins>
        </div>`;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        /* AdSense script not loaded yet — nothing else to do */
      }
    });
  }

  OGG.adSlot = adSlot;
  OGG.mountAds = mountAds;
})(window);
