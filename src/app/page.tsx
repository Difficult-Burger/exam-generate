import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck, CreditCard } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  const primaryCta = user ? "/dashboard" : "/login";
  const primaryLabel = user ? "进入控制台" : "免费试用";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-white"
        >
          Exam Forge
        </Link>
        <nav className="flex items-center gap-4 text-sm text-slate-300">
          <a href="#features" className="hover:text-white">
            产品特性
          </a>
          <a href="#workflow" className="hover:text-white">
            使用流程
          </a>
          <a href="#pricing" className="hover:text-white">
            价格策略
          </a>
          <Link
            href={user ? "/dashboard" : "/login"}
            className="rounded-md border border-white/20 px-3 py-2 font-medium text-white shadow-sm hover:bg-white/10"
          >
            {user ? "我的控制台" : "登录 / 注册"}
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 pb-24 pt-16">
        <section className="grid gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-200">
              <Sparkles className="h-3 w-3" />
              AI 模拟卷生成 SaaS
            </span>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              上传课程资料，10 分钟内获得高质量模拟卷
            </h1>
            <p className="text-lg text-slate-300">
              面向高校学生的智能出题助手，自动解析 slides /
              样例试卷，生成可在线预览和下载的 Markdown + PDF
              模拟卷。可用于期末复习、自测和社团出卷，支持多课程管理。
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={primaryCta}
                className="inline-flex items-center rounded-md bg-indigo-500 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
              >
                {primaryLabel} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="#workflow"
                className="text-sm font-medium text-slate-200 hover:text-white"
              >
                查看操作流程
              </Link>
            </div>
            <div className="grid gap-4 text-sm text-slate-300 sm:grid-cols-3">
              <div>
                <p className="text-2xl font-semibold text-white">3</p>
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  免费下载额度
                </p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">1 元</p>
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  超额下载单价
                </p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">100%</p>
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  在线预览无限制
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-indigo-500/20">
            <h2 className="text-lg font-semibold text-white">
              产品演示（示意）
            </h2>
            <div className="mt-6 space-y-4 text-sm text-slate-200">
              <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4">
                <p className="text-xs uppercase text-slate-400">Step 1</p>
                <p className="mt-1 font-medium text-white">
                  上传 slides / 样卷
                </p>
                <p className="text-slate-400">
                  支持 PDF / PPTX，自动解析核心知识点。
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4">
                <p className="text-xs uppercase text-slate-400">Step 2</p>
                <p className="mt-1 font-medium text-white">
                  一键生成模拟卷
                </p>
                <p className="text-slate-400">
                  支持题量 / 难度配置，即时预览 Markdown。
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4">
                <p className="text-xs uppercase text-slate-400">Step 3</p>
                <p className="mt-1 font-medium text-white">
                  下载 PDF / 分享
                </p>
                <p className="text-slate-400">
                  三次免费下载，之后每份仅需 1 元。
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="grid gap-8 rounded-2xl bg-white p-8 text-slate-900 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              智能解析课程资料
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              自动提取 slides / PDF / PPTX 中的重点概念、公式和例题，确保题目覆盖课堂知识点。
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <ShieldCheck className="h-5 w-5 text-indigo-500" />
              Supabase 权限管理
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              内置用户登录、下载额度限制与数据隔离，安全托管在 Supabase。
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <CreditCard className="h-5 w-5 text-indigo-500" />
              灵活计费
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              新用户享受 3 次免费下载，超额下载仅需 1 元 / 份，可扩展微信 / 支付宝支付。
            </p>
          </div>
        </section>

        <section
          id="workflow"
          className="rounded-2xl border border-white/10 bg-white/5 p-10 text-slate-100"
        >
          <h2 className="text-2xl font-semibold text-white">
            操作流程
          </h2>
          <ol className="mt-6 space-y-4 text-sm text-slate-300">
            <li>
              <span className="font-medium text-white">
                ① 注册 / 登录账号 →
              </span>{" "}
              Supabase Auth 邮箱验证码登录。
            </li>
            <li>
              <span className="font-medium text-white">
                ② 上传课程资料 →
              </span>{" "}
              支持 slides 必填，样例试卷选填。
            </li>
            <li>
              <span className="font-medium text-white">
                ③ 配置生成参数 →
              </span>{" "}
              选择题量、难度以及额外说明。
            </li>
            <li>
              <span className="font-medium text-white">
                ④ 在线预览 & 下载 →
              </span>{" "}
              markdown 预览免费，下载消耗额度 / 支付单次费用。
            </li>
          </ol>
        </section>

        <section
          id="pricing"
          className="rounded-2xl border border-white/10 bg-indigo-500/10 p-10 text-slate-100"
        >
          <h2 className="text-2xl font-semibold text-white">
            价格策略
          </h2>
          <p className="mt-4 text-sm text-slate-200">
            每位注册用户自动获得 3 次免费下载额度。额度消耗完毕后，仍可无限在线预览，每次下载仅收取 1 元。
            支持向未来对接微信支付 / Stripe / 支付宝等渠道。
          </p>
        </section>
      </main>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Exam Forge. Crafted on Next.js +
        Supabase + OpenAI.
      </footer>
    </div>
  );
}
