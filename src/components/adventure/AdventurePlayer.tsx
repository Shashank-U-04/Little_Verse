"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Lightbulb, Sparkles, Volume2, X } from "lucide-react";
import { ChildAvatar } from "@/components/family/ChildAvatar";
import { ConfettiBurst } from "@/components/game/GameBits";
import { Symbol3D } from "@/components/ui/Symbol3D";
import { OBJECTS, pluralOf } from "@/features/learning/objects";
import { XP_RULES } from "@/features/gamification/progression";
import Miko from "@/components/character/Miko";
import JungleScene from "@/components/explorer/JungleScene";
import CountableObjects from "@/components/adventure/CountableObjects";
import MikoVoiceOrb from "@/components/voice/MikoVoiceOrb";
import VoiceConsentDialog from "@/components/voice/VoiceConsentDialog";
import MicHelp from "@/components/voice/MicHelp";
import { browserMicEnvironment, micEnvironmentProblem, micProblemFromBolnaError, type MicProblemKind } from "@/components/voice/micProblem";
import { BolnaWebCall, type CallError } from "@bolna/web-call";
import { Button } from "@/components/ui/button";
import { getHint, validateAnswer } from "@/features/learning/validation";
import { createNewSession, saveSession } from "@/lib/storage";
import { BolnaCallAdapter, type BolnaUiSnapshot } from "@/lib/bolna/bolnaCallAdapter";
import { BrowserSpeechController, type SpeechUtterancePort } from "@/lib/voice/browserSpeechController";
import { requestBolnaSession, type LessonPointer } from "@/lib/voice/bolnaSession";
import { initialTutorVoiceMode, readVoiceConsent, saveVoiceConsent, type TutorVoiceMode } from "@/lib/voice/voiceConsent";
import type { VoiceStatusResponse } from "@/lib/voice/voiceStatus";
import type { AdventureDefinition, Challenge, MikoState, Session } from "@/features/learning/types";
import type { ChildProfile } from "@/features/family/profile";
const CELEBRATIONS = ["You did it! Amazing counting! \u2B50","Brilliant \u2014 you got it right!","Wonderful! You counted perfectly!","Fantastic job! High five! \u2728"] as const;
function browserStorage(): Storage | null { try { return typeof window==="undefined" ? null : window.localStorage; } catch { return null; } }
function pickCelebration(): string { return CELEBRATIONS[Math.floor(Math.random()*CELEBRATIONS.length)]!; }
function computeHighlighted(challenge: Challenge, hintLevel: number, wasCorrect: boolean): number { if (wasCorrect) return challenge.objectCount; if (hintLevel >= 2) return challenge.objectCount; if (hintLevel >= 1) return Math.min(challenge.objectCount, hintLevel+1); return 0; }
export default function AdventurePlayer({adventure,learner}:{adventure:AdventureDefinition;learner:ChildProfile}){
  const router = useRouter();
  const challenges = adventure.challenges;
  const [session,setSession]=useState<Session|null>(null);
  const [idx,setIdx]=useState(0);
  const [hintLevel,setHintLevel]=useState(0);
  const [feedback,setFeedback]=useState<{type:"correct"|"encourage"|"hint";text:string}|null>(null);
  const [selected,setSelected]=useState<number|null>(null);
  const [isBusy,setIsBusy]=useState(false);
  const [mikoState,setMikoState]=useState<MikoState>("idle");
  const [tappedIndices,setTappedIndices]=useState<Set<number>>(new Set());
  const [showNext,setShowNext]=useState(false);
  const [revealAnswer,setRevealAnswer]=useState(false);
  // XP shown while playing; the saved session is what progression actually counts.
  const [xpEarned,setXpEarned]=useState(0);
  const [xpPop,setXpPop]=useState<{amount:number;key:number}|null>(null);
  const [bolnaSnapshot,setBolnaSnapshot]=useState<BolnaUiSnapshot>({state:"idle",error:null});
  const advanceTimeoutRef=useRef<number|null>(null);
  const resetSelectedTimeoutRef=useRef<number|null>(null);
  const submitLockRef=useRef(false);
  const advanceLockRef=useRef(false);
  const sessionInitializedRef=useRef(false);
  // Bolna is the tutor's voice; device speech runs only when explicitly chosen.
  const [voiceStatus,setVoiceStatus]=useState<VoiceStatusResponse|null>(null);
  const [tutorVoice,setTutorVoiceState]=useState<TutorVoiceMode>("off");
  const tutorVoiceRef=useRef<TutorVoiceMode>("off");
  const [hasVoiceConsent,setHasVoiceConsent]=useState(false);
  const [consentDialogOpen,setConsentDialogOpen]=useState(false);
  const [voiceNotice,setVoiceNotice]=useState<string|null>(null);
  // Microphone problems, classified so a grown-up gets the right fix (see MicHelp).
  const [bolnaCallError,setBolnaCallError]=useState<CallError|null>(null);
  const [bolnaPreflightProblem,setBolnaPreflightProblem]=useState<MicProblemKind|null>(null);
  const lessonRef=useRef<LessonPointer>({adventureId:adventure.id, challengeIndex:0});
  // getSession runs inside call.start() from a click, never during render; it reads the latest challenge.
  // The extra error listener keeps the SDK's original cause (e.g. NotFoundError), which the adapter summarises.
  // eslint-disable-next-line react-hooks/refs
  const [bolnaAdapter]=useState(()=>new BolnaCallAdapter(()=>{
    const call=new BolnaWebCall({getSession:()=>requestBolnaSession(lessonRef.current)});
    call.on("error",(error)=>setBolnaCallError(error));
    return call;
  }));
  const [speechController]=useState(()=>new BrowserSpeechController({
    isAudioOwned:()=>bolnaAdapter.ownsAudio(),
    isEnabled:()=>tutorVoiceRef.current==="device",
    getSynthesis:()=>{
      if(typeof window==="undefined"||!("speechSynthesis" in window)) return null;
      return {
        cancel:()=>window.speechSynthesis.cancel(),
        speak:(utterance)=>window.speechSynthesis.speak(utterance as SpeechSynthesisUtterance),
      };
    },
    createUtterance:(text)=>new SpeechSynthesisUtterance(text) as unknown as SpeechUtterancePort,
    timers:{
      setTimeout:(callback,delayMs)=>window.setTimeout(callback,delayMs),
      clearTimeout:(timerId)=>window.clearTimeout(timerId),
    },
    onStart:()=>setMikoState("speaking"),
    onFinish:()=>setMikoState((current)=>current==="speaking"?"idle":current),
  }));
  const ch: Challenge|undefined = challenges[idx];
  const isLast = idx===challenges.length-1;
  const wasCorrect = feedback?.type==="correct";
  const highlighted = wasCorrect ? (ch?.objectCount??0) : revealAnswer ? (ch?.objectCount??0) : computeHighlighted(ch as Challenge, hintLevel, false) || 0;
  const speak=useCallback((text:string)=>{
    speechController.speak(text);
  },[speechController]);
  const scheduleSpeech=useCallback((text:string,delayMs:number)=>speechController.schedule(text,delayMs),[speechController]);
  const stopSpeaking=useCallback(()=>{
    speechController.cancelAll();
    setMikoState("idle");
  },[speechController]);
  const setTutorVoice=useCallback((mode:TutorVoiceMode)=>{
    tutorVoiceRef.current=mode;
    setTutorVoiceState(mode);
  },[]);
  const refreshVoiceStatus=useCallback(async()=>{
    let status:VoiceStatusResponse;
    try{
      const response=await fetch("/api/voice/status",{cache:"no-store",credentials:"same-origin"});
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      status=(await response.json()) as VoiceStatusResponse;
    }catch{
      status={provider:null,bolnaReady:false,reason:"Voice status could not be checked.",accessCodeRequired:false,unlocked:false};
    }
    setVoiceStatus(status);
    setTutorVoice(initialTutorVoiceMode(status.provider));
    return status;
  },[setTutorVoice]);
  useEffect(()=>{
    // Hydrate consent from browser storage and the configured voice from the server after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasVoiceConsent(readVoiceConsent(browserStorage())!==null);
    void refreshVoiceStatus();
  },[refreshVoiceStatus]);
  useEffect(()=>{
    lessonRef.current={adventureId:adventure.id, challengeIndex:idx};
  },[adventure.id,idx]);
  useEffect(()=>bolnaAdapter.subscribe((snapshot)=>{
    setBolnaSnapshot(snapshot);
    if(bolnaAdapter.ownsAudio()){
      stopSpeaking();
      return;
    }
    if(snapshot.state==="ended"||snapshot.state==="error") stopSpeaking();
    // A failed start may mean the voice pass expired; re-read the server's view.
    if(snapshot.state==="error") void refreshVoiceStatus();
  }),[bolnaAdapter,refreshVoiceStatus,stopSpeaking]);
  useEffect(()=>{
    if(!sessionInitializedRef.current){
      sessionInitializedRef.current=true;
      const s=createNewSession(challenges,{learnerId:learner.id,activityId:adventure.id});
      // Hydrate the client-only session after mount; localStorage is the external source.
      setSession(s);
      saveSession(s);
    }
    return()=>{
      if(advanceTimeoutRef.current) window.clearTimeout(advanceTimeoutRef.current);
      if(resetSelectedTimeoutRef.current) window.clearTimeout(resetSelectedTimeoutRef.current);
      submitLockRef.current=false;
      advanceLockRef.current=false;
      stopSpeaking();
      bolnaAdapter.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  useEffect(()=>{
    if(!ch) return;
    return scheduleSpeech(ch.prompt,400);
  },[idx,ch,scheduleSpeech]);
  const submitAnswer=useCallback((n:number, via:"tap"|"voice")=>{
    if(!ch||!session) return;
    // React batches pointer events, so a state-only guard can still allow two
    // taps from the same render. The ref closes that race before state work.
    if(submitLockRef.current || (isBusy && feedback?.type==="correct") || (feedback?.type==="correct" && showNext) || isBusy) return;
    submitLockRef.current=true;
    const isCorrect=validateAnswer(ch,n);
    const attemptNumber=session.attempts.filter(a=>a.challengeId===ch.id).length+1;
    const attempt={ id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`, challengeId: ch.id, answer:n, isCorrect, hintLevel, attemptNumber, answerType:via, createdAt:new Date().toISOString()} as Session["attempts"][number];
    const nextSession:Session={...session, attempts:[...session.attempts, attempt]};
    setSession(nextSession); saveSession(nextSession);
    if(isCorrect){
      stopSpeaking(); setSelected(n); setFeedback({type:"correct", text:pickCelebration()}); setMikoState("celebrating"); setIsBusy(true); setRevealAnswer(false);
      const gain=hintLevel===0?XP_RULES.solvedUnaided:hintLevel===1?XP_RULES.solvedWithHint:XP_RULES.solvedWithHelp;
      setXpEarned(v=>v+gain); setXpPop({amount:gain,key:Date.now()});
      if(advanceTimeoutRef.current) window.clearTimeout(advanceTimeoutRef.current);
      const t=window.setTimeout(()=>setShowNext(true),1200);
      advanceTimeoutRef.current=t as unknown as number;
      scheduleSpeech(pickCelebration(),200);
    } else {
      const currentHint=hintLevel;
      const lastHintIndex=Math.max(0,ch.hintSequence.length-1);
      const nextHint=Math.min(currentHint+1,lastHintIndex);
      setHintLevel(nextHint); setSelected(n); setRevealAnswer(false);
      // Show the support that was available before this answer. This keeps
      // the attempt record and visible progressive scaffold aligned.
      const hintText=getHint(ch,currentHint) ?? (currentHint===0?"Good try! Let's try again.":"Let's count together! Tap each one.");
      setFeedback({type: currentHint===0?"encourage":"hint", text: hintText}); setMikoState("encouraging"); setIsBusy(false); setShowNext(false);
      submitLockRef.current=false;
      if(resetSelectedTimeoutRef.current) window.clearTimeout(resetSelectedTimeoutRef.current);
      const rt=window.setTimeout(()=>setSelected(null),900);
      resetSelectedTimeoutRef.current=rt as unknown as number;
      scheduleSpeech(hintText,250);
    }
  },[ch,session,isBusy,feedback,hintLevel,showNext,scheduleSpeech,stopSpeaking]);
  const handleNext=useCallback(()=>{
    if(!ch||!session) return;
    // A live Miko call carries on across challenges; only the screen advances.
    if(!feedback||feedback.type!=="correct" || advanceLockRef.current) return;
    advanceLockRef.current=true;
    stopSpeaking();
    if(isLast){
      const done:Session={...session, completedAt:new Date().toISOString(), status:"completed"};
      saveSession(done); setSession(done);
      router.push(`/adventure/${adventure.id}/complete?id=${encodeURIComponent(session.id)}`);
      return;
    }
    setIdx(v=>v+1); setXpPop(null); setHintLevel(0); setFeedback(null); setSelected(null); setIsBusy(false); setShowNext(false); setTappedIndices(new Set()); setRevealAnswer(false); setMikoState("idle");
    submitLockRef.current=false;
    advanceLockRef.current=false;
    if(advanceTimeoutRef.current) window.clearTimeout(advanceTimeoutRef.current);
    if(resetSelectedTimeoutRef.current) window.clearTimeout(resetSelectedTimeoutRef.current);
  },[adventure.id,ch,session,feedback,isLast,router,stopSpeaking]);
  const handleReveal=useCallback(()=>{
    if(!ch) return;
    setRevealAnswer(true); setHintLevel(ch.hintSequence.length-1);
    const objectLabel=pluralOf(ch.objectType);
    const txt=`There are ${ch.objectCount} ${objectLabel}. Let's count \u2014 ${Array.from({length:ch.objectCount},(_,i)=>String(i+1)).join(", ")}! Now you try.`;
    setFeedback({type:"hint", text:txt}); setMikoState("encouraging"); speak(txt);
  },[ch,speak]);
  const handleObjectTap=useCallback((i:number)=>{
    setTappedIndices(prev=>{ const n=new Set(prev); if(n.has(i)) n.delete(i); else n.add(i); return n; });
  },[]);
  const needsGrownUp=!hasVoiceConsent||(voiceStatus?.provider==="bolna"&&voiceStatus.accessCodeRequired&&!voiceStatus.unlocked);
  const handleConsentAccepted=useCallback(()=>{
    saveVoiceConsent(browserStorage(), new Date());
    setHasVoiceConsent(true);
    setConsentDialogOpen(false);
    setVoiceNotice("Voice is on. Tap the orb to talk to Miko.");
    void refreshVoiceStatus();
  },[refreshVoiceStatus]);
  const handleBolnaStart=useCallback(()=>{
    setBolnaCallError(null);
    // A browser that cannot capture audio at all gets clear help instead of a session it cannot use.
    const environmentProblem=micEnvironmentProblem(browserMicEnvironment());
    setBolnaPreflightProblem(environmentProblem);
    if(environmentProblem) return;
    if(needsGrownUp){ setVoiceNotice(null); setConsentDialogOpen(true); return; }
    if(bolnaAdapter.ownsAudio()) return;
    stopSpeaking();
    // Starting Miko's call makes Bolna the tutor voice.
    setTutorVoice("bolna");
    setVoiceNotice(null);
    // Call start synchronously from this click so the browser preserves its
    // user-gesture permission for microphone and audio playback.
    void bolnaAdapter.start().catch(()=>setBolnaSnapshot(bolnaAdapter.getSnapshot()));
  },[bolnaAdapter,needsGrownUp,setTutorVoice,stopSpeaking]);
  const handleBolnaStop=useCallback(()=>{
    void bolnaAdapter.stop().catch(()=>setBolnaSnapshot(bolnaAdapter.getSnapshot()));
  },[bolnaAdapter]);
  // Tapping never uses the microphone, so a live Miko call keeps going.
  const handleTapAnswer=useCallback((n:number)=>submitAnswer(n,"tap"),[submitAnswer]);
  const subscribeAgentLevel=useCallback((listener:(level:number)=>void)=>bolnaAdapter.subscribeAgentLevel(listener),[bolnaAdapter]);
  if(!session||!ch){
    return (
      <div className="relative isolate flex min-h-dvh flex-col">
        <JungleScene variant="hero" className="-z-10"/>
        <main className="flex flex-1 items-center justify-center px-4 py-8">
          <div className="w-full max-w-xl animate-pulse rounded-[2rem] bg-white/85 p-8 shadow-xl backdrop-blur"><div className="flex flex-col items-center gap-4"><Miko state="idle" size="md"/><div className="h-4 w-32 rounded-full bg-[#205C43]/10"/><div className="h-3 w-48 rounded-full bg-[#205C43]/10"/></div></div>
        </main>
      </div>
    );
  }
  const attemptsForThis=session.attempts.filter(a=>a.challengeId===ch.id).length;
  const bolnaOwnsAudio=bolnaAdapter.ownsAudio();
  // Session refusals (locked, rate limited, not set up) keep the adapter's specific message instead.
  const bolnaMicProblem=bolnaPreflightProblem ?? (bolnaSnapshot.state==="error"?micProblemFromBolnaError(bolnaCallError):null);
  const ANSWER_TONES=["border-[#FF8A72] shadow-[0_6px_0_#E0533B]","border-[#FFC233] shadow-[0_6px_0_#E8A200]","border-[#77B96A] shadow-[0_6px_0_#2E8B57]","border-[#8BD3F7] shadow-[0_6px_0_#3BA7D9]"];
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <JungleScene variant="hero" className="-z-10"/>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-white/10 via-transparent to-[#123D30]/25" aria-hidden/>
      <header className="sticky top-0 z-20 border-b border-white/40 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/kids" aria-label="Exit to the Kids Zone" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#205C43]/15 bg-white px-3 text-sm font-bold text-[#205C43] hover:bg-[#FFF4D6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"><X className="h-4 w-4" aria-hidden/> Exit</Link>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2" aria-label={`Challenge ${idx+1} of ${challenges.length}`}>
            <span className="hidden text-xs font-extrabold tracking-wide text-[#205C43] sm:inline">Challenge {idx+1} of {challenges.length}</span>
            <span className="text-xs font-extrabold tracking-wide text-[#205C43] sm:hidden">{idx+1}/{challenges.length}</span>
            <div className="flex items-center gap-1.5" role="progressbar" aria-label="Challenge progress" aria-valuenow={idx+1} aria-valuemin={1} aria-valuemax={challenges.length}>
              {challenges.map((c,i)=>{
                const done=i<idx||(i===idx&&wasCorrect);
                const current=i===idx&&!wasCorrect;
                return (
                  <span key={c.id} aria-hidden className={["flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300", done?"border-[#77B96A] bg-[#E8F5E9]":current?"scale-110 border-[#FFC233] bg-[#FFF4D6] shadow-[0_0_0_4px_rgba(255,194,51,0.25)]":"border-[#205C43]/15 bg-white"].join(" ")}>
                    <Symbol3D name={OBJECTS[c.objectType].symbol} size={20} className={done||current?"":"opacity-30 grayscale"}/>
                  </span>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.span key={xpEarned} initial={{scale:1.3}} animate={{scale:1}} className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#FFD166] to-[#FF9F43] px-2.5 py-1 text-xs font-extrabold text-[#123D30] shadow-sm" aria-label={`${xpEarned} XP earned in this adventure`}>
              <Symbol3D name="star" size={16}/>{xpEarned} XP
            </motion.span>
            <span className="hidden sm:inline-flex"><ChildAvatar avatar={learner.avatar} size={36}/></span>
          </div>
        </div>
      </header>
      <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 pb-10">
        <AnimatePresence mode="wait">
          <motion.div key={idx} initial={{opacity:0,y:16,scale:0.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-12}} transition={{duration:0.32,ease:"easeOut"}} className="relative">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_24px_60px_rgba(18,61,48,0.25)] backdrop-blur-md">
              {wasCorrect && <ConfettiBurst pieces={36}/>}
              <div className="p-5 sm:p-7">
                <div className="flex flex-col items-center">
                  <Miko state={mikoState} size="md" message={feedback?.text} />
                  <div className="mt-3 flex w-full flex-col items-center gap-2 text-center">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#E8A200]">{adventure.title}</p>
                    <h1 className="text-balance font-display text-[24px] font-bold leading-tight tracking-tight text-[#123D30] sm:text-[28px]">{ch.prompt}</h1>
                    {tutorVoice==="device" && <button type="button" onClick={()=>speak(ch.prompt)} disabled={bolnaOwnsAudio} className="inline-flex items-center gap-1.5 rounded-full border border-[#205C43]/15 bg-[#205C43]/[0.06] px-3 py-1.5 text-xs font-semibold text-[#205C43] hover:bg-[#205C43]/10 active:bg-[#205C43]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Hear again — repeat the question"><Volume2 className="h-3.5 w-3.5" aria-hidden/> Hear again</button>}
                  </div>
                </div>
                <div className="relative mt-6 rounded-[1.75rem] border-2 border-[#C8E6C9] bg-gradient-to-b from-[#F1F8E9] to-[#DCEFD5] p-4 sm:p-6">
                  <CountableObjects
                    type={ch.objectType}
                    count={ch.objectCount}
                    highlighted={highlighted}
                    highlightedIndices={tappedIndices}
                    interactive
                    onTap={handleObjectTap}
                  />
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#205C43]/10 bg-white px-3 py-1 text-xs font-bold text-[#205C43] shadow-sm"><Sparkles className="h-3.5 w-3.5 text-[#E8A200]" aria-hidden/> Tap each one to count</span>
                    {tappedIndices.size>0 && <motion.span key={tappedIndices.size} initial={{scale:0.6,opacity:0}} animate={{scale:1,opacity:1}} className="rounded-full bg-[#205C43] px-3 py-1 text-xs font-extrabold text-white">You counted {tappedIndices.size}!</motion.span>}
                  </div>
                </div>
                <div aria-live="polite" aria-atomic="true" className="relative mt-4 min-h-[48px]">
                  <AnimatePresence mode="wait">
                    {feedback ? (
                      <motion.div key={`${idx}-${feedback.type}-${feedback.text.slice(0,24)}`} initial={{opacity:0,y:6,scale:0.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-6}} transition={{type:"spring",stiffness:420,damping:26}} className={["flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 text-sm font-bold leading-5", feedback.type==="correct"?"border-[#77B96A]/30 bg-[#E8F5E9] text-[#205C43]":feedback.type==="hint"?"border-[#FFD166]/40 bg-[#FFF8E9] text-[#7a5a00]":"border-[#8BD3F7]/30 bg-[#E3F2FD] text-[#1a4a6e]"].join(" ")}>
                        {feedback.type==="correct" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#205C43]" aria-hidden/> : <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 opacity-80" aria-hidden/>}
                        <span className="flex-1">{feedback.text}</span>
                      </motion.div>
                    ) : (
                      <p className="px-1 text-center text-sm font-semibold text-[#53645B]">Tap a number below to answer!</p>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {xpPop && wasCorrect && (
                      <motion.span key={xpPop.key} initial={{opacity:0,y:10,scale:0.6}} animate={{opacity:1,y:-34,scale:1.15}} exit={{opacity:0}} transition={{type:"spring",stiffness:260,damping:14}} className="pointer-events-none absolute -top-2 right-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#FFD166] to-[#FF9F43] px-3 py-1 font-display text-base font-bold text-[#123D30] shadow-lg" aria-hidden>
                        +{xpPop.amount} XP
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4" role="group" aria-label="Choose your answer">
                  {ch.options.map((n,i)=>{
                    const isSelected=selected===n;
                    const isCorrectOption=n===ch.expectedAnswer;
                    const showCorrect=wasCorrect&&isCorrectOption;
                    const showWrong=isSelected&&feedback?.type!=="correct"&&n!==ch.expectedAnswer;
                    return (
                      <motion.button key={n} type="button" aria-label={`Answer ${n}`} aria-pressed={isSelected} disabled={isBusy&&!!wasCorrect} onClick={()=>handleTapAnswer(n)} animate={showWrong?{x:[0,-8,8,-5,5,0]}:showCorrect?{scale:[1,1.12,1]}:{x:0,scale:1}} transition={{duration:0.45}} className={["relative flex min-h-16 items-center justify-center rounded-3xl border-2 font-display text-3xl font-bold leading-none transition-[transform,box-shadow,background-color] sm:min-h-20 sm:text-4xl","focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2 focus-visible:ring-offset-white","active:translate-y-1 active:shadow-none select-none", showCorrect?"border-[#205C43] bg-[#205C43] text-white shadow-[0_6px_0_#123D30]":showWrong?"border-[#FF8A72] bg-[#FFE4DE] text-[#8a3a2a] shadow-[0_6px_0_#E0533B]":isSelected?"border-[#FFD166] bg-[#FFF4D6] text-[#7a5a00] shadow-[0_6px_0_#E8A200]":`bg-white text-[#123D30] hover:-translate-y-0.5 ${ANSWER_TONES[i%ANSWER_TONES.length]}`, isBusy&&wasCorrect?"cursor-default opacity-100":"cursor-pointer"].join(" ")} style={{touchAction:"manipulation"}}>
                        <span>{n}</span>
                        {showCorrect && <CheckCircle2 className="absolute right-2 top-2 h-5 w-5 text-white/90" aria-hidden/>}
                      </motion.button>
                    );
                  })}
                </div>
                {hintLevel>=2 && !wasCorrect && !revealAnswer && attemptsForThis>=2 && (
                  <div className="mt-4 flex justify-center">
                    <button type="button" onClick={handleReveal} className="rounded-full px-2 py-1 text-sm font-bold text-[#205C43] underline decoration-[#FFD166] decoration-2 underline-offset-4 hover:text-[#123D30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD166] disabled:cursor-not-allowed disabled:opacity-50">See the answer — show me how to count</button>
                  </div>
                )}
                <div className="mt-6 flex justify-center">
                  <AnimatePresence>
                    {showNext && wasCorrect && (
                      <motion.div initial={{opacity:0,y:8,scale:0.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8}} transition={{type:"spring",stiffness:400,damping:24}} className="w-full sm:w-auto">
                        <Button size="xl" variant="primary" onClick={handleNext} className="w-full bg-gradient-to-r from-[#2E8B57] to-[#205C43] sm:w-auto sm:min-w-[240px]" aria-label={isLast?"Finish adventure":"Go to next challenge"}>{isLast?"Finish adventure":"Next challenge"}<Sparkles className="h-5 w-5" aria-hidden/></Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {!showNext && wasCorrect && <span className="text-xs font-semibold text-[#205C43]/60">Great job {"—"} get ready for the next one{"…"}</span>}
                </div>
                <div className="mt-6 flex flex-col items-center gap-3">
                  <div className="flex w-full items-center gap-3"><span className="h-px flex-1 bg-[#205C43]/10" aria-hidden/><span className="text-[11px] font-bold uppercase tracking-widest text-[#53645B]">talk with Miko</span><span className="h-px flex-1 bg-[#205C43]/10" aria-hidden/></div>
                  {voiceStatus?.provider==="bolna" && (
                    <>
                      <MikoVoiceOrb callState={bolnaSnapshot.state} ready={voiceStatus.bolnaReady} holdsAudio={bolnaOwnsAudio} subscribeAgentLevel={subscribeAgentLevel} onStart={handleBolnaStart} onStop={handleBolnaStop}/>
                      {bolnaMicProblem
                        ? <MicHelp problem={bolnaMicProblem} onRetry={bolnaMicProblem==="unsupported"?undefined:handleBolnaStart}/>
                        : bolnaSnapshot.error && <p className="max-w-xs text-center text-xs font-semibold text-[#B4442F]" role="alert">{bolnaSnapshot.error}</p>}
                    </>
                  )}
                  {voiceNotice && <p className="max-w-xs text-center text-xs font-semibold text-[#205C43]" role="status">{voiceNotice}</p>}
                  {voiceStatus?.provider==="browser" && <p className="max-w-xs text-center text-xs text-[#53645B]">Voice: this device&apos;s built-in voice.</p>}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        {tutorVoice==="device" && (
          <p className="mx-auto rounded-full bg-white/85 px-4 py-1.5 text-center text-[11px] font-semibold leading-4 text-[#205C43] backdrop-blur">
            Tip: tap <span className="inline-flex align-middle"><Volume2 className="h-3 w-3" aria-hidden/></span> Hear again to repeat the question.
          </p>
        )}
      </main>
      <VoiceConsentDialog
        open={consentDialogOpen}
        needsAccessCode={voiceStatus?.provider==="bolna"&&voiceStatus.accessCodeRequired&&!voiceStatus.unlocked}
        onCancel={()=>setConsentDialogOpen(false)}
        onAccepted={handleConsentAccepted}
      />
    </div>
  );
}
