# dev.43 — 侧栏材质矩形破损修正

用户报告侧栏出现持续变换位置的矩形断层。采用的修正：将同一 SVG 折射链直接作为 backdrop-filter 的一部分，取消在 backdrop-filter 外再施加 CSS filter 的双层合成方式。elasticity=0 时固定变换字符串，并取消无意义的 transform/尺寸过渡，保留可调光学参数和高光。

验证：侧边浏览器 1580×980，高侧栏连续鼠标移动后未见截图中的断层；材料预览仍存在背景折射/模糊，computed filter 为 none，backdrop-filter 同时包含 blur、saturate 和原 SVG filter。未改动用户的玻璃预设或 530 ms 转场参数。间歇性合成问题仍需后续实际使用观察。
