"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Mic,
  Trash2,
  Globe,
  Timer,
  Lock,
  Languages,
  Database,
  Info,
  AlertTriangle,
  CheckCircle2,
  LogOut,
  Pencil,
  UserPlus,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { clearVoiceConsent, readVoiceConsent, type VoiceConsent } from "@/lib/voice/voiceConsent";
import { ChildAvatar } from "@/components/family/ChildAvatar";
import { GateLoader, useFamilyGate } from "@/components/family/useFamilyGate";
import { deleteChild, signOut } from "@/lib/family";
import { notifyStorageChange } from "@/lib/storage";

const STORAGE_KEY = "littleverse:sessions";
const SETTINGS_KEY = "littleverse:settings";
const APP_VERSION = "0.1.0";

type TimeLimit = "5" | "10" | "15";

export default function ParentSettingsPage(): React.ReactElement {
  const [timeLimit, setTimeLimit] = useState<TimeLimit>("10");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [voiceConsent, setVoiceConsent] = useState<VoiceConsent | null>(null);
  const family = useFamilyGate("parent");
  const router = useRouter();

  function handleRemoveChild(id: string, name: string): void {
    if (!window.confirm(`Remove ${name}'s profile?

This deletes ${name}'s adventures, XP and badges from this browser. This cannot be undone.`)) return;
    deleteChild(id);
  }

  function handleSignOut(): void {
    signOut();
    router.push("/");
  }

  useEffect(() => {
    try {
      // Hydration from browser storage after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVoiceConsent(readVoiceConsent(window.localStorage));
    } catch {
      // Storage unavailable: voice consent cannot have been saved.
    }
  }, []);

  function handleWithdrawVoiceConsent(): void {
    try {
      clearVoiceConsent(window.localStorage);
    } catch {
      // Nothing stored to clear.
    }
    setVoiceConsent(null);
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null && "timeLimit" in parsed) {
        const value = (parsed as { timeLimit?: unknown }).timeLimit;
        if (value === "5" || value === "10" || value === "15") {
          // This is hydration from browser storage, not a render-time default.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setTimeLimit(value);
        }
      }
    } catch {
      // Settings are optional; keep the safe default when storage is unavailable.
    }
  }, []);

  function handleTimeLimitChange(value: TimeLimit): void {
    setTimeLimit(value);
    setSaveMessage(null);
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ timeLimit: value }));
      setSaveMessage("Saved on this device");
    } catch {
      setSaveMessage("Could not save this preference");
    }
  }

  function handleClearData(): void {
    const confirmed = window.confirm(
      `Clear all local learning data?\n\nThis will remove all sessions stored under "${STORAGE_KEY}" in this browser. This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      notifyStorageChange();
      window.alert("Local data cleared.");
    } catch {
      window.alert("Could not clear data \— storage is unavailable.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-[#205C43] sm:text-2xl">Settings & Privacy</h1>
        <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[#24352B]/85">
          Manage learning preferences and understand how LittleVerse AI protects your child.
        </p>
      </div>

      {!family?.parent ? (
        <GateLoader label="Loading your family…" />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Account &amp; explorers</CardTitle>
            <p className="text-xs text-[#24352B]/85">
              Signed in as <span className="font-bold">{family.parent.name}</span> ({family.parent.email}) on this device.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <ul className="divide-y divide-[#FFF4D6]">
              {family.children.map((child, i) => (
                <li key={child.id} className="flex flex-wrap items-center gap-3 py-3">
                  <ChildAvatar avatar={child.avatar} size={44} tone={i} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#205C43]">{child.name}</p>
                    <p className="text-xs text-[#24352B]/85">Age {child.age} · {child.hobbies.length ? child.hobbies.join(", ") : "No hobbies yet"}</p>
                  </div>
                  <Link
                    href={`/onboarding?edit=${encodeURIComponent(child.id)}`}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#205C43]/15 px-3 text-xs font-bold text-[#205C43] hover:bg-[#205C43]/[0.06]"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleRemoveChild(child.id, child.name)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#FF8A72]/40 px-3 text-xs font-bold text-[#8a3a2a] hover:bg-[#FFE4DE]"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Link href="/onboarding" className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#205C43] px-4 text-sm font-bold text-white hover:bg-[#184a36]">
                <UserPlus className="h-4 w-4" aria-hidden />
                Add a child
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#205C43]/20 bg-white px-4 text-sm font-bold text-[#205C43] hover:bg-[#FFF4D6]"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Sign out of this device
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* A � Learning Preferences */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#E8F5E9] text-[#205C43]">
              <Languages className="h-3.5 w-3.5" aria-hidden />
            </span>
            <CardTitle className="text-base">Learning Preferences</CardTitle>
          </div>
          <p className="text-xs leading-relaxed text-[#24352B]/85">Language and session controls for your child.</p>
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          {/* Language */}
          <div className="rounded-2xl border border-[#FFF4D6] bg-[#FFF8E9] px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#205C43] shadow-sm">
                  <Globe className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-[13px] font-bold tracking-tight text-[#205C43]">Language</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#24352B]/85">
                    Voice and text language used during adventures and hints.
                  </p>
                </div>
              </div>
              <Badge variant="sky" className="shrink-0 text-[10px]">
                MVP
              </Badge>
            </div>
            <div className="mt-3">
              <label htmlFor="lv-language" className="sr-only">
                Language
              </label>
              <select
                id="lv-language"
                disabled
                value="en"
                className="w-full cursor-not-allowed rounded-full border border-[#FFF0C9] bg-white px-4 py-2.5 text-sm font-medium text-[#205C43]/90 shadow-sm"
                aria-describedby="lv-language-help"
              >
                <option value="en">English</option>
              </select>
              <p id="lv-language-help" className="mt-2 text-[11px] leading-relaxed text-[#24352B]/85">
                English \— more languages coming soon
              </p>
            </div>
          </div>

          {/* Daily time limit */}
          <div className="rounded-2xl border border-[#FFF4D6] bg-white px-4 py-4">
            <div className="flex gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF4D6] text-[#7a5a00] shadow-sm">
                <Timer className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold tracking-tight text-[#205C43]">Daily time limit</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#24352B]/85">
                  Recommended session length. The app will gently wrap up when the limit is reached.
                </p>
                <div className="mt-3">
                  <label htmlFor="lv-timelimit" className="sr-only">
                    Daily time limit
                  </label>
                  <select
                    id="lv-timelimit"
                    value={timeLimit}
                    onChange={(e) => handleTimeLimitChange(e.target.value as TimeLimit)}
                    className="w-full rounded-full border border-[#FFF0C9] bg-[#FFF8E9] px-4 py-2.5 text-sm font-semibold text-[#205C43] shadow-sm focus:border-[#205C43]/20 focus:outline-none focus:ring-2 focus:ring-[#205C43]/15"
                  >
                    <option value="5">5 minutes</option>
                    <option value="10">10 minutes</option>
                    <option value="15">15 minutes</option>
                  </select>
                  <p className="mt-2 text-[11px] leading-relaxed text-[#24352B]/85">
                    Stored locally on this device. Gentle enforcement will ship with account support.
                  </p>
                  {saveMessage && <p className="mt-1 text-[11px] font-semibold text-[#205C43]" role="status">{saveMessage}</p>}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* B � Privacy & Safety */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#E8F5E9] text-[#205C43]">
              <Shield className="h-3.5 w-3.5" aria-hidden />
            </span>
            <CardTitle className="text-base">Privacy & Safety</CardTitle>
          </div>
          <p className="text-xs leading-relaxed text-[#24352B]/85">How your child\’s learning data is handled.</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <ul className="space-y-3">
            <li className="flex gap-3 rounded-2xl bg-[#F1F8E9] px-4 py-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#205C43]" aria-hidden />
              <div>
                <p className="text-[13px] font-semibold tracking-tight text-[#205C43]">Minimal data collection</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#24352B]/85">
                  Only counts, hints used, and accuracy are stored \— no names, photos, or browsing activity.
                </p>
              </div>
            </li>
            <li className="flex gap-3 rounded-2xl bg-[#FFF8E9] px-4 py-3">
              <Mic className="mt-0.5 h-4 w-4 shrink-0 text-[#205C43]" aria-hidden />
              <div>
                <p className="text-[13px] font-semibold tracking-tight text-[#205C43]">Voice: what LittleVerse stores vs. what voice partners keep</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#24352B]/85">
                  <strong>LittleVerse stores no audio and no transcripts.</strong> When your child uses{" "}
                  <strong>Talk to Miko</strong>, their voice streams to Bolna (with Deepgram, OpenAI and ElevenLabs).{" "}
                  <strong>Bolna keeps a recording and transcript of each call</strong> in its call history, and Bolna sets how long.
                  The round microphone button (<strong>Tap to answer</strong>) uses the browser&apos;s speech recognition; in Chrome that audio goes to Google.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-[#205C43]" role="status">
                    {voiceConsent ? `Voice consent given on this device (${new Date(voiceConsent.acceptedAt).toLocaleDateString("en-IN")}).` : "Voice is off until a grown-up agrees on this device."}
                  </span>
                  {voiceConsent && (
                    <Button variant="secondary" size="sm" onClick={handleWithdrawVoiceConsent}>
                      Withdraw voice consent
                    </Button>
                  )}
                </div>
              </div>
            </li>
            <li className="flex gap-3 rounded-2xl bg-[#FFF8E9] px-4 py-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#205C43]" aria-hidden />
              <div>
                <p className="text-[13px] font-semibold tracking-tight text-[#205C43]">Prototype access</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#24352B]/85">
                  Parent routes are not authentication-protected in this local MVP. Add a parent sign-in and server-side authorization before production use.
                </p>
              </div>
            </li>
            <li className="flex gap-3 rounded-2xl bg-[#E3F2FD]/60 px-4 py-3">
              <Database className="mt-0.5 h-4 w-4 shrink-0 text-[#1a4a6e]" aria-hidden />
              <div>
                <p className="text-[13px] font-semibold tracking-tight text-[#205C43]">Local storage only (MVP)</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#24352B]/85">
                  All data lives in this browser under <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-[#205C43]">{STORAGE_KEY}</code>. No cloud sync until parents opt in.
                </p>
              </div>
            </li>
          </ul>

          <div className="rounded-2xl border border-[#E3F2FD] bg-[#F5F9FF] px-4 py-4">
            <div className="flex gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[#1a4a6e] shadow-sm">
                <Info className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-bold tracking-tight text-[#1a4a6e]">When Supabase is added</p>
                <p className="mt-1 text-xs leading-relaxed text-[#24352B]/85">
                  Data will be protected with row-level security (RLS): learners and parents can only read their own
                  family\’s rows. All writes require authentication. No cross-family access, even for admins
                  querying via the app.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* C � Safety boundaries */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FFE4DE] text-[#8a3a2a]">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            </span>
            <CardTitle className="text-base">Safety Boundaries</CardTitle>
          </div>
          <p className="text-xs leading-relaxed text-[#24352B]/85">How the tutor stays safe and age-appropriate.</p>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="space-y-2.5 text-xs leading-relaxed text-[#24352B]/85">
            <li className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#205C43]" aria-hidden />
              <span>
                <span className="font-semibold text-[#205C43]">Bounded prompts:</span> the tutor only follows
                configured learning prompts. It cannot adopt arbitrary roles or instructions from chat.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#205C43]" aria-hidden />
              <span>
                <span className="font-semibold text-[#205C43]">No personal information questions:</span> the tutor never asks for a child\’s name, address, school, or
                contact details.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#205C43]" aria-hidden />
              <span>
                <span className="font-semibold text-[#205C43]">No emotional dependency:</span> the tutor celebrates effort, not attachment. It does not present itself as a
                friend who needs the child or claim feelings.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#205C43]" aria-hidden />
              <span>
                <span className="font-semibold text-[#205C43]">Concerning disclosures:</span> if a child shares something that suggests they may be unsafe, the tutor gently
                redirects and encourages talking to a trusted grown-up \— it does not attempt counselling.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* D � Data */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF4D6] text-[#7a5a00]">
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </span>
            <CardTitle className="text-base">Data</CardTitle>
          </div>
          <p className="text-xs leading-relaxed text-[#24352B]/85">
            Stored locally in this browser. You can remove it at any time.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="rounded-2xl border border-[#FFF4D6] bg-[#FFF8E9] px-4 py-3">
            <p className="text-[11px] font-semibold tracking-wide text-[#24352B]/85">Storage key</p>
            <code className="mt-1 inline-flex rounded-full bg-white px-3 py-1.5 font-mono text-xs font-semibold text-[#205C43] shadow-sm">
              {STORAGE_KEY}
            </code>
            <p className="mt-2 text-[11px] leading-relaxed text-[#24352B]/85">
              Sessions are saved as JSON under this localStorage key. Clearing this key removes all progress charts and skill evidence on this device.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="coral" size="md" onClick={handleClearData} className="gap-2">
              <Trash2 className="h-4 w-4" aria-hidden />
              Clear local data
            </Button>
            <span className="text-xs text-[#24352B]/85">Removes all sessions from this browser</span>
          </div>
          <p className="text-[11px] leading-relaxed text-[#24352B]/85">
            You will be asked to confirm before anything is deleted. No network request is made.
          </p>
        </CardContent>
      </Card>

      {/* E � About */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#F1F8E9] text-[#205C43]">
              <Info className="h-3.5 w-3.5" aria-hidden />
            </span>
            <CardTitle className="text-base">About</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="leaf" className="text-[11px]">
              v{APP_VERSION} \u00b7 MVP
            </Badge>
            <span className="text-xs text-[#24352B]/85">LittleVerse AI \— Jungle Counting Adventure</span>
          </div>
          <p className="text-xs leading-relaxed text-[#24352B]/85">
            This is an early build focused on a single adventure. Feedback from families guides what we build next.
          </p>
          <div className="rounded-2xl border border-[#FFF4D6] bg-[#FFF8E9] px-4 py-3">
            <p className="text-[11px] font-semibold tracking-wide text-[#24352B]/85">Privacy note</p>
            <p className="mt-1 text-xs leading-relaxed text-[#24352B]/85">
              We store only what helps your child learn \— counts, hints, and accuracy. No ads, no tracking, no data sale. When cloud features arrive, parents will explicitly opt in before any sync happens, and every row will require authentication.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
