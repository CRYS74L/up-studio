# 首页参考图设计 QA

- source visual truth path: `D:\【主文件夹】\下载\d1b6030c-2851-4f5e-aab2-9e34de84bcb6.png`
- implementation screenshot path: `D:\【主文件夹】\下载\【Codex 工作空间】\哔哩哔哩数据看板\implementation-overview-final.png`
- viewport: 1566 × 982 CSS px，device scale factor 1
- source pixels: 1488 × 1056；implementation pixels: 1566 × 1098（完整页面）
- state: 浅色模式、真实 B 站快照、首篇稿件选中

## Full-view comparison evidence

参考图和实现均采用窄侧栏、顶部数据新鲜度与筛选、六项 KPI、左侧表现地图、右侧选中稿件、下方播放趋势的同一信息架构。实现使用真实 17 篇稿件及真实封面，故内容与参考图示例不同。桌面主区域无水平溢出，右侧诊断和第六项 KPI 完整可见。

## Focused region comparison evidence

- 地图：普通稿件使用圆形真实封面气泡与粉色效率光环；选中稿件使用蓝色圆角矩形，与参考图的层级一致。
- 右侧稿件：使用同源高质量封面、六项真实指标、三条关联诊断和两个操作按钮。
- 趋势：只使用工具自身采集的真实快照，不复刻参考图中的虚构事件或曲线。
- 字体与排版：系统字体、紧凑标题字距、固定单行产品名；长标题两行截断。
- 颜色与令牌：保留参考图的冷白背景、蓝色主操作、粉色气泡光环；使用统一 20px 表面圆角和 12px 控件圆角。
- 图片质量：大图通过同源 HTTPS 代理；地图使用 128px WebP 缩略图，无破图。
- 文案：产品名称统一为“哔哩哔哩数据看板”；不使用参考图中的示例账号和示例指标。

## Comparison history

1. P1：首轮实现偏离参考图，首页改为排名加趋势。修复为参考图的三栏主构图。
2. P1：原始 B 站 HTTP 封面在浏览器中不稳定。增加域名白名单同源封面代理、HTTPS 规范化和缓存。
3. P1：首轮参考布局挤出右侧诊断。修复主内容宽度和 grid 的 min-width，1566px 下无水平溢出。
4. P1：地图方形封面不符合参考。修复为圆形普通气泡和选中矩形封面。
5. P1：自定义地图初版运行时异常导致空白。修复 ECharts custom series 数据索引，并在浏览器中确认无空白与无破图。

## Remaining P3 polish

- 参考图侧栏顶部使用不同的产品图标与“私有版”标签；当前保留项目既有播放图标与私人工作区文案。
- 真实采集时间轴目前只有少量点，待运行更久后自然形成参考图中更丰富的趋势密度。

final result: passed
