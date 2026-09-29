# 竖屏尺寸与圆角调整（dev.119）

以用户提供的 iOS 设置截图为视觉参考，保留现有字体文件、色彩及交互，集中在 portrait-scale.css 管理竖屏比例。

- 内容卡片采用 28px 圆角、18px 内边距；320px 窄屏采用 24px / 16px。
- 卡片标题 17px，账号名称 15px，辅助说明 13px；频率标签与选择框统一 16px。
- 常规操作高度 44px，圆形操作同直径；彩色标题底盘 40px、内部图标 22px。胶囊行保留完整圆弧。
- 封面/输入框 16px 圆角，详情浮层 18px，菜单 24px，弹窗 28px。圆角根据容器用途、尺寸及嵌套留白分别处理。
- 数据摘要与动作采用明确的网格对齐；320px 下操作行换行，避免遮住时间文字。账号列表使用可收缩网格，防止名称撑破卡片。
- 调整概览、稿件、分析、数据源、设置的共享表面；横屏保留既有尺寸。

Apple HIG 的 [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) 与 [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) 提供布局及控件指导；上述 CSS 数值是对此项目和截图的设计适配，不宣称是 iOS 27 对网页的强制规范。

验证：构建通过；Chromium、WebKit、Firefox 的五个主页面检查无脚本错误、无页面横向溢出；检查浅色与深色截图。320/390/428px 数据源的时间文字与动作按钮无交叠，1280px 横屏卡片高度、圆角、内边距与 dev.118 一致。
