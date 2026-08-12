# 澄镜 · 哔哩哔哩创作者洞察

个人私有、移动优先的哔哩哔哩创作者数据看板。Cloudflare Worker 每 15 分钟运行采集任务，D1 保存指标历史，R2 保存封面与短期原始响应；支持表格导入、DeepSeek 数据诊断和 Google Drive 校验备份。

## 本地启动

```bash
npm install
npm run dev
```

演示界面默认使用脱敏的本地样例数据。真实连接需要在 `.dev.vars` 或 Cloudflare Secrets 中配置凭据；不要提交该文件。

## 云端准备

1. 创建 D1 数据库与私有 R2 Bucket，替换 `wrangler.jsonc` 中的 D1 ID。
2. 执行 `wrangler d1 migrations apply bilibili-insights --remote`。
3. 用 `wrangler secret put` 写入 `.env.example` 中列出的密钥。
4. 先部署探针并连续验证 24 小时，再开启正式采集。

## 当前验证边界

- B 站创作中心使用非公开接口，必须通过项目内扫码建立专用会话并完成云出口实测。
- Google OAuth、DeepSeek 和 Resend 需要用户自己的应用/密钥才能完成真实联调。
- 未配置真实服务时，API 明确返回 `not_configured`，不会伪造成功状态。
