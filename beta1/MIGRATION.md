# MIGRATION — prototype v8.3 → Beta1

**Source**: `../prototype-map/PROGRESS.md` (v1~v8.3 + Lessons 7개)
**Target**: this folder (`beta1/`)

Beta1 은 v8.3 의 단일-HTML prototype 을 12 파일로 분리하면서 **검증된 UX 결정 5개를 그대로 이식**하고, 라이선스·신뢰성·오프라인 측면을 강화합니다. UI 코드는 새로 작성하되 패턴은 v8.3 에서 검증된 것을 따릅니다.

---

## 결정 매핑 (5개)

### 1. Vanilla HTML + Leaflet 1.9.4 유지
- **v8.3 결정**: PROGRESS.md "Map Library: Leaflet + OSM (Mapbox/Naver 제외)" — API 키 불필요, 비용 0, 후쿠오카 패턴 재사용
- **Beta1 적용**: 동일. React/Vue/Svelte 도입 X. Leaflet self-hosted (`vendor/leaflet.min.js`).
- **이식 방식**: 동일 라이브러리, 동일 init 패턴. 단 OSM → Gaode raster (cn variant) 로 타일 source 만 교체.
- **차이점**: Leaflet CDN → vendor/ 자체 호스팅 (오프라인 PWA precache 보장).

### 2. 자동재생·컨트롤바 제거
- **v8.3 결정**: PROGRESS.md "UI 진화: 자동재생 → 정적 + minimize 드로어" + Lessons #5 "컨트롤바·자동재생 = 화면 작은 모바일에서 거의 항상 제거 대상"
- **Beta1 적용**: prev/play/next 버튼 0개. tier overlay 플래시 0. 사용자 명시적 입력 (Day chip, 검색, 카드 클릭) 만 동작.
- **이식 방식**: index.html `.header` 에 control bar 없음. 진행 상황 인디케이터만 prefetch modal 안에 격리.

### 3. 수빈 source = 카톡/지도 직접 추천만 (보너스 한국 여행자 추천 분리)
- **v8.3 결정**: PROGRESS.md "데이터 정직성: Suvin 출처 엄격 분리" — v5/v6 에서 그랜드마마·꾸이만롱·Flair 제거, "youtube only" 재라벨
- **Beta1 적용**: data.js 의 `source` 필드 그대로 보존 ("youtube+suvin" / "youtube" / "suvin" / "notion"). Beta1 UI 는 source 별 별도 표시는 하지 않으나, 향후 Beta2 에서 source filter chip 추가 가능.
- **이식 방식**: stops_v3.json → data.js 변환 시 source 필드 1:1 보존 (categoryIconKey 만 신규 추가).

### 4. YouTube 출처 = 타임스탬프 URL (`&t=Ns`)
- **v8.3 결정**: PROGRESS.md "YouTube 타임스탬프: SRT 직접 파싱" — 42 페어 추출 (17 slug × 평균 2.5 영상)
- **Beta1 적용**: 동일. `data.js.TIMESTAMPS` 가 prototype-map/timestamps.json 을 1:1 import. ui.js `renderCard()` 가 stop.videos[].num 으로 TIMESTAMPS 조회 후 `&t=Ns` URL + ts_label 표시.
- **이식 방식**: build_data.py 가 timestamps.json 을 그대로 inline. 매핑 로직은 ui.js 의 `bits.push('<div class="videos">📺 ' + links + '</div>')` 블록.

### 5. 모바일 minimize = bottom-sheet 드래그 (translateY) — max-height collapse 폐기
- **v8.3 결정**: PROGRESS.md "v6: 슬라이드 드로어 (transform translateY)" + Lessons #2 "transform + position:fixed = iOS Safari 잼. max-height/bottom 으로 우회"
- **Beta1 적용**: `.stop-card` 에 `transform: translateY(100%)` (닫힘) ↔ `translateY(0)` (열림). max-height collapse 패턴은 폐기.
- **이식 방식**: styles.css `.stop-card.open { transform: translateY(0); }`. iOS Safari `position:fixed` + transform 충돌은 v7 에서 해결됐던 max-height 우회 패턴 대신, **단일 transform 만 사용** (drag handle 은 시각적 신호만, 실제 drag 이벤트 X — Beta2 에서 추가 가능).

---

## 신규 (v8.3 → Beta1 차이)

| 항목 | v8.3 | Beta1 |
|---|---|---|
| 파일 구조 | 단일 HTML 1.5MB | 12개 분리 (data/coords/icons/state/search/map/ui/app + sw + index + manifest + styles) |
| 좌표계 | GCJ-02 raw (~150m offset 허용) | GCJ-02 → WGS-84 변환 (eviltransform inline, ±50m) |
| 타일 | OSM | Gaode raster (cn variant) + OSM (intl variant, KR 검증) |
| 오프라인 | X | PWA + Service Worker + 사용자 trigger 타일 prefetch |
| 카테고리 | emoji icon | Lucide+Maki SVG + 8색 원형 배경 |
| 신규 8필드 | X | hours/closedDays/priceRange/reservation/payment/krMenu/krReviews/categoryIconKey |
| 라이선스 | Baidu 이미지 inline (회색) | Beta1.0 prototype 유지 + Beta1.1 D-5 정화 (Unsplash/Wikimedia) + footer disclaimer |
| 빌드 | 단일 build_map_v3.py | build_inline.py 3 산출 (cn/intl/tertiary) |

## 잔존 결정 (Out of Scope, Beta2 이연)

PROGRESS.md "Ideas Backlog" 의 Medium/Low 항목은 Beta2 로 이연:
- 일정 빌더 모드 (Day 1/2/3 시간순 동선 + 이동시간 자동 계산)
- 다국어 (중/영) i18n
- 3D 뷰 / AR 마커 / 사용자 노트
- React/Vue 마이그레이션
- 라우팅·디엔핑 스크래핑·음성 메모·푸시 알림
- 퍼지검색 자동완성

## 참조

- 부모 프로토타입: `../prototype-map/`
- 진행 기록: `../prototype-map/PROGRESS.md`
- 결정 로그: 위 PROGRESS.md "핵심 기술 결정 (Decision Log)" 섹션
- Lessons: 위 PROGRESS.md "학습한 것 (Lessons)" 섹션
- ralplan v3 합의 결과: 본 폴더 `RALPLAN_PROMPT.md`
