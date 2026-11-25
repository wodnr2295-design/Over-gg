# over.gg — 템빨: 오버기어드 비공식 팬 정보 사이트

프로토타입 (정적 HTML/CSS/JS, 빌드 과정 없음). 게임 공식 이미지·아이콘을 사용하지 않고
모든 아이콘을 자체 제작 SVG로 그렸습니다.

```
site/overgeared-gg/
├─ index.html                  셸 + 아이콘 스프라이트 + 모달
├─ css/core.css                디자인 토큰·레이아웃·헤더·푸터·광고 슬롯
├─ css/views.css               페이지별 컴포넌트
├─ js/util.js                  DOM/포맷/스토리지 헬퍼
├─ js/data.js                  데이터 로더(+ 오프라인 폴백)
├─ js/ads.js                   AdSense 슬롯/플레이스홀더
├─ js/sim.js                   오버기어드·오버클럭 시뮬레이션 모델
├─ js/views/*.js               홈 / 무기 / 시뮬레이터 / 게시판 / 패치
├─ data/game-data.json         ★ 단일 데이터 소스
├─ data/game-data.fallback.js  JSON에서 자동 생성(오프라인용)
├─ tools/embed_data.py         폴백 재생성 스크립트
└─ assets/favicon.svg
```

## 실행

```bash
cd site/overgeared-gg
python3 -m http.server 8765
# http://127.0.0.1:8765/
```

`index.html`을 더블클릭해도 동작하지만(file://), 이 경우 브라우저가 JSON fetch를 막아
`data/game-data.fallback.js` 스냅샷으로 실행됩니다. 로컬 서버 사용을 권장합니다.

## 데이터 갱신 (자동 업데이트 준비)

1. `data/game-data.json`만 수정합니다.
   - `patches` / `roadmap` / `systems` / `weapons` / `sources` / `updatedAt`
2. HTTP로 서비스 중이면 저장 즉시 모든 페이지에 반영됩니다.
3. `file://` 대응이 필요하면 폴백 스냅샷을 재생성합니다.

```bash
python3 tools/embed_data.py
```

크롤러·스케줄 액션이 JSON만 덮어쓰도록 설계되어 있고, 사이트 코드는 수정할 필요가 없습니다.
스키마는 `schemaVersion`으로 관리합니다.

### 신뢰도 표기

모든 항목은 `confidence`를 가집니다.

| 값 | 화면 표기 | 의미 |
|---|---|---|
| `official` | 공식 확인 | 공식 홈페이지·공식 채널에서 직접 확인 |
| `press` | 공식 발표 보도 | 복수 매체가 동일하게 보도한 발표 내용 |
| `estimate` | 팬 모델 추정 | 비공개 수치를 체험용으로 모델링한 값 |

## 광고 슬롯 (AdSense 대비)

- 위치: 상단 리더보드(728×90 / 모바일 320×100), 본문 인피드(반응형), 우측 사이드(300×250)
- 미리보기: 푸터의 **광고 영역 미리보기** 토글 또는 `?ads=1`
- 실제 게재: `js/ads.js`의 `OGG.ads`에서 `enabled: true`, `client`, `slots`만 채우고
  `<head>`에 AdSense 스크립트를 추가하면 플레이스홀더가 실제 유닛으로 교체됩니다.
  슬롯 공간은 미리 예약되어 있어 레이아웃 시프트가 없습니다.

## 검증

`tools/qa.py` — Playwright로 콘솔 에러 0건, 라우팅/필터/시뮬레이터/게시판 인터랙션,
가로 오버플로, 스크린샷(1280px · 390px)을 확인합니다.

```bash
python3 -m pip install playwright && python3 -m playwright install chromium-headless-shell
python3 tools/qa.py
```

## 법적 고지

본 사이트는 비공식 팬 사이트이며, 템빨: 오버기어드의 상표 및 저작권은 원저작권자에게 있습니다.
문의: dkahdekd@naver.com
