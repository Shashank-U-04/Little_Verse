"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { AuthShell, Field, primaryButton } from "@/components/family/AuthShell";
import { signIn } from "@/lib/family";

/** Only same-site paths are followed after sign-in. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/profiles";
}

function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    const result = await signIn({ email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(next);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field label="Email" id="email" name="email" type="email" autoComplete="email" required />
      <Field label="Password" id="password" name="password" type="password" autoComplete="current-password" required />
      {error && (
        <p role="alert" className="rounded-2xl bg-[#FFE4DE] px-4 py-3 text-sm font-bold text-[#8a3a2a]">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className={primaryButton}>
        {busy ? "Signing in…" : "Sign in"}
        {!busy && <ArrowRight className="h-5 w-5" aria-hidden />}
      </button>
      <p className="text-center text-sm text-[#53645B]">
        New to LittleVerse?{" "}
        <Link href="/signup" className="font-bold text-[#205C43] underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to open your family's explorers and dashboards.">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
