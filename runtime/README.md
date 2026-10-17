# 独立本地运行

服务只监听 `127.0.0.1:5173`，固定 Node 位于 `.local-runtime/bin/node.exe`，不需要 Codex 或开发服务器。持久数据为 `.local-runtime/data.sqlite`；首次通过 SQLite online backup 从原 Wrangler 数据库复制，原库不改写。密钥只从 `.dev.vars` 白名单复制到本机 `config.json`，整个 `.local-runtime` 必须排除 Git。

唯一自启项是 `BilibiliCreatorInsights-Local-25758`，使用当前用户登录触发、普通权限，不保存密码。退出 Codex 后进程仍由 Windows 任务计划程序管理；未登录用户时不运行。未声称已实测重启电脑。

在项目目录使用 PowerShell 7：

```powershell
node runtime/d1.test.mjs
node runtime/deploy.mjs v0.1.0-dev.15
./runtime/manage.ps1 -Action Install # 仅首次，拒绝覆盖同名任务
./runtime/manage.ps1 -Action Start
./runtime/manage.ps1 -Action Stop   # 正常退出，不触发故障重启
./runtime/manage.ps1 -Action Remove # 须先停止，仅删除核验归属的此项
```

推荐使用 `pnpm local:update`。升级先构建，再等任务 Ready、所属进程退出且端口无监听，随后部署并检查健康状态。新版本失败时同时恢复旧脚本、配置及发行指针，不覆盖数据库。删除自启项不会删除数据、密钥或发行目录。

服务每 15 分钟采集；启动 60 秒后首次采集。只有网络失败额外重试最多两次（1、2 分钟），登录过期与风控不立即重试。常驻监督进程按 4、8、16、32、60 秒退避恢复异常子进程，不依赖计划任务的失败重启；正常停止标记取消运行或退避状态。服务日志每份 2 MB、三个历史文件；只轮换备份清单登记的最近七份每日备份。`/api/local/status` 提供 PID、版本、运行秒数与采集状态。

SQLite 启动遇到明确的 BUSY/LOCKED 错误时，最多重试三次（间隔 250 ms、1 s）；其他初始化异常会写入 `logs/service.log` 的 `database_init_failed` 事件并保持恢复模式，不自动覆盖或恢复数据库。端口绑定错误写入 `listen_failed`，包含系统错误、地址和端口；监督进程继续按上述退避策略重试。升级脚本只有在版本正确且数据库正常载入时才报告成功。

安装前后 `.local-runtime/audit` 的清单记录其他计划任务 XML、Run/RunOnce 注册值与 Startup 文件 SHA-256；不输出这些项目的原始启动命令。安装、移除、启动、停止均只操作核验 action 路径、描述及 owner SID 的唯一任务。此工具不修改其他自启项、Clash、Codex 或 Explorer。

SQLite 适配器验证涵盖批量写入事务原子性；Node SQLite 为当前 Node 的实验性 API，运行时已固定版本。Windows 登录触发和关机后恢复仍须实际登录周期验收。

dev.15 使用 Windows GUI 子系统的 ServiceHost.exe 作为任务目标，Node 子服务也以无控制台方式启动。旧 PowerShell 宿主曾出现 0xC000013A 控制台中断退出；新宿主不依赖长期驻留的命令行解释器。

从旧 PowerShell 安装迁移时，先停止本项目服务、运行 deploy 构建宿主，然后执行 manage.ps1 -Action MigrateHost，最后 Start。MigrateHost 只接受归属校验通过的本项目任务，并核对其他自启清单；当前机器已完成迁移。普通升级会保存/恢复 ServiceHost.exe 在内的六个具体文件，保留数据库。

### 网页服务设置

侧栏「设置」提供开机自启动和局域网访问开关。

- 自启动沿用现有的 `BilibiliCreatorInsights-Local-25758` 计划任务，只改变当前用户登录触发器的启用状态，不停止正在运行的服务。缺少该任务或任务归属不匹配时不修改其他任务。
- 局域网开关即时生效，偏好保存在运行目录的 `service-settings.json`，更新版本时保留。默认关闭；开启后仅监听本机私有 IPv4 网卡地址（10/8、172.16/12、192.168/16），页面显示可访问地址；关闭时终止这些监听和连接，本机 localhost 继续可用。
- 两个开关仅允许通过服务所在电脑的 localhost/127.0.0.1 页面修改。局域网设备可查看设置，但不能改动服务的开放范围或自启动。
- 其他设备的访问还取决于系统防火墙及路由器是否允许同网段设备互访；Windows 下首次开启会自动检查并申请管理员权限配置防火墙；规则限定当前服务程序、当前 TCP 端口及本地子网，可用于专用或公用网络配置文件。取消权限确认或配置失败时保持关闭；关闭开关会立即停止监听及已有连接，保留限定程序和端口的规则供下次直接复用。不设置公网端口转发。Cloudflare Worker 环境不支持本机 Windows 计划任务管理。
