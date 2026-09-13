# dev.41 — 交互试验与工作区重构

## 设计依据与适用范围
- Apple WWDC23 Animate with springs：https://developer.apple.com/videos/play/wwdc2023/10158/ 。采用弹簧响应、可中断反馈的原则。Smooth / Snappy / Bouncy 是行为家族参考；本项目的阻尼、时长是网页适配值，不宣称为 iOS 通用常量。
- Apple Materials：https://developer.apple.com/design/human-interface-guidelines/materials 。浮动导航与内容区分层，文字独立于光学层，提供阅读遮罩。
- Liquid Glass React：https://github.com/rdev/liquid-glass-react 。读取时约 6.1k stars。复用 MIT 光学滤镜和位移图；没有复用鼠标跟随、字体及页面定位。授权保留于 docs/third-party/rdev-liquid-glass-LICENSE.txt。
- 网页折射并不等同系统原生 Liquid Glass；Safari / Firefox 的位移滤镜支持有限。没有把单纯 backdrop blur 标为原生 iOS 27。

## 实现
- 6 种空间转场与 8 种独立节奏预设；弹簧采用单位质量阻尼方程采样，双方共用时钟。保留手调时长、阻尼及贝塞尔控制点，临时入口继续保留。
- Dock、回到顶部、同步与版本提示共用 GlassMaterial 的位移、色差、模糊和白色遮罩。移除版本胶囊的特例背景覆盖。
- AI 拆为整页工具栏、ChatHistory、消息与输入区域；三个布局分别为侧边记录、按需记录的专注模式、横向记录。重排模型和推理入口、胶囊搜索与稿件范围；保留消息、草稿、流式处理和原有操作。
- 账号区域改为整行可选的账号项；更新区域按最近快照与同步操作、更新计划、服务状态三层排列。
- 移除主导航按钮原生 title，保留可访问名称。
- 主题改用 inert、pointer-events:none 的视觉快照和渐变圆形遮罩。实测原生 View Transition 期间命中 HTML 根节点，后续按钮点击丢失；替换后没有原生截图的输入隔离期。

## 验证
- 构建、类型检查与单元测试；覆盖转场取消、共用时钟、弹簧收敛、连续主题输入及快照清理。
- 仅在 Codex 侧边浏览器验证：桌面与 390×640，六种试播、三种 AI 布局、搜索/恢复已有对话、数据源布局和玻璃滤镜应用。
- 连续八次主题输入约 0.4 秒，全部命中按钮；下一帧状态观察约 19–28 ms。未新增付费 AI 请求，未切换真实账号。
