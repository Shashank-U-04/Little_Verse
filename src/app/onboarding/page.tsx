"use client";

import { Suspense, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Plus, X } from "lucide-react";
import SiteHeader from "@/components/nav/SiteHeader";
import JungleScene from "@/components/explorer/JungleScene";
import { GateLoader, useFamilyGate } from "@/components/family/useFamilyGate";
import { Symbol3D } from "@/components/ui/Symbol3D";
import {
  AVATAR_IDS,
  AVATARS,
  HOBBY_SUGGESTIONS,
  MAX_AGE,
  MIN_AGE,
  validateChildInput,
  type ChildInput,
  type ChildInputErrors,
  type ChildProfile,
} from "@/features/family/profile";
import { FOCUS_AREA_IDS, FOCUS_AREAS, type FocusArea } from "@/features/learning/catalog";
import { createChild, updateChild } from "@/lib/family";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "name", fields: ["name", "avatar"] },
  { key: "age", fields: ["age"] },
  { key: "hobbies", fields: ["hobbies"] },
  { key: "focus", fields: ["focusAreas"] },
] as const satisfies ReadonlyArray<{ key: string; fields: ReadonlyArray<keyof ChildInput> }>;

const AGES = Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => MIN_AGE + i);

function emptyInput(): ChildInput {
  return { name: "", age: 0, hobbies: [], focusAreas: [], avatar: "tiger" };
}

