# 自动无损快照存储

## 自动运行与格式

每次同步在写入稿件与账号快照之前，由 `SnapshotWriter` 自动处理 JSON：

1. 对原始 UTF-8 字节执行固定、版本化的内容分块（1–16 KiB）。
2. SHA-256 寻址；相同内容块共享一份，时间点、字段和值不合并丢弃。
3. 每块选择 gzip（level 6）或原始字节中较小的一种。
4. 写入前验证解压校验和，写入后回读验证；随后才发布快照引用。
5. 读取时验证每块长度、SHA-256、整条长度与 SHA-256，并还原原始 JSON 字节。

无 AI 调用、模型依赖或人工压缩步骤。同步耗时中的 `compressionMs` 记录编码、去重、持久化和校验时间。格式可混合读取旧的明文 JSON 与新的引用。SQL 使用的 `coverAttractionScore` 保留投影；增加新的 JSON SQL 查询时必须同步定义投影，不能直接把引用当原始 JSON 查询。

`node:crypto` 与 `node:zlib` 在 Node 服务和启用 `nodejs_compat` 的 Workers 中使用相同格式。已使用 workerd + D1 本地运行时验证编码、持久化、解码及实际 `/api/videos` 返回。
参考：https://developers.cloudflare.com/workers/runtime-apis/nodejs/zlib/

启用 R2 时，后续原始采集归档保存为 `raw/日期/ID.json.gz`，标准 gzip 解压可还原；已有 `.json` 归档不删除。

## 故障行为

- 块内容不符、缺块、无效清单、写入失败：明确失败，不返回部分 JSON，不静默跳过。
- 单批块写入和快照写入分别由 D1 batch 事务提交。先块后引用，所以中途失败可能留下未引用块，但不会发布指向未写入块的新引用。保留这些块，未引入自动清理。
- 这不是对断电、介质损坏或运行环境的绝对成功保证。仍须保留独立备份。
- 不减少采集次数，不以每天平均值替代快照，不把空值合并为 0。

## 历史数据库迁移

先部署具有新读取能力的程序和 `0008_snapshot_chunks.sql`。数据库大规模转换需要服务离线。

独立试运行（目标必须不存在）：

```powershell
node runtime/compact-snapshots.mjs original.sqlite candidate.sqlite
```

工具逐批转换，独立遍历比对所有业务表和字段，执行 SQLite 完整性及外键检查，最后 VACUUM。失败不会改写输入文件。

本地正式安装：停止本项目服务并确认已退出后执行：

```powershell
node runtime/install-compressed-database.mjs .local-runtime
```

工具拒绝服务仍运行的情况；创建 `backups/pre-compression-时间.sqlite` 原库备份，在独立文件完成转换与完整比对、fsync 后，同目录原子替换数据库。原库保留，迁移报告位于 `.local-runtime/snapshot-migration-report.json`。之后启动服务并检查接口与一次真实同步。不要在服务运行时手动替换 SQLite/WAL 文件。

需要将最新压缩库恢复为旧式明文 JSON 时，可在独立输出文件执行：

```powershell
node runtime/compact-snapshots.mjs current.sqlite expanded.sqlite --expand
```

展开同样执行完整比对，并保留内容块表供核查。不能直接降级到不识别压缩引用的旧程序。

## 验证与测量

- `npm test`：原始字节往返、重复同步不增块、修改内容保留历史、SQL 投影、缺块、损坏、写入失败、写后损坏等。
- `npm run test:storage:worker`：实际 workerd/D1 编码与读取兼容性。
- 本轮基准副本：1,253,076,992 字节 → 311,898,112 字节，37,223 条快照转换；44,561 条业务记录所有字段比较一致。
- 最终实现全库转换、完整验证和 VACUUM 共约 73 秒（本机）；其中独立全库比对约 11 秒。
- 同一批 17 篇稿件及账号数据重复编码 5 次：约 13–19 ms/批，0 个新增重复块；还原约 7–12 ms/批。
- 两账号共 16 项实际 API 比较：在相同评估时间下返回内容一致。较长的全量时间序列请求从约 118 ms 到 258 ms；最新稿件/单稿读取增加少量毫秒。压缩并非所有读操作都会更快。
- 数字是本机现有数据的实测，不是未来服务器或所有数据的固定承诺。首次迁移与日常增量同步不同；备份、网络采集、AI 请求耗时不应混算成压缩耗时。

现存备份和迁移保留的原库不会在本次迁移中自动删除。未来每日数据库备份自然包含压缩后的块与引用，但仍是独立可恢复的全量 SQLite 副本。
