# Design QA — 哔哩哔哩数据看板

- source visual truth: `C:/Users/25758/AppData/Local/Temp/codex-clipboard-f04d5655-43b2-41e1-9a5c-3a888014515a.png`
- supporting source: `C:/Users/25758/AppData/Local/Temp/codex-clipboard-16f9b9f7-9332-44ed-aa96-a37c0e24fa1f.png`
- implementation screenshot: `D:/【主文件夹】/下载/【Codex 工作空间】/哔哩哔哩数据看板/implementation-home-final.png`
- additional states: `implementation-map-dev6.png`, `implementation-map-selected-dev6.png`, `implementation-videos-dev6.png`, `implementation-mobile-dev6.png`
- viewport: desktop in-app browser 1264×955; mobile 390×844
- density normalization: source and implementation compared as full-page 1× CSS captures; reference is a photographed screen, so browser chrome and camera perspective were excluded from fidelity judgments.
- state: light theme, real 17-video dataset, latest successful acquisition.

## Full-view comparison evidence

The implementation preserves the reference hierarchy: one KPI strip, a narrow all-video CTR ranking, a wide recent-video-card region, and a full-width combined average-watch-duration / average-watch-percentage chart. It intentionally translates the reference's dense black operations-screen aesthetic into the selected Apple-style light/dark surface system.

## Focused region evidence

- Recent manuscripts use real 16:9 covers, title/date metadata and three compact metrics without stretched imagery.
- CTR ranking preserves the reference's narrow horizontal ranking treatment.
- Combined watch chart preserves bars plus line with separate seconds/% axes.
- Map and manuscript screens were checked separately because they are not present in the visual source.

## Required fidelity surfaces

- Typography: system/PingFang stack, optical sizing, controlled heading tracking, no product-name wrapping.
- Spacing/layout: 20px surfaces, 12–14px internal gaps, stable two-column reference composition, no mobile horizontal overflow.
- Colors/tokens: restrained light surfaces and semantic blue/orange/pink; dark mode remains token-driven.
- Image quality: all visible thumbnails are real Bilibili covers using 16:9 `object-fit: cover`; bubble images remain circular-clipped before and after selection.
- Copy/content: section labels now describe the actual data shown; “组合看板” replaces the misleading “分析实验室”.

## Comparison history

1. P1: Homepage composition did not match the reference. Fixed by removing the map from Home and adding CTR ranking, recent cards, and combined watch chart. Post-fix evidence: `implementation-home-final.png`.
2. P1: Bubble selection enlarged/cropped covers and neighboring points overlapped. Fixed with a constant 22px radius, outline-only selection and deterministic ID-sorted near-neighbor separation. Post-fix evidence: `implementation-map-selected-dev6.png`.
3. P1: Manuscripts were row entries. Fixed as Bilibili-like 16:9 rectangular cards. Post-fix evidence: `implementation-videos-dev6.png`.
4. P1: Audience counts were mislabeled as percentages. Fixed at ingestion by storing counts and normalizing to percentages. Post-fix visible values: 6.2% / 93.8%.
5. P2: Mobile page flow risked horizontal overflow. Fixed responsive grids; measured document overflow is 0px at 390px.

## Findings

No actionable P0/P1/P2 visual findings remain for the requested screens. The remaining unintegrated data capabilities are product/data work and are explicitly reported in the UI and `data-quality-audit.md`, not hidden as visual completion.

## Follow-up polish

- P3: On very tall displays, the recent-video grid can be made user-resizable in a later iteration.

final result: passed
