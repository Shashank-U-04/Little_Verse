"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { AuthShell, Field, primaryButton } from "@/components/family/AuthShell";
import { signUp } from "@/lib/family";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) {
      setError("The two passwords don't match.");
      return;
    }
    if (form.get("guardian") !== "on") {
      setError("Please confirm you are a parent or guardian.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await signUp({ name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""), password });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/onboarding");
  }

  return (
    <AuthShell title="Create your parent account" subtitle="You'll set up your child's explorer profile next.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Your name" id="name" name="name" autoComplete="name" required />
        <Field label="Email" id="email" name="email" type="email" autoComplete="email" required />
        <Field label="Password" id="password" name="password" type="password" autoComplete="new-password" hint="At least 8 characters." required minLength={8} />
        <Field label="Confirm password" id="confirm" name="confirm" type="password" autoComplete="new-password" required />
        <label className="flex items-start gap-3 rounded-2xl bg-[#FFF8E9] p-3 text-sm text-[#24352B]">
          <input type="checkbox" name="guardian" className="mt-0.5 h-5 w-5 shrink-0 accent-[#2E8B57]" />
          <span>I&apos;m the parent or guardian of the child who will use LittleVerse, and I&apos;m 18 or older.</span>
        </label>
        {error && (
          <p role="alert" className="rounded-2xl bg-[#FFE4DE] px-4 py-3 text-sm font-bold text-[#8a3a2a]">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? "Creating account…" : "Create account"}
          {!busy && <ArrowRight className="h-5 w-5" aria-hidden />}
        </button>
        <p className="text-center text-sm text-[#53645B]">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-[#205C43] underline underline-offset-4">
            Sign in
          </Link>
        </p>
        <p className="text-center text-[11px] leading-4 text-[#53645B]">
          Accounts are stored only in this browser for this prototype. Passwords are hashed before they are saved.
        </p>
      </form>
    </AuthShell>
  );
}
