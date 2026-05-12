# Beta2 — prototype 직접 fork + YouTube 인용 보충

**브랜치 의도**: prototype v8.3 (`shanghai-map.html`) 에서 직접 가지치기. **Beta1 변경 (PWA, Gaode, 분리 파일, 좌표 보정 등) 모두 무시**. 중국 환경 미고려.

## 변경점 (vs prototype)

1. **YouTube 인용 보충** — 17/26 stops 카드에 자막 발췌 박스 추가
   - 각 stop 의 가장 가중치 높은 영상에서 timestamp ±5/+45초 자막 추출
   - 중복 caption dedup, matched_term keyword 우선
   - 채널명 + ts_label + URL 링크 (해당 시점 점프)
2. **카드 UX 그대로** — bottom-sheet drag, minimize, filter chip, 수빈 추천 분리, Top10 사이드패널 모두 prototype 유지
3. **타일 source**: OSM 그대로 (Gaode 안 씀)
4. **데이터**: GCJ-02 raw 좌표 그대로 (eviltransform 변환 안 함)

## 산출물

- `shanghai-map.html` (1.5MB single-file, 26 stops + 26 base64 image + 42 timestamps + 17 youtube quote)
- `index.html` (redirect to shanghai-map.html)

## 빌드 (개발자용)

```bash
cd beta2/
python _enrich_youtube.py    # → stops_enriched.json (timestamps + SRT 자막 추출)
python build_beta2.py        # → shanghai-map.html
```

## Live

`https://yesthank.github.io/shanghi2605/beta2/`

## 다른 버전과 비교

| 버전 | 위치 | 핵심 |
|---|---|---|
| prototype v8.3 | `/` (root) | 단일 HTML, OSM, emoji marker, GCJ-02 raw |
| **beta2 (this)** | `/beta2/` | prototype + YouTube quote 보충만 |
| beta1 | `/beta1/` | 분리 파일 + PWA + Gaode + 좌표 보정 + state.js — full rewrite |