function ChildForm({ parentId, editing }: { parentId: string; editing: ChildProfile | null }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [input, setInput] = useState<ChildInput>(() =>
    editing
      ? { name: editing.name, age: editing.age, hobbies: editing.hobbies, focusAreas: editing.focusAreas, avatar: editing.avatar }
      : emptyInput(),
  );
  const [errors, setErrors] = useState<ChildInputErrors>({});
  const [hobbyDraft, setHobbyDraft] = useState("");
  const name = input.name.trim() || "your explorer";

  const update = <K extends keyof ChildInput>(key: K, value: ChildInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  /** Validates only the fields on the current step. */
  const stepErrors = (): ChildInputErrors => {
    const result = validateChildInput(input);
    if (result.ok) return {};
    const own: ChildInputErrors = {};
    for (const field of STEPS[step]!.fields) if (result.errors[field]) own[field] = result.errors[field];
    return own;
  };

  const go = (delta: number) => {
    if (delta > 0) {
      const own = stepErrors();
      if (Object.keys(own).length > 0) {
        setErrors(own);
        return;
      }
    }
    setDirection(delta);
    setStep((s) => Math.min(STEPS.length - 1, Math.max(0, s + delta)));
  };

  const addHobby = (hobby: string) => {
    const value = hobby.trim();
    if (!value || input.hobbies.some((h) => h.toLowerCase() === value.toLowerCase())) return;
    update("hobbies", [...input.hobbies, value].slice(0, 8));
  };

  const toggleHobby = (hobby: string) => {
    if (input.hobbies.includes(hobby)) update("hobbies", input.hobbies.filter((h) => h !== hobby));
    else addHobby(hobby);
  };

  const toggleFocus = (area: FocusArea) => {
    update("focusAreas", input.focusAreas.includes(area) ? input.focusAreas.filter((a) => a !== area) : [...input.focusAreas, area]);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (step < STEPS.length - 1) {
      go(1);
      return;
    }
    const result = validateChildInput(input);
    if (!result.ok) {
      setErrors(result.errors);
      const firstBad = STEPS.findIndex((s) => s.fields.some((f) => result.errors[f]));
      if (firstBad >= 0) setStep(firstBad);
      return;
    }
    if (editing) {
      updateChild(editing.id, result.value);
      router.push("/parent");
    } else {
      createChild(parentId, result.value);
      router.push("/kids");
    }
  };

  const onHobbyKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addHobby(hobbyDraft);
      setHobbyDraft("");
    }
  };

  const errorText = (field: keyof ChildInput) =>
    errors[field] ? (
      <p role="alert" className="mt-3 text-sm font-bold text-[#B4442F]">
        {errors[field]}
      </p>
    ) : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="relative w-full max-w-2xl">
      <div className="mb-5 flex items-center justify-center gap-2" aria-label={`Step ${step + 1} of ${STEPS.length}`} role="group">
        {STEPS.map((s, i) => (
          <span
            key={s.key}
            aria-hidden
            className={cn("h-2.5 rounded-full transition-all duration-300", i < step ? "w-8 bg-[#77B96A]" : i === step ? "w-12 bg-[#FFD166]" : "w-2.5 bg-white/60")}
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_24px_60px_rgba(18,61,48,0.25)] backdrop-blur-md">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="p-6 sm:p-8"
          >
            {step === 0 && (
              <fieldset>
                <legend className="font-display text-2xl font-bold text-[#123D30] sm:text-3xl">
                  {editing ? `Edit ${editing.name}'s profile` : "Who's going exploring?"}
                </legend>
                <p className="mt-1 text-sm text-[#53645B]">Their first name is how Miko will greet them.</p>
                <label htmlFor="child-name" className="mt-5 block text-sm font-bold text-[#24352B]">
                  Child&apos;s first name
                </label>
                <input
                  id="child-name"
                  value={input.name}
                  onChange={(e) => update("name", e.target.value)}
                  autoComplete="off"
                  maxLength={30}
                  aria-invalid={errors.name ? true : undefined}
                  className="mt-1.5 block min-h-14 w-full rounded-2xl border-2 border-[#205C43]/15 bg-[#FFFDF7] px-4 font-display text-xl text-[#123D30] outline-none focus:border-[#2E8B57] focus:ring-4 focus:ring-[#77B96A]/25"
                />
                {errorText("name")}
                <p id="avatar-label" className="mt-6 text-sm font-bold text-[#24352B]">
                  Pick an explorer buddy
                </p>
                <div role="radiogroup" aria-labelledby="avatar-label" className="mt-2 grid grid-cols-5 gap-2 sm:gap-3">
                  {AVATAR_IDS.map((avatar) => {
                    const chosen = input.avatar === avatar;
                    return (
                      <button
                        key={avatar}
                        type="button"
                        role="radio"
                        aria-checked={chosen}
                        aria-label={AVATARS[avatar]}
                        onClick={() => update("avatar", avatar)}
                        className={cn(
                          "relative flex aspect-square items-center justify-center rounded-2xl border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2",
                          chosen ? "scale-105 border-[#FFC233] bg-[#FFF4D6] shadow-[0_8px_18px_rgba(232,162,0,0.3)]" : "border-[#205C43]/10 bg-white hover:-translate-y-0.5",
                        )}
                      >
                        <Symbol3D name={avatar} size={44} />
                        {chosen && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#2E8B57] text-white">
                            <Check className="h-4 w-4" aria-hidden />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {step === 1 && (
              <fieldset>
                <legend className="font-display text-2xl font-bold text-[#123D30] sm:text-3xl">How old is {name}?</legend>
                <p className="mt-1 text-sm text-[#53645B]">We use age to choose adventures that are just the right challenge.</p>
                <div role="radiogroup" aria-label="Age" className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {AGES.map((age) => {
                    const chosen = input.age === age;
                    return (
                      <button
                        key={age}
                        type="button"
                        role="radio"
                        aria-checked={chosen}
                        aria-label={`${age} years old`}
                        onClick={() => update("age", age)}
                        className={cn(
                          "flex aspect-square flex-col items-center justify-center rounded-3xl border-2 font-display transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2",
                          chosen
                            ? "scale-105 border-transparent bg-gradient-to-br from-[#FFD166] to-[#FF9F43] text-[#123D30] shadow-[0_10px_20px_rgba(255,159,67,0.4)]"
                            : "border-[#205C43]/10 bg-white text-[#205C43] hover:-translate-y-1",
                        )}
                      >
                        <span className="text-4xl font-bold leading-none">{age}</span>
                        <span className="mt-1 text-xs font-semibold">years</span>
                      </button>
                    );
                  })}
                </div>
                {errorText("age")}
              </fieldset>
            )}

            {step === 2 && (
              <fieldset>
                <legend className="font-display text-2xl font-bold text-[#123D30] sm:text-3xl">What does {name} love?</legend>
                <p className="mt-1 text-sm text-[#53645B]">Pick a few hobbies, or add your own. Miko will chat about them.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {HOBBY_SUGGESTIONS.map((hobby) => {
                    const chosen = input.hobbies.includes(hobby);
                    return (
                      <button
                        key={hobby}
                        type="button"
                        aria-pressed={chosen}
                        onClick={() => toggleHobby(hobby)}
                        className={cn(
                          "inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43]",
                          chosen ? "border-[#2E8B57] bg-[#2E8B57] text-white" : "border-[#205C43]/15 bg-white text-[#205C43] hover:border-[#205C43]/35",
                        )}
                      >
                        {chosen && <Check className="h-4 w-4" aria-hidden />}
                        {hobby}
                      </button>
                    );
                  })}
                  {input.hobbies
                    .filter((h) => !(HOBBY_SUGGESTIONS as readonly string[]).includes(h))
                    .map((hobby) => (
                      <button
                        key={hobby}
                        type="button"
                        onClick={() => toggleHobby(hobby)}
                        aria-label={`Remove ${hobby}`}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-[#2E8B57] bg-[#2E8B57] px-4 text-sm font-bold text-white"
                      >
                        {hobby}
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    ))}
                </div>
                <div className="mt-5 flex gap-2">
                  <label htmlFor="hobby-draft" className="sr-only">
                    Add another hobby
                  </label>
                  <input
                    id="hobby-draft"
                    value={hobbyDraft}
                    onChange={(e) => setHobbyDraft(e.target.value)}
                    onKeyDown={onHobbyKey}
                    maxLength={24}
                    placeholder="Something else they love…"
                    className="min-h-12 flex-1 rounded-2xl border-2 border-[#205C43]/15 bg-[#FFFDF7] px-4 text-base outline-none focus:border-[#2E8B57] focus:ring-4 focus:ring-[#77B96A]/25"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addHobby(hobbyDraft);
                      setHobbyDraft("");
                    }}
                    className="inline-flex min-h-12 items-center gap-1 rounded-2xl bg-[#FFF4D6] px-4 text-sm font-extrabold text-[#684800] hover:bg-[#FFE9A8]"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Add
                  </button>
                </div>
                <p className="mt-2 text-xs text-[#53645B]">Optional. You can change these later in Settings.</p>
                {errorText("hobbies")}
              </fieldset>
            )}

            {step === 3 && (
              <fieldset>
                <legend className="font-display text-2xl font-bold text-[#123D30] sm:text-3xl">What should {name} focus on?</legend>
                <p className="mt-1 text-sm text-[#53645B]">Adventures that match these goals are recommended first. Choose one or more.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {FOCUS_AREA_IDS.map((area) => {
                    const chosen = input.focusAreas.includes(area);
                    const info = FOCUS_AREAS[area];
                    return (
                      <button
                        key={area}
                        type="button"
                        aria-pressed={chosen}
                        onClick={() => toggleFocus(area)}
                        className={cn(
                          "flex items-center gap-3 rounded-3xl border-2 p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2",
                          chosen ? "border-[#2E8B57] bg-[#E8F5E9] shadow-[0_8px_18px_rgba(46,139,87,0.2)]" : "border-[#205C43]/10 bg-white hover:border-[#205C43]/30",
                        )}
                      >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                          <Symbol3D name={info.symbol} size={36} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-base font-semibold text-[#123D30]">{info.label}</span>
                          <span className="block text-xs text-[#53645B]">{info.description}</span>
                        </span>
                        <span
                          aria-hidden
                          className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2", chosen ? "border-[#2E8B57] bg-[#2E8B57] text-white" : "border-[#205C43]/20")}
                        >
                          {chosen && <Check className="h-4 w-4" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {errorText("focusAreas")}
              </fieldset>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3 border-t border-[#205C43]/10 bg-[#FFFBEF] px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => (step === 0 ? router.back() : go(-1))}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-full px-4 text-sm font-bold text-[#205C43] hover:bg-[#205C43]/[0.07]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </button>
          <button
            type="submit"
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#2E8B57] to-[#205C43] px-7 text-base font-extrabold text-white shadow-[0_8px_20px_rgba(32,92,67,0.3)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"
          >
            {step < STEPS.length - 1 ? "Next" : editing ? "Save changes" : "Create explorer profile"}
            {step < STEPS.length - 1 ? <ArrowRight className="h-5 w-5" aria-hidden /> : <Check className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
    </form>
  );
}

function OnboardingInner() {
  const family = useFamilyGate("parent");
  const editId = useSearchParams().get("edit");
  if (!family?.parent) return <GateLoader />;
  const editing = editId ? family.children.find((c) => c.id === editId) ?? null : null;
  return <ChildForm key={editing?.id ?? "new"} parentId={family.parent.id} editing={editing} />;
}

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="relative isolate flex flex-1 items-center justify-center overflow-hidden px-4 py-10">
        <JungleScene variant="compact" className="-z-10" />
        <div className="absolute inset-0 -z-10 bg-[#123D30]/20" aria-hidden />
        <Suspense fallback={<GateLoader />}>
          <OnboardingInner />
        </Suspense>
      </main>
    </div>
  );
}
