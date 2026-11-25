/* ==========================================================================
   data.js — loads data/game-data.json (single source of truth)
   --------------------------------------------------------------------------
   · Served over http(s): fetch() reads data/game-data.json every load, so a
     crawler or scheduled action only needs to replace that JSON.
   · Opened from disk (file://): fetch is blocked by the browser, so the page
     falls back to data/game-data.fallback.js, regenerated from the same JSON
     by tools/embed_data.py.
   ========================================================================== */
(function (window) {
  "use strict";

  const OGG = (window.OGG = window.OGG || {});
  const JSON_PATH = "data/game-data.json";

  function fetchJson() {
    if (window.location.protocol === "file:") {
      return Promise.reject(new Error("file:// 에서는 fetch가 차단됩니다"));
    }
    if (typeof window.fetch !== "function") {
      return Promise.reject(new Error("fetch 미지원 브라우저"));
    }
    return window
      .fetch(JSON_PATH, { cache: "no-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });
  }

  function validate(data) {
    if (!data || !data.game || !Array.isArray(data.weapons) || !data.simModel) {
      throw new Error("game-data 스키마가 올바르지 않습니다");
    }
    return data;
  }

  OGG.dataReady = fetchJson()
    .then((data) => {
      OGG.dataSource = "json";
      return data;
    })
    .catch((err) => {
      OGG.dataSource = "fallback";
      OGG.dataLoadNote = err && err.message ? err.message : String(err);
      if (window.__OGG_DATA__) return window.__OGG_DATA__;
      throw err;
    })
    .then(validate)
    .then((data) => {
      OGG.data = data;

      /* quick indexes */
      OGG.index = {
        weapons: Object.fromEntries(data.weapons.map((w) => [w.id, w])),
        classes: Object.fromEntries(data.classes.map((c) => [c.id, c])),
        systems: Object.fromEntries(data.systems.map((s) => [s.id, s])),
        slots: Object.fromEntries(data.slots.map((s) => [s.id, s])),
        grades: Object.fromEntries(data.grades.map((g) => [g.id, g]))
      };

      /* footer stamps */
      const stamp = document.getElementById("dataStamp");
      if (stamp) stamp.textContent = OGG.util.formatDate(data.updatedAt, true);
      const year = document.getElementById("year");
      if (year) year.textContent = String(new Date().getFullYear());
      return data;
    });

  /* ---------------------------------------------------------------------
     Legal copy (kept in code so the JSON stays focused on game data)
     --------------------------------------------------------------------- */
  OGG.legal = {
    privacy: {
      title: "개인정보처리방침",
      updated: "2026-11-26",
      body: `
        <p>오버.gg(이하 "본 사이트")는 템빨: 오버기어드의 비공식 팬 정보 사이트로, 회원가입·로그인·결제 기능이 없습니다. 본 사이트가 처리하는 정보는 아래와 같습니다.</p>
        <h3>1. 수집하는 개인정보</h3>
        <ul>
          <li>본 사이트는 별도의 회원 정보를 수집하지 않습니다.</li>
          <li>게시판에 작성한 글·댓글·닉네임은 <b>사용자의 브라우저(localStorage)에만</b> 저장되며 서버로 전송되지 않습니다.</li>
          <li>시뮬레이터 진행 상태(파브라늄, 강화 단계 등)도 브라우저에만 저장됩니다.</li>
        </ul>
        <h3>2. 쿠키 및 유사 기술</h3>
        <ul>
          <li>본 사이트 자체는 분석·광고 목적의 쿠키를 설치하지 않습니다.</li>
          <li>화면 설정(선택한 무기, 저장한 세팅 등)은 브라우저 저장소(localStorage)에 저장됩니다.</li>
          <li>향후 Google AdSense 등 제3자 광고를 게재하는 경우, 광고 사업자가 쿠키를 사용할 수 있으며 그 시점에 본 방침을 갱신하고 고지합니다.</li>
        </ul>
        <h3>3. 보관 및 파기</h3>
        <ul>
          <li>브라우저에 저장된 데이터는 사용자가 브라우저 데이터를 삭제하면 즉시 사라집니다.</li>
          <li>사이트에는 해당 데이터의 사본이 남지 않습니다.</li>
        </ul>
        <h3>4. 제3자 제공</h3>
        <ul>
          <li>본 사이트는 사용자의 정보를 제3자에게 판매하거나 제공하지 않습니다.</li>
          <li>외부 링크(공식 홈페이지, 보도 기사)로 이동할 경우 해당 사이트의 정책이 적용됩니다.</li>
        </ul>
        <h3>5. 이용자의 권리</h3>
        <ul>
          <li>브라우저 설정에서 저장된 데이터를 언제든 직접 삭제할 수 있습니다.</li>
          <li>문의: <a href="mailto:dkahdekd@naver.com">dkahdekd@naver.com</a></li>
        </ul>
        <h3>6. 고지</h3>
        <p>본 사이트는 비공식 팬 사이트이며, 템빨: 오버기어드의 상표 및 저작권은 원저작권자에게 있습니다. 본 사이트는 넥슨 및 그레이게임즈와 제휴·후원 관계가 없습니다.</p>
      `
    },
    terms: {
      title: "이용약관",
      updated: "2026-11-26",
      body: `
        <p>본 약관은 오버.gg(이하 "본 사이트")의 이용 조건을 정합니다. 본 사이트를 이용하면 아래 내용에 동의한 것으로 봅니다.</p>
        <h3>1. 서비스의 성격</h3>
        <ul>
          <li>본 사이트는 게임 <b>템빨: 오버기어드</b>의 비공식 팬 정보·시뮬레이터 사이트입니다.</li>
          <li>게임 운영사·개발사와 어떠한 제휴 관계도 없으며, 공식 정보를 대체하지 않습니다.</li>
          <li>서비스는 예고 없이 변경되거나 중단될 수 있습니다.</li>
        </ul>
        <h3>2. 정보의 정확성</h3>
        <ul>
          <li>게임 정보는 공식 홈페이지·공개 보도 등 확인 가능한 출처를 기준으로 정리합니다.</li>
          <li>강화 확률·비용·코어 점수 산식 등 공개되지 않은 수치는 <b>시뮬레이터용 추정치</b>이며 실제 게임과 다를 수 있습니다.</li>
          <li>본 사이트의 정보를 근거로 한 게임 내 판단·손실에 대해 본 사이트는 책임지지 않습니다.</li>
        </ul>
        <h3>3. 지식재산권</h3>
        <ul>
          <li>게임의 명칭·세계관·캐릭터에 대한 권리는 원저작권자에게 있습니다.</li>
          <li>본 사이트의 아이콘·UI·문장은 직접 제작한 것이며, 게임 내 공식 이미지·아이콘을 복제하지 않았습니다.</li>
          <li>권리자의 요청이 있을 경우 해당 내용을 즉시 수정 또는 삭제합니다.</li>
        </ul>
        <h3>4. 게시판 이용</h3>
        <ul>
          <li>게시판은 서버 없이 브라우저 저장소에만 저장되는 체험용 기능이며, 실제 서버에 게시되지 않습니다.</li>
          <li>타인의 명예를 훼손하거나 불법 정보를 게시하는 행위를 금합니다.</li>
          <li>'운영자' 표시가 있는 글은 사이트 운영자가 예시로 작성한 글입니다.</li>
        </ul>
        <h3>5. 면책 및 문의</h3>
        <ul>
          <li>본 사이트는 비공식 팬 사이트이며, 템빨: 오버기어드의 상표 및 저작권은 원저작권자에게 있습니다.</li>
          <li>문의: <a href="mailto:dkahdekd@naver.com">dkahdekd@naver.com</a></li>
        </ul>
      `
    }
  };
})(window);
