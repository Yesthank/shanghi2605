# Shanghai Map Beta1

**상하이 여행 인터랙티브 지도 PWA** (5/22~5/25, Atour Light 호텔, 가족 동행).

ralplan v3 합의 (Planner→Architect→Critic 3 iteration + Codex peer-review) 통과한 plan 으로 빌드. v8.3 prototype (`../prototype-map/`) 의 결정·UX 학습 + 분리 파일 구조 + PWA + 좌표 보정 + 신규 8필드.

## 빠른 시작

### 빌드
```bash
python _build_data.py        # data.js 재생성 (stops_v3.json/timestamps.json → data.js)
python build_inline.py       # 3 산출물 생성 (dist/index.{cn,intl,tertiary}.html)
```

`build_inline.py` 출력:
- `dist/index.cn.html` — Gaode 타일 (운영용)
- `dist/index.intl.html` — OSM 타일 (KR 검증 전용 — OSM 도 중국 차단)
- `dist/index.tertiary.html` — 긴급 단일 파일 (SW·Geolocation·prefetch 부재, 정적 지도+카드만)

### 로컬 실행
```bash
# 분리 모드 (개발)
python -m http.server 8080
# 브라우저 http://localhost:8080/

# 단일 파일 (Tertiary emergency)
# dist/index.tertiary.html 더블클릭 (file:// 동작)
```

## 가족 공유 가이드 (D-5 이후)

> **⚠️ D-10 ~ D-5 사이는 본인용 prototype 이미지 사용**.  Beta1.1 (D-5) 에 Unsplash/Wikimedia CC0 정화 후 가족 공유 시작 (ADR-005).

### iPhone Safari (홈 화면 추가)
1. Cloudflare Pages URL 카톡으로 받음
2. Safari 에서 URL 열기
3. 공유 버튼 → "홈 화면에 추가"
4. 첫 진입 시 "오프라인 준비" 모달 → **[확인]** 클릭 (출국 전 와이파이에서 1회만)
5. 약 15MB 타일 prefetch 진행률 표시 → 완료 후 비행기 모드 동작

### Android Chrome
1. URL 열기
2. 메뉴(⋮) → "홈 화면에 추가"
3. 위와 동일

### Android 9 이하 (PWA 미지원)
1. 카톡으로 `dist/index.tertiary.html` 파일 첨부 받기
2. 파일 앱에서 더블클릭 → 브라우저로 열기 → 정적 지도+카드 동작

### 캡티브 portal 호텔/카페 와이파이
- SW 가 portal 감지 → 상단 빨간 배너 "Wi-Fi 인증 필요" 표시
- 와이파이 로그인 페이지 인증 후 새로고침

## 운영 시나리오 (5/22~5/25)

| 시점 | 행동 | Fallback |
|---|---|---|
| 5/22 인천공항 | "오프라인 준비" 클릭 (ADR-004 하이브리드) | 호텔 wifi |
| 5/22~24 도보 | PWA 사용. 비행기 모드 OK | OSM 자동 dispatch (5회 onerror) |
| 카페·호텔 wifi | portal_blocked 배너 표시 시 인증 | LTE 로밍 |
| 배터리 <20% | 자동 low_battery mode (애니메이션 off) | 보조배터리 |
| 5/25 새벽 PVG | PWA 정상 가정. 인터넷 가용 baseline | (Beta1 OUT-OF-SCOPE: PVG critical fallback) |

## 파일 구조 (12 파일 + 4 doc)

