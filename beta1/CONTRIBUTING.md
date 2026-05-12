# CONTRIBUTING — PR Checklist

모든 PR 은 아래 게이트를 통과해야 함. ralplan v3 consensus 의 핵심 원칙을 코드 레벨에서 enforce.

---

## Principle #6 — Fail-safe with user-visible signal

모든 fallback 은 **사용자가 인지 가능한 신호**를 반드시 동반해야 함. silent degradation 금지.

체크 항목:
- [ ] 새 fallback 경로가 추가되면 `state.degradationMode` 4 enum (`normal`, `offline`, `portal_blocked`, `low_battery`) 중 적절한 값으로 전환되는가?
- [ ] `ui.js renderDegradationBanner()` 가 호출되어 상단 배너로 사용자에게 노출되는가?
- [ ] silent `catch (e) { /* noop */ }` 패턴은 피하고, 최소 `console.warn` + state 업데이트 동반?

---

## ADR-007 — Writer permission matrix

`window.__BETA1_STATE__` 는 단일 source of truth. 정해진 setter 외 누구도 `__BETA1_STATE__.STATE` 직접 mutate 금지.

| Writer | 권한 | 호출 시점 |
|---|---|---|
| `app.js` | `init(stops)` | startup, 1회만 |
| `ui.js`  | `setSelected`, `setFilter` | 사용자 인터랙션 |
| `sw.js`  | `setCacheStatus` (via BroadcastChannel) | install/activate/prefetch |
| 모든 모듈 | `setDegradationMode` | online/offline/battery/portal 이벤트 |
| **Tertiary mode** | **N/A — sw.js / Geolocation / prefetch 모두 부재** | (build_inline.py 가 strip) |

체크 항목:
- [ ] PR 이 `__BETA1_STATE__` 를 직접 mutate 하는가? → **REJECT**
- [ ] 새 setter 가 필요하면 ADR-007 본문 + 위 매트릭스 갱신 PR 분리
- [ ] PR 이 `state.js` 외에서 `Object.freeze` 우회 또는 `Object.assign(STATE, ...)` 시도? → **REJECT**

---

## Codex critical — Service Worker referrer policy

모든 SW `fetch()` 호출은 `referrerPolicy: 'no-referrer'` 명시 필수. `<meta name="referrer">` 만으로는 SW fetch 에 적용되지 않음.

체크 항목:
- [ ] `sw.js` 의 `staleWhileRevalidateTile()`, prefetch loop 등 모든 외부 host fetch 가 `referrerPolicy: 'no-referrer'` 포함?
- [ ] `grep "fetch(" sw.js` 결과 모든 호출이 옵션 객체 두 번째 인자에 referrerPolicy 보유?

---

## Tertiary mode constraints

`dist/index.tertiary.html` 은 emergency-only single-file. 다음 기능은 **반드시 부재**:

- [ ] `<script>` 안에 `serviceWorker.register` 호출 없음 (build_inline.py 가 patch)
- [ ] `<script>` 안에 `navigator.geolocation.watchPosition` 호출 없음 (build_inline.py 가 patch)
- [ ] `<link rel="manifest">` 없음 (PWA install 비활성)
- [ ] `<body>` 최상단 빨간 배지 "⚠️ 긴급 단일 파일 모드 — 인터넷 무 · SW 무 · 위치 추적 무" 노출

검증: `grep -c "serviceWorker\.register" dist/index.tertiary.html` 결과 = 0

---

## ADR-006 — BUILD_ID 단일 source

`BUILD_ID = git rev-parse --short HEAD` (Cloudflare Pages 와 로컬 동일). 환경별 비결정성 금지.

체크 항목:
- [ ] sw.js / data.js 의 `__BUILD_ID__` placeholder 가 build_inline.py 외 다른 경로로 substitute 되지 않는가?
- [ ] `SHELL_CACHE = beta1-shell-${BUILD_ID}-${VARIANT}` 형식 유지? (variant ∈ {cn, intl, tertiary})
- [ ] CI/Cloudflare 빌드 명령이 `python build_inline.py` 만 사용?

---

## ADR-005 — Image license

D-10 ~ D-5 사이 prototype 이미지 (Baidu 크롤) 사용 OK. **D-5 부터 가족 공유 시 Unsplash/Wikimedia CC0 으로 정화 완료** 필수.

체크 항목:
- [ ] D-5 이후 PR 에 `images_v3.json` (prototype) 의존이 잔존하는가? → **REJECT**
- [ ] footer disclaimer "이미지 prototype Baidu (Beta1.1: Unsplash/Wikimedia CC0 교체 예정)" 가 D-5 이후 갱신됐는가? (정화 완료 후 "교체 완료" 로 문구 update)

---

## Freshness 3-layer (AC#10)

freeze 후에도 캐시·코드가 stale data 를 noisy 하게 서빙하지 않도록:

- [ ] `data.js` 가 `BUILD_FREEZE_DATE = '2026-05-21'` 상수 export?
- [ ] `sw.js` 가 `FREEZE_DATE` Date 객체 + `allowMutation()` 가드로 postFreeze 캐시 mutation 차단?
- [ ] 정식 freeze 시점에 `git tag v1.0-frozen` 생성? (D-10 Phase D 시작 fresh head 에서 push)

---

## 빌드/검증

PR merge 전:
- [ ] `python _build_data.py` 정상 (data.js 갱신 시)
- [ ] `python build_inline.py` 정상 (3 산출물 모두 size budget 통과)
- [ ] `dist/index.cn.html` + `dist/index.intl.html` + `dist/index.tertiary.html` 모두 브라우저에서 열림
- [ ] `__tests__/coords.test.html` 5/5 PASS
- [ ] (D-9 mass session) iPhone Safari + Android Chrome 실기기 검증
