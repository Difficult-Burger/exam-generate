import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <Link
        href="/"
        className="mb-8 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        ← 返回产品主页
      </Link>
      <SignInForm />
      <p className="mt-6 text-xs text-slate-400">
        登录即表示你同意我们的
        <a href="#" className="mx-1 underline">
          服务条款
        </a>
        和
        <a href="#" className="ml-1 underline">
          隐私政策
        </a>
        。
      </p>
    </div>
  );
}
