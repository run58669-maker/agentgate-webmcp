# AgentGate — WebMCP Challenge 工单（2026-08-26 12:00 JST 小克起草，小Q 11:58「交给你们」授权）

## 赛事硬约束（来自官方 rules/overview，已 live 核）
- 截止 2026-09-03 13:00 PT = **9/4 05:00 JST**。项目必须赛期内新建（8/25 之后）。
- 交付：①线上可访问 URL（ChatGPT in-app browser 或 Chrome `chrome://flags/#enable-webmcp-testing` 能用）②文字说明（为何适合 WebMCP / 体验为何更好 / 人+agent 一起能做什么以前做不到 / 实现简述）③≤3 分钟公开 YouTube demo 带音频 ④公开仓 + 开源 LICENSE 文件（仓库 About 区可见）。
- 评分四项：WebMCP Leverage（用得深、非玩具实现）/ Execution（完整产品）/ Potential Impact（真问题真受众）/ Creativity（与现有概念不同）。
- 核心 API 形态（官方页示例）：`document.modelContext.registerTool({name, description, inputSchema, execute})`。⚠️ 规范里可能是 `navigator.modelContext`——**worker 第一步去 https://github.com/webmachinelearning/webmcp 读 explainer 确认真实 API 名与签名，两者都兼容。**

## 做什么（一句话）
在 WebMCP registerTool 之上补一层「网页对 agent 的操作协议」，让任何网站三行接入后会对 agent 说五句话；配一个真能用的示范站证明它。

## 五个协议能力（全部来自 agent 真实痛点，见下）
1. `describe_page()` → 当前页面能做什么（tool 清单 + 每个 tool 的风险等级）+ 当前状态摘要（如「草稿已保存 3/5 步」「已登录 run58669-maker」）。解决：agent 只能 dump 所有 a/button 猜入口；不知道自己登着谁。
2. **结构化回执**：每个 tool 的 execute 返回统一结构 `{ok, state, errors:[{field, code, message}], next:[可接的 tool 名]}`。解决：提交后只能 sleep 再读 innerText 找「Thanks」；表单错误只回一句「Please answer this question」。
3. **风险分级**：注册 tool 时标 `risk: "read" | "write" | "irreversible"`。irreversible（提交/删除/付款）默认**不给 agent 直接执行**，调用会转入 4。解决：Submit 和普通按钮长一样。
4. `request_human({reason, action})` → 页面弹出真人确认面板（含验证码/签名/确认按钮），人点完返回带范围与有效期的授权 token，agent 凭 token 重放该 tool。**不做任何验证码绕过。**解决：agent 碰到 reCAPTCHA/不可逆操作只能死掉或硬闯。
5. `ready` 信号：页面异步内容就绪后才把 tool 标为 available；tool 调用在未就绪时返回 `{ok:false, code:"NOT_READY", retry_after_ms}`。解决：「加载完成」但内容没就绪、DOM 重渲染定位失效。

## 交付物
A. `packages/agentgate/`：零依赖 TS/JS 库，浏览器 ESM + 一个 `<script>` 标签可用。API 示例：
```js
import { AgentGate } from "agentgate";
const gate = AgentGate.init({ app: "Grant Portal", whoami: () => session.user });
gate.tool({ name:"save_draft", risk:"write", inputSchema, execute });
gate.tool({ name:"submit_application", risk:"irreversible", inputSchema, execute });
```
   内部把每个 tool 用真实 WebMCP API 注册，自动附加 describe_page / request_human，包装 execute 产出统一回执。附 README + 单元测试（vitest，jsdom 里 mock modelContext）。
B. `apps/demo/`：示范站「多步骤申请门户」（5 步：账号→资料→上传→审核→提交），Vite 静态站，部署 Cloudflare Pages 或 Netlify。**同一站有开关**：`?agentgate=off` 时只有裸 DOM（自定义单选钮、异步加载、提交后仅文字提示）——用于视频里的「以前」对比。
C. `docs/`：协议说明一页 + 提交用文字说明草稿（四问逐条答）。
D. 视频脚本 `video/SCRIPT.md`（≤3 分钟：30s 问题→90s 对比 demo→30s 协议→30s 接入三行）。

## 工作纪律（小克家规）
- 立刻打完，不排分天；能并行的并行。
- 每步有证据：测试输出 / 部署 URL 200 / 截图。
- 不动小Q 的钱：部署只用免费层。Vercel 码 OAIWEBMH-9E2F-MUT4（$30 credits，首 1000 人）可选。
- 不写验证码绕过、不写反检测。
- 仓库公开 + MIT LICENSE；GitHub 账号 run58669-maker。

## 痛点原始清单（证据）
小克：自定义单选 click 无效要点 label（8/26 报名实撞）/ 提交后不知成败只能 sleep 重读 innerText / 表单错误不指明字段 / 不知页面能干啥只能 dump 按钮 / 不可逆键无标识 / 不知当前登录身份 / 规则页 38k 字符找三行。
Codex 引擎：DOM 重渲染定位失效 / 弹窗遮挡 / 元素可见不可点 / iframe·Shadow DOM / 加载完成但未就绪 / 验证码风控 / 登录态漂移 / 无限滚动遍历不稳。
Sol：journal-bridge 已发问，回信后并入。
