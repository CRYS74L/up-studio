# 独立本地运行

服务只监听 `127.0.0.1:5173`，固定 Node 位于 `.local-runtime/bin/node.exe`，不需要 Codex 或开发服务器。持久数据为 `.local-runtime/data.sqlite`；首次通过 SQLite online backup 从原 Wrangler 数据库复制，原库不改写。密钥只从 `.dev.vars` 白名单复制到本机 `config.json`，整个 `.local-runtime` 必须排除 Git。

唯一自启项是 `BilibiliCreatorInsights-Local-25758`，使用当前用户登录触发、普通权限，不保存密码。退出 Codex 后进程仍由 Windows 任务计划程序管理；未登录用户时不运行。未声称已实测重启电脑。

在项目目录使用 PowerShell 7：

```powershell
node runtime/d1.test.mjs
node runtime/deploy.mjs v0.1.0-dev.14
./runtime/manage.ps1 -Action Install # 仅首次，拒绝覆盖同名任务
./runtime/manage.ps1 -Action Start
./runtime/manage.ps1 -Action Stop   # 正常退出，不触发故障重启
./runtime/manage.ps1 -Action Remove # 须先停止，仅删除核验归属的此项
```

推荐使用 `pnpm local:update`。升级先构建，再等任务 Ready、所属进程退出且端口无监听，随后部署并检查健康状态。新版本失败时同时恢复旧脚本、配置及发行指针，不覆盖数据库。删除自启项不会删除数据、密钥或发行目录。

服务每 15 分钟采集；启动 60 秒后首次采集。只有网络失败额外重试最多两次（1、2 分钟），登录过期与风控不立即重试。常驻监督进程按 4、8、16、32、60 秒退避恢复异常子进程，不依赖计划任务的失败重启；正常停止标记取消运行或退避状态。服务日志每份 2 MB、三个历史文件；只轮换备份清单登记的最近七份每日备份。`/api/local/status` 提供 PID、版本、运行秒数与采集状态。

安装前后 `.local-runtime/audit` 的清单记录其他计划任务 XML、Run/RunOnce 注册值与 Startup 文件 SHA-256；不输出这些项目的原始启动命令。安装、移除、启动、停止均只操作核验 action 路径、描述及 owner SID 的唯一任务。此工具不修改其他自启项、Clash、Codex 或 Explorer。

SQLite 适配器验证涵盖批量写入事务原子性；Node SQLite 为当前 Node 的实验性 API，运行时已固定版本。Windows 登录触发和关机后恢复仍须实际登录周期验收。
