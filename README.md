## Exam Forge · AI Mock Exam SaaS

Exam Forge 帮助大学生基于课程资料快速生成模拟试卷。上传 slides（必填）+ 样例试卷（可选），系统调用大模型生成 Markdown 题卷并导出 PDF。所有用户可永久免费在线预览，注册后享有 3 次免费下载额度，超出部分每份 1 元。

### 技术栈一览

- **Next.js 14 App Router + TypeScript**：前端 & SSR。
- **Supabase**：Auth、Postgres、Storage、RLS。
- **OpenAI GPT-4o-mini**：试卷内容生成。
- **Qwen / 通义千问（阿里云百炼，OpenAI 兼容）**：可与 OpenAI 互换调用。
- **md-to-pdf + Puppeteer**：Markdown 转 PDF。
- **Google Analytics**：基础流量统计。

---

## 快速开始

1. **安装依赖**
   ```bash
   npm install
   ```
2. **配置环境变量**
   ```bash
   cp .env.local.example .env.local
   ```
   填写以下变量：

   | 变量名 | 说明 |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key（仅在服务端使用） |
   | `SUPABASE_STORAGE_BUCKET` | 存储桶名称，默认 `course-assets` |
   | `NEXT_PUBLIC_SITE_URL` | 前端站点地址（本地可设为 `http://localhost:3000`） |
   | `OPENAI_API_KEY` | OpenAI key，用于调用 GPT-4o-mini |
   | `AI_PROVIDER` | 可选，`openai` 或 `qwen`（默认 `openai`） |
   | `QWEN_API_KEY` | 可选，调用 Qwen（百炼）时的 API Key（或设置 `DASHSCOPE_API_KEY`） |
   | `QWEN_BASE_URL` | 可选，Qwen 兼容模式 Base URL（默认 `https://dashscope.aliyuncs.com/compatible-mode/v1`） |
   | `GOOGLE_ANALYTICS_ID` | 可选，GA4 测量 ID（形如 `G-XXXX`） |

3. **初始化 Supabase**
   - 打开 Supabase SQL Editor，执行 `supabase/schema.sql` 中的脚本（建表、策略、函数、存储桶策略）。
   - 确保存在私有存储桶 `course-assets`，若名称不同请同步更新到环境变量。
   - 邮箱 OTP 登录已采用 Supabase Auth，无需额外配置。

4. **运行开发服务**
   ```bash
   npm run dev
   ```
   默认访问 http://localhost:3000

---

## 功能概览

- 📤 **资料上传**：PDF / PPTX（最大 40MB），自动上传到 Supabase Storage，后续由 Qwen 文档理解直接读取原文件。
- 🧠 **AI 生成**：默认调用 Qwen（百炼 OpenAI 兼容接口）基于上传附件生成 Markdown 试卷；也保留 OpenAI 入口，可按需切换。
- 📄 **Markdown 预览 & PDF 导出**：md-to-pdf + Puppeteer 动态生成 A4 PDF。
- 📈 **额度管理**：Supabase 函数 `consume_free_download` 管理 3 次免费下载，超过返回 402 提示付费。
- 🧾 **下载审计**：`download_events` 表记录下载次数与费用。
- 📊 **Google Analytics**：页面挂载 GA4 脚本，生成/下载事件会触发 `generate_exam`、`download_exam` 事件。

---

## 生产部署（Vercel）

1. **环境变量**：在 Vercel 项目的 *Settings → Environment Variables* 中配置与 `.env.local` 相同的变量。
2. **Supabase RLS**：确保线上数据库执行过 `schema.sql`，并开启 `database replication`（如需多地区）。
3. **模型密钥**：根据 `AI_PROVIDER` 填写 OpenAI 或 Qwen（百炼）密钥，建议使用专用 key 并设定速率/费用上限。
4. **Puppeteer 依赖**：
   - `md-to-pdf` 会自动下载 Chromium。Vercel Serverless Functions 支持无头浏览器，但需要将 `nodejs14.x`/`nodejs18.x` 运行时保持为默认。
   - 如果遇到执行错误，可改用 Edge Function + 自定义 Chromium（如 `@sparticuz/chrome-aws-lambda`），或将 PDF 生成功能迁移到 Supabase Edge Functions / 专用 Worker。
5. **自定义域名**：将 `NEXT_PUBLIC_SITE_URL` 更新为线上域名，保证 Supabase 邮件回调地址正确。

---

## 额度与收费策略

- 首次登录自动创建 `profiles` 记录，`free_downloads_remaining` 初始为 3。
- 下载时先调用 `consume_free_download`：
  - 若返回 `true`：视为使用免费额度。
  - 若返回 `false`：API 返回 `402`，前端提示支付并允许带上 `confirmPaid=true` 继续请求。实际支付对接（微信 / Stripe 等）请自行扩展。
- 每次成功下载会写入 `download_events`，Dashboard 会统计免费/付费次数。

---

## 开发提示

- 所有与 Supabase 的交互均通过封装好的 `createServerSupabaseClient` / `createServiceRoleSupabaseClient`。
- 生成 Markdown → PDF 的过程使用 `renderPdfFromMarkdown`，位于 `src/lib/exams/render-pdf.ts`。
- 若需扩展题型或模板，可调整 `src/lib/exams/generate.ts` 中的提示词。
- 想要替换大模型供应商，可在 `src/lib/openai.ts` 设置 `AI_PROVIDER` 为 `openai` / `qwen`，或在 `/api/generate-exam` 请求体中传入 `{ provider, model }` 覆盖。

---

## 后续路线建议

1. 接入真实支付（Stripe Checkout / 微信小程序支付）。
2. 将 PDF 生成迁移到专门的队列 + 后台任务，提升稳定性。
3. 继续打磨多模态链路，例如自动截取关键页面、摘要原始长文档等。
4. 为生成记录添加分享/协作权限。
5. 增加错误监控（Sentry）与日志采集。

祝构建顺利 🚀