```
beta1/
├── index.html          ─ 메인 entry, <meta referrer no-referrer>
├── manifest.json       ─ PWA 메타 (192/512 icon, standalone)
├── sw.js               ─ Service Worker (SHELL_CACHE 변종, SWR 타일, postFreeze guard)
├── styles.css          ─ 8색 카테고리 + bottom-sheet + print
├── data.js             ─ window.__DATA__ (26 stops + TIMESTAMPS + BUILD_FREEZE_DATE)
├── coords-fix.js       ─ pure GCJ-02 ↔ WGS-84 (eviltransform inline)
├── icons.js            ─ 10개 SVG (Lucide ISC + Maki CC0)
├── state.js            ─ immutable state + writer matrix + leaf freeze
├── search.js           ─ precompute haystack + stops_changed lazy reload
├── map.js              ─ Leaflet + Gaode/OSM 빌드분기 + 26 markers + Day polylines
├── ui.js               ─ 카드 modal + 4 degradation banners + 하이브리드 prefetch modal
├── app.js              ─ entry sequencing (initState→initMap→...→registerSW)
├── build_inline.py     ─ 3 산출물 빌더 (BUILD_ID = git short sha)
├── _build_data.py      ─ stops_v3.json → data.js 변환
├── MIGRATION.md        ─ v8.3 → Beta1 결정 5개 매핑
├── CONTRIBUTING.md     ─ PR checklist (Principle #6, ADR-005/006/007 enforce)
├── README.md           ─ (이 문서)
├── RALPLAN_PROMPT.md   ─ ralplan 합의 입력
├── vendor/             ─ Leaflet 1.9.4 + qrcode-generator (self-host)
├── icons/              ─ icon-192.png + icon-512.png (placeholder, D-9 정식 교체 권고)
├── __tests__/coords.test.html  ─ 5-known-points 단위 테스트
├── .omc/prd.json       ─ PRD 12 user stories
├── .omc/progress.txt   ─ ralph 진행 로그
└── dist/               ─ build_inline.py 산출물
    ├── index.cn.html
    ├── index.intl.html
    ├── index.tertiary.html
    └── BUILD_INFO.txt
```

## 핵심 ADR (요약 — 자세히 본 폴더 RALPLAN_PROMPT.md)

| ADR | 결정 |
|---|---|
| 001 | PWA + Service Worker (Workbox X, 직접 작성) |
| 002 | Gaode (cn) + OSM (intl, KR 전용) 빌드타임 분기 + `<meta referrer>` + sw.js `referrerPolicy` |
| 003 | eviltransform 알고리즘 inline (pure, attribution, latRaw/lngRaw 보존) |
| 004 | 하이브리드 prefetch modal (PWA 첫 진입 + 영구 수동 버튼) |
| 005 | 이미지: D-10 prototype + D-5 Unsplash/Wikimedia 정화 분리, footer disclaimer 영구 |
| 006 | build_inline.py 3 산출, BUILD_ID = `git rev-parse --short HEAD`, SHELL_CACHE 변종 |
| 007 | state.js immutable + writer 매트릭스 + LEAF freeze + 4 enum degradation_mode |

## D-9 mass session 작업 (deferred from D-10)

- [ ] iPhone Safari 실기기 검증 (PWA install + 오프라인 + 캡티브 portal 시뮬)
- [ ] Android Chrome 실기기 검증
- [ ] approx=true 10 stops 정밀 좌표 보정 (현재 ±150m → ±20m)
- [ ] Beta1.1 이미지 정화 (Unsplash/Wikimedia CC0 26개)
- [ ] icons/icon-192.png + 512.png 정식 디자인 (현재 placeholder solid color)
- [ ] freeze rehearsal (06-10h slot, fresh state)
- [ ] D-5 가족 카톡 push "지도 한 번 열어줘"
- [ ] git tag `v1.0-frozen` push (D-10 Phase D 시작 fresh head)
- [ ] Tertiary 카톡 첨부 한도 실측

## 부모 폴더 참조

- `../prototype-map/PROGRESS.md` — v1~v8.3 결정 로그 (MIGRATION.md 참조)
- `../prototype-map/stops_v3.json` — 26 stops base (\_build_data.py 입력)
- `../prototype-map/timestamps.json` — 42 YouTube timestamp 페어
- `../analysis/` — Stage 1~5 분석 결과
- `../script/*.srt` — 자막 원본

## 라이선스 / 출처

- Map data © AutoNavi/Gaode (cn variant) / OpenStreetMap contributors (intl variant) — **개인 비영리 사용**
- Icons © Lucide (ISC) + Maki (CC BY 3.0)
- Coords algorithm © eviltransform (MIT, googollee/eviltransform)
- Leaflet 1.9.4 (BSD-2-Clause)
- qrcode-generator (MIT)
- Stop 이미지: Beta1.0 = Baidu prototype (학습용) / Beta1.1 = Unsplash/Wikimedia CC0 (가족 공유본)
