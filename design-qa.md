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
## 2026-08-13 dev.8 验收范围

- 全站主数据系列统一为哔哩哔哩粉 `#FB7299`，用同色系明度、透明度、面积与线型区分角色；状态色只保留给成功、警告和错误。
- 首页 AVD/AVP 图：可滚动长标题轴、轻微单调平滑、仅左轴绘制 5 段参考线、右轴固定 0–100/20 间隔。
- 联合分析：把 CTR、观看深度、播放量和诊断指标编码进同一张图，支持四类分析问题模板。
- 稿件详情：补齐播放、实时、涨粉/取关、六类互动、质量、观众、终端来源、留存和历史趋势。
- 响应式：联合分析与详情在 `<600px` 改为单列，触控按钮维持至少 44px；图表可通过点击查看 tooltip。
- 动效：主题切换继续使用 View Transition；数据点不因选择而放大位移；reduced motion 保留现有降级。


## 2026-08-13 dev.9 回归验收

- source visual truth: `C:/Users/25758/AppData/Local/Temp/codex-clipboard-2c111cc2-c08f-469e-a8f0-7dfa1d97ad45.png`
- implementation screenshots: `implementation-theme-roundtrip-dev9.png`, `implementation-ctr-tooltip-dev9.png`, `implementation-home-dev9-light.png`, `implementation-map-dev9.png`, `implementation-mobile-dev9.png`
- viewport: desktop 1548×974 and 1264×955; mobile 390×844. Source screenshot compared at its native 646×862 crop; layout judgment normalized by matching the CTR card region rather than browser chrome.
- state: real 17-video dataset; light theme after a dark→light roundtrip; CTR hover tooltip visible; map selected state; mobile light overview.

### Full-view and focused comparison evidence

- CTR focused comparison: reference showed a dark grid after theme roundtrip and a tooltip extending past the card. Post-fix screenshot keeps 1px low-contrast grid lines; measured tooltip x-range 308.8–568.8 stays within chart x-range 308.8–648.4.
- Watch chart: all 17 categories render together; measured `scrollWidth = clientWidth = 1201` and page horizontal overflow is 0. Bars use bright Bilibili pink and the line uses a darker berry pink, with no slider.
- Map focused comparison: every bubble remains a fixed 22px radius with circular image clipping. Hover emphasis is disabled; normal items stay at `z2=1`, and only the selected item moves to `z2=20`.
- Mobile: 390px view has 0px horizontal overflow and retains the dedicated card flow plus bottom navigation.

### Required fidelity surfaces

- Typography: product name stays on one line; compact chart labels use system/PingFang stack and readable truncation with full tooltip content.
- Spacing/layout: homepage retains the dev.7 dense hierarchy; no new scrolling container was introduced for the watch chart.
- Colors/tokens: charts remain in a coherent Bilibili pink family; selected map halo was corrected from blue to pink. Theme roundtrip does not change geometry.
- Image quality: recent-card and map covers are real Bilibili images, 16:9/card or circular/map clipped without stretching.
- Copy/content: “当前已接入指标完整” is paired with the visible “2 类计划指标尚未接入” disclosure on Data Source.

### Comparison history

1. P1: CTR grid persisted with dark styling after returning to light. Fixed by making the theme a React prop so ECharts is recreated with the correct option.
2. P1: CTR tooltip overflowed the panel. Fixed with `confine`, local append target and bounded wrapping; post-fix measurement stays inside the chart.
3. P1: AVD/AVP required horizontal scrolling. Removed `dataZoom`, tightened labels and bars, and verified all 17 categories at once.
4. P1: Map hover changed overlap order. Disabled hover emphasis and assigned a constant normal z-order; selection alone raises z-order.
5. P2: Selected map halo used an unrelated blue. Replaced with the Bilibili pink token family.

No actionable P0/P1/P2 visual findings remain for this regression scope.

final result: passed
