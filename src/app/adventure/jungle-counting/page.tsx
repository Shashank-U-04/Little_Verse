"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, CheckCircle2, Lightbulb, Sparkles, Volume2 } from "lucide-react";
import Miko from "@/components/character/Miko";
import JungleScene from "@/components/explorer/JungleScene";
import CountableObjects from "@/components/adventure/CountableObjects";
import VoiceButton from "@/components/voice/VoiceButton";
import VoiceConsentDialog from "@/components/voice/VoiceConsentDialog";
import MicHelp from "@/components/voice/MicHelp";
import { browserMicEnvironment, micEnvironmentProblem, micProblemFromBolnaError, micProblemFromMediaError, micProblemFromRecognitionError, type MicProblemKind } from "@/components/voice/micProblem";
import { BolnaWebCall, type CallError } from "@bolna/web-call";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { jungleCountingAdventure } from "@/features/learning/activities";
import { getHint, parseVoiceAnswer, validateAnswer } from "@/features/learning/validation";
import { createNewSession, saveSession } from "@/lib/storage";
import { BolnaCallAdapter, type BolnaUiSnapshot } from "@/lib/bolna/bolnaCallAdapter";
import { MicrophoneOwnership } from "@/lib/voice/microphoneOwnership";
import { BrowserSpeechController, type SpeechUtterancePort } from "@/lib/voice/browserSpeechController";
import { requestBolnaSession, type LessonPointer } from "@/lib/voice/bolnaSession";
import { initialTutorVoiceMode, readVoiceConsent, saveVoiceConsent, type TutorVoiceMode } from "@/lib/voice/voiceConsent";
import type { VoiceStatusResponse } from "@/lib/voice/voiceStatus";
import type { Challenge, MikoState, Session, VoiceState } from "@/features/learning/types";
type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript?: string }>>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}
const CELEBRATIONS = ["You did it! Amazing counting! \u2B50","Brilliant \u2014 you got it right!","Wonderful! You counted perfectly!","Fantastic job! High five! \u2728"] as const;
/** Connection wording reflects SDK events only; nothing claims a live call before call-start. */
function bolnaStatusText(state: BolnaUiSnapshot["state"], ready: boolean, holdsMic: boolean): string {
  if (!ready) return "Miko's voice: not available";
  switch (state) {
    case "requesting_permission": return "Allow the microphone to talk to Miko";
    case "connecting": return "Connecting to Miko…";
    case "active": return "Live: Miko can hear you";
    case "ending": return "Hanging up…";
    case "error": return holdsMic ? "Hang-up not confirmed yet" : "Miko's voice: not connected";
    default: return "Miko's voice: not connected";
  }
}
function browserStorage(): Storage | null { try { return typeof window==="undefined" ? null : window.localStorage; } catch { return null; } }
function pickCelebration(): string { return CELEBRATIONS[Math.floor(Math.random()*CELEBRATIONS.length)]!; }
function computeHighlighted(challenge: Challenge, hintLevel: number, wasCorrect: boolean): number { if (wasCorrect) return challenge.objectCount; if (hintLevel >= 2) return challenge.objectCount; if (hintLevel >= 1) return Math.min(challenge.objectCount, hintLevel+1); return 0; }
export default function JungleCountingPage(){
  const router = useRouter();
  const challenges = jungleCountingAdventure.challenges;
  const [session,setSession]=useState<Session|null>(null);
  const [idx,setIdx]=useState(0);
  const [hintLevel,setHintLevel]=useState(0);
  const [feedback,setFeedback]=useState<{type:"correct"|"encourage"|"hint";text:string}|null>(null);
  const [selected,setSelected]=useState<number|null>(null);
  const [isBusy,setIsBusy]=useState(false);
  const [voiceState,setVoiceState]=useState<VoiceState>("idle");
  const [mikoState,setMikoState]=useState<MikoState>("idle");
  const [tappedIndices,setTappedIndices]=useState<Set<number>>(new Set());
  const [showNext,setShowNext]=useState(false);
  const [revealAnswer,setRevealAnswer]=useState(false);
  const [voiceError,setVoiceError]=useState<string|null>(null);
  const [bolnaSnapshot,setBolnaSnapshot]=useState<BolnaUiSnapshot>({state:"idle",error:null});
  const [microphoneOwner,setMicrophoneOwner]=useState<"browser-recognition"|"bolna-call"|null>(null);
  const advanceTimeoutRef=useRef<number|null>(null);
  const resetSelectedTimeoutRef=useRef<number|null>(null);
  const recognitionRef=useRef<SpeechRecognitionLike|null>(null);
  const mediaStreamRef=useRef<MediaStream|null>(null);
  const submitLockRef=useRef(false);
  const advanceLockRef=useRef(false);
  const sessionInitializedRef=useRef(false);
  const voiceParseTimeoutRef=useRef<number|null>(null);
  const voiceInputLockRef=useRef(false);
  // Bolna is the tutor's voice; device speech runs only when explicitly chosen.
  const [voiceStatus,setVoiceStatus]=useState<VoiceStatusResponse|null>(null);
  const [tutorVoice,setTutorVoiceState]=useState<TutorVoiceMode>("off");
  const tutorVoiceRef=useRef<TutorVoiceMode>("off");
  const tutorVoiceChosenRef=useRef(false);
  const [hasVoiceConsent,setHasVoiceConsent]=useState(false);
  const [consentDialogOpen,setConsentDialogOpen]=useState(false);
  const [voiceNotice,setVoiceNotice]=useState<string|null>(null);
  // Microphone problems, classified so a grown-up gets the right fix (see MicHelp).
  const [bolnaCallError,setBolnaCallError]=useState<CallError|null>(null);
  const [bolnaPreflightProblem,setBolnaPreflightProblem]=useState<MicProblemKind|null>(null);
  const [recognitionProblem,setRecognitionProblem]=useState<MicProblemKind|null>(null);
  const lessonRef=useRef<LessonPointer>({adventureId:jungleCountingAdventure.id, challengeIndex:0});
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
    onStart:()=>{
      setMikoState("speaking");
      setVoiceState((current)=>current==="unavailable"||current==="error"?current:"speaking");
    },
    onFinish:()=>{
      setMikoState((current)=>current==="speaking"?"idle":current);
      setVoiceState((current)=>current==="speaking"?"idle":current);
    },
  }));
  const microphoneOwnershipRef=useRef(new MicrophoneOwnership());
  const recognitionGenerationRef=useRef(0);
  const ch: Challenge|undefined = challenges[idx];
  const claimMicrophone=useCallback((owner:"browser-recognition"|"bolna-call")=>{
    const claimed=microphoneOwnershipRef.current.claim(owner);
    if(claimed) setMicrophoneOwner(owner);
    return claimed;
  },[]);
  const releaseMicrophone=useCallback((owner:"browser-recognition"|"bolna-call")=>{
    microphoneOwnershipRef.current.release(owner);
    setMicrophoneOwner(microphoneOwnershipRef.current.current);
  },[]);
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
    setVoiceState((current)=>current==="speaking"?"idle":current);
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
    // Never override a voice the grown-up or child picked explicitly.
    if(!tutorVoiceChosenRef.current) setTutorVoice(initialTutorVoiceMode(status.provider));
    return status;
  },[setTutorVoice]);
  useEffect(()=>{
    // Hydrate consent from browser storage and the configured voice from the server after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasVoiceConsent(readVoiceConsent(browserStorage())!==null);
    void refreshVoiceStatus();
  },[refreshVoiceStatus]);
  useEffect(()=>{
    lessonRef.current={adventureId:jungleCountingAdventure.id, challengeIndex:idx};
  },[idx]);
  useEffect(()=>bolnaAdapter.subscribe((snapshot)=>{
    setBolnaSnapshot(snapshot);
    if(bolnaAdapter.ownsAudio()){
      stopSpeaking();
      return;
    }
    if(snapshot.state==="ended"||snapshot.state==="error"){
      stopSpeaking();
      releaseMicrophone("bolna-call");
    }
    // A failed start may mean the voice pass expired; re-read the server's view.
    if(snapshot.state==="error") void refreshVoiceStatus();
  }),[bolnaAdapter,refreshVoiceStatus,releaseMicrophone,stopSpeaking]);
  useEffect(()=>{
    if(!sessionInitializedRef.current){
      sessionInitializedRef.current=true;
      const s=createNewSession(challenges);
      // Hydrate the client-only session after mount; localStorage is the external source.
      setSession(s);
      saveSession(s);
    }
    const hasRec=typeof window!=="undefined" && Boolean(window.SpeechRecognition||window.webkitSpeechRecognition);
    // Feature detection is only available after client hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVoiceState(hasRec?"idle":"unavailable");
    return()=>{
      if(advanceTimeoutRef.current) window.clearTimeout(advanceTimeoutRef.current);
      if(resetSelectedTimeoutRef.current) window.clearTimeout(resetSelectedTimeoutRef.current);
      if(voiceParseTimeoutRef.current) window.clearTimeout(voiceParseTimeoutRef.current);
      submitLockRef.current=false;
      advanceLockRef.current=false;
      voiceInputLockRef.current=false;
      stopSpeaking();
      if(recognitionRef.current){ try{recognitionRef.current.abort();}catch{}}
      if(mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t=>t.stop());
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
    if(via==="tap" && voiceInputLockRef.current) return;
    if(submitLockRef.current || (isBusy && feedback?.type==="correct") || (feedback?.type==="correct" && showNext) || isBusy) return;
    submitLockRef.current=true;
    const isCorrect=validateAnswer(ch,n);
    const attemptNumber=session.attempts.filter(a=>a.challengeId===ch.id).length+1;
    const attempt={ id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`, challengeId: ch.id, answer:n, isCorrect, hintLevel, attemptNumber, answerType:via, createdAt:new Date().toISOString()} as Session["attempts"][number];
    const nextSession:Session={...session, attempts:[...session.attempts, attempt]};
    setSession(nextSession); saveSession(nextSession);
    if(isCorrect){
      stopSpeaking(); setSelected(n); setFeedback({type:"correct", text:pickCelebration()}); setMikoState("celebrating"); setIsBusy(true); setRevealAnswer(false);
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
      router.push(`/adventure/jungle-counting/complete?id=${encodeURIComponent(session.id)}`);
      return;
    }
    setIdx(v=>v+1); setHintLevel(0); setFeedback(null); setSelected(null); setIsBusy(false); setShowNext(false); setTappedIndices(new Set()); setRevealAnswer(false); setMikoState("idle");
    submitLockRef.current=false;
    advanceLockRef.current=false;
    if(advanceTimeoutRef.current) window.clearTimeout(advanceTimeoutRef.current);
    if(resetSelectedTimeoutRef.current) window.clearTimeout(resetSelectedTimeoutRef.current);
  },[ch,session,feedback,isLast,router,stopSpeaking]);
  const handleReveal=useCallback(()=>{
    if(!ch) return;
    setRevealAnswer(true); setHintLevel(ch.hintSequence.length-1);
    const objectLabel=ch.objectType==="butterfly"?"butterflies":`${ch.objectType}s`;
    const txt=`There are ${ch.objectCount} ${objectLabel}. Let's count \u2014 ${Array.from({length:ch.objectCount},(_,i)=>String(i+1)).join(", ")}! Now you try.`;
    setFeedback({type:"hint", text:txt}); setMikoState("encouraging"); speak(txt);
  },[ch,speak]);
  const handleObjectTap=useCallback((i:number)=>{
    setTappedIndices(prev=>{ const n=new Set(prev); if(n.has(i)) n.delete(i); else n.add(i); return n; });
  },[]);
  const startRecognition=useCallback(async()=>{
    if(!ch || bolnaAdapter.ownsAudio()) return;
    if(!claimMicrophone("browser-recognition")) return;
    const SR: SpeechRecognitionConstructor | undefined = typeof window!=="undefined" ? (window.SpeechRecognition||window.webkitSpeechRecognition) : undefined;
    if(!SR){ releaseMicrophone("browser-recognition"); setVoiceState("unavailable"); setVoiceError("Voice isn't available on this device \u2014 tap a number instead."); return; }
    const generation=++recognitionGenerationRef.current;
    stopSpeaking();
    setVoiceState("requesting_permission"); setVoiceError(null); setRecognitionProblem(null); setMikoState("listening");
    voiceInputLockRef.current=true;
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      if(generation!==recognitionGenerationRef.current){ stream.getTracks().forEach(t=>t.stop()); releaseMicrophone("browser-recognition"); return; }
      mediaStreamRef.current=stream; stream.getTracks().forEach(t=>t.stop()); mediaStreamRef.current=null;
    }catch(error){
      releaseMicrophone("browser-recognition");
      if(generation!==recognitionGenerationRef.current) return;
      voiceInputLockRef.current=false;
      setRecognitionProblem(micProblemFromMediaError(error));
      setVoiceState("error"); setVoiceError("Microphone blocked \u2014 tap a number instead."); setMikoState("encouraging"); return;
    }
    if(generation!==recognitionGenerationRef.current){ releaseMicrophone("browser-recognition"); return; }
    let rec: SpeechRecognitionLike;
    try{
      // construct via window SR
      rec=new SR();
    }catch{
      releaseMicrophone("browser-recognition");
      voiceInputLockRef.current=false;
      setVoiceState("error"); setVoiceError("Microphone blocked \u2014 tap a number instead."); return;
    }
    recognitionRef.current=rec; rec.lang="en-US"; rec.interimResults=false; rec.maxAlternatives=1; rec.continuous=false;
    setVoiceState("listening");
    rec.onresult=(e)=>{
      if(generation!==recognitionGenerationRef.current) return;
      const transcript: string = e.results[0]?.[0]?.transcript ?? "";
      setVoiceState("processing"); setMikoState("thinking");
      voiceParseTimeoutRef.current=window.setTimeout(()=>{
        if(generation!==recognitionGenerationRef.current) return;
        voiceInputLockRef.current=false;
        const parsed=parseVoiceAnswer(transcript);
        if(parsed===null){
          setFeedback({type:"encourage", text:"I didn't catch that \u2014 try tapping a number!"}); setMikoState("encouraging"); setVoiceState("idle"); speak("I didn't catch that \u2014 try tapping a number!"); return;
        }
        setVoiceState("idle"); submitAnswer(parsed,"voice");
      },350);
    };
    rec.onerror=(ev)=>{
      if(generation!==recognitionGenerationRef.current) return;
      const err=(ev as {error?:string})?.error ?? "unknown";
      voiceInputLockRef.current=false;
      setRecognitionProblem(micProblemFromRecognitionError(err));
      if(err==="not-allowed"||err==="permission-denied"){ setVoiceState("error"); setVoiceError("Microphone blocked \u2014 tap a number instead."); }
      else if(err==="no-speech"){ setVoiceState("idle"); setFeedback({type:"encourage", text:"I didn't hear anything \u2014 try again or tap a number!"}); setMikoState("encouraging"); }
      else { setVoiceState("error"); setVoiceError("Something went wrong \u2014 tap a number instead."); }
      setMikoState(s=> (s==="listening"||s==="thinking"?"idle":s));
    };
    rec.onend=()=>{
      releaseMicrophone("browser-recognition");
      if(generation!==recognitionGenerationRef.current) return;
      setVoiceState(prev=>prev==="listening"?"idle":prev);
      setMikoState(s=>s==="listening"?"idle":s);
      recognitionRef.current=null;
    };
    try{ rec.start(); }catch{ releaseMicrophone("browser-recognition"); voiceInputLockRef.current=false; setVoiceState("error"); setVoiceError("Microphone blocked \u2014 tap a number instead."); recognitionRef.current=null; }
  },[bolnaAdapter,ch,speak,stopSpeaking,submitAnswer,claimMicrophone,releaseMicrophone]);
  const needsGrownUp=!hasVoiceConsent||(voiceStatus?.provider==="bolna"&&voiceStatus.accessCodeRequired&&!voiceStatus.unlocked);
  const handleConsentAccepted=useCallback(()=>{
    saveVoiceConsent(browserStorage(), new Date());
    setHasVoiceConsent(true);
    setConsentDialogOpen(false);
    setVoiceNotice("Voice is on. Tap the voice button again to start.");
    void refreshVoiceStatus();
  },[refreshVoiceStatus]);
  const chooseDeviceVoice=useCallback(()=>{
    if(bolnaAdapter.ownsAudio()) return;
    tutorVoiceChosenRef.current=true;
    setTutorVoice("device");
    if(ch) speak(ch.prompt);
  },[bolnaAdapter,ch,setTutorVoice,speak]);
  const chooseBolnaVoice=useCallback(()=>{
    tutorVoiceChosenRef.current=true;
    stopSpeaking();
    setTutorVoice("bolna");
  },[setTutorVoice,stopSpeaking]);
  const handleBolnaStart=useCallback(()=>{
    setBolnaCallError(null);
    // A browser that cannot capture audio at all gets clear help instead of a session it cannot use.
    const environmentProblem=micEnvironmentProblem(browserMicEnvironment());
    setBolnaPreflightProblem(environmentProblem);
    if(environmentProblem) return;
    if(needsGrownUp){ setVoiceNotice(null); setConsentDialogOpen(true); return; }
    if(microphoneOwner!==null || recognitionRef.current || voiceState==="requesting_permission"){
      setVoiceError("Finish voice answer capture before starting a conversation.");
      return;
    }
    if(!claimMicrophone("bolna-call")) return;
    stopSpeaking();
    // Starting Miko's call makes Bolna the tutor voice again.
    tutorVoiceChosenRef.current=true;
    setTutorVoice("bolna");
    setVoiceNotice(null);
    setVoiceError(null);
    // Call start synchronously from this click so the browser preserves its
    // user-gesture permission for microphone and audio playback.
    void bolnaAdapter.start().catch(()=>{
      releaseMicrophone("bolna-call");
      setBolnaSnapshot(bolnaAdapter.getSnapshot());
    });
  },[bolnaAdapter,claimMicrophone,microphoneOwner,needsGrownUp,releaseMicrophone,setTutorVoice,stopSpeaking,voiceState]);
  const handleBolnaStop=useCallback(()=>{
    void bolnaAdapter.stop().catch(()=>setBolnaSnapshot(bolnaAdapter.getSnapshot()));
  },[bolnaAdapter]);
  const handleTapAnswer=useCallback((n:number)=>{
    const cancelRecognition=()=>{
      recognitionGenerationRef.current++;
      voiceInputLockRef.current=false;
      if(voiceParseTimeoutRef.current){ window.clearTimeout(voiceParseTimeoutRef.current); voiceParseTimeoutRef.current=null; }
      if(recognitionRef.current){ try{recognitionRef.current.abort();}catch{} }
      setVoiceState((current)=>current==="unavailable"?current:"idle");
      setMikoState((current)=>current==="listening"||current==="thinking"?"idle":current);
    };
    cancelRecognition();
    // Tapping never uses the microphone, so a live Miko call keeps going.
    submitAnswer(n,"tap");
  },[submitAnswer]);
  const handleVoicePress=useCallback(()=>{
    if(bolnaAdapter.ownsAudio()) return;
    if(voiceState==="idle"&&!hasVoiceConsent){ setVoiceNotice(null); setConsentDialogOpen(true); return; }
    if(voiceState==="idle"){ void startRecognition(); return; }
    if(voiceState==="listening"){ try{recognitionRef.current?.stop();}catch{} voiceInputLockRef.current=false; setVoiceState("idle"); setMikoState("idle"); return; }
    if(voiceState==="error"){ setVoiceState("idle"); setVoiceError(null); setRecognitionProblem(null); setMikoState("idle"); return; }
    if(voiceState==="requesting_permission"||voiceState==="processing"||voiceState==="speaking") return;
  },[bolnaAdapter,hasVoiceConsent,voiceState,startRecognition]);
  const retryRecognition=useCallback(()=>{
    setVoiceError(null); setRecognitionProblem(null);
    void startRecognition();
  },[startRecognition]);
  if(!session||!ch){
    return (
      <div className="min-h-dvh jungle-soft-gradient flex flex-col">
        <header className="sticky top-0 z-20 border-b border-[#205C43]/10 bg-white/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#205C43]"><ArrowLeft className="h-4 w-4"/> Back</Link>
            <span className="text-xs font-semibold tracking-wide text-[#205C43]/70">Jungle Counting</span>
          </div>
        </header>
        <main className="relative flex flex-1 items-center justify-center px-4 py-8">
          <div className="absolute inset-0 -z-0 overflow-hidden opacity-90"><JungleScene variant="hero"/></div>
          <Card className="relative w-full max-w-xl animate-pulse"><CardContent className="flex flex-col items-center gap-4 p-8"><Miko state="idle" size="md"/><div className="h-4 w-32 rounded-full bg-[#205C43]/10"/><div className="h-3 w-48 rounded-full bg-[#205C43]/10"/></CardContent></Card>
        </main>
      </div>
    );
  }
  const attemptsForThis=session.attempts.filter(a=>a.challengeId===ch.id).length;
  const bolnaOwnsAudio=bolnaAdapter.ownsAudio();
  // Session refusals (locked, rate limited, not set up) keep the adapter's specific message instead.
  const bolnaMicProblem=bolnaPreflightProblem ?? (bolnaSnapshot.state==="error"?micProblemFromBolnaError(bolnaCallError):null);
  return (
    <div className="min-h-dvh jungle-soft-gradient flex flex-col">
      <header className="sticky top-0 z-20 border-b border-[#205C43]/10 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex h-[56px] max-w-2xl items-center justify-between gap-3 px-4">
          <Link href="/" aria-label="Back to home" className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-[#205C43] hover:bg-[#205C43]/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2"><ArrowLeft className="h-4 w-4" aria-hidden/> Back</Link>
          <div className="flex items-center gap-2" aria-label={`Challenge ${idx+1} of ${challenges.length}`}>
            <span className="hidden text-xs font-bold tracking-wide text-[#205C43] sm:inline">Challenge {idx+1} of {challenges.length}</span>
            <span className="text-xs font-bold tracking-wide text-[#205C43] sm:hidden">{idx+1}/{challenges.length}</span>
            <div className="flex items-center gap-1.5" role="progressbar" aria-label="Challenge progress" aria-valuenow={idx+1} aria-valuemin={1} aria-valuemax={challenges.length}>
              {challenges.map((_,i)=>{
                const done=i<idx||(i===idx&&wasCorrect);
                const current=i===idx&&!wasCorrect;
                return <span key={i} aria-hidden className={["h-2.5 rounded-full transition-all duration-300", done?"w-7 bg-[#77B96A]":current?"w-7 bg-[#205C43] shadow-[0_0_0_3px_rgba(32,92,67,0.14)]":"w-2.5 bg-[#205C43]/20"].join(" ")}/>;
              })}
            </div>
          </div>
          <Badge variant="leaf" className="hidden sm:inline-flex">5 min</Badge>
        </div>
      </header>
      <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6 pb-10">
        <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden"><JungleScene variant="hero"/></div>
        <AnimatePresence mode="wait">
          <motion.div key={idx} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:0.32,ease:"easeOut"}} className="relative">
            <Card className="card-shadow border border-white/70">
              <CardContent className="p-5 sm:p-7">
                <div className="flex flex-col items-center">
                  <Miko state={mikoState} size="md" message={feedback?.text ?? (mikoState==="listening"?"I'm listening \u2014 say a number!":mikoState==="thinking"?"Hmm, let me think\u2026":undefined)} />
                  <div className="mt-3 flex w-full flex-col items-center gap-2 text-center">
                    <h1 className="text-balance text-[22px] font-extrabold leading-tight tracking-tight text-[#24352B] sm:text-[24px]">{ch.prompt}</h1>
                    {tutorVoice==="device" && <button type="button" onClick={()=>speak(ch.prompt)} disabled={bolnaOwnsAudio} className="inline-flex items-center gap-1.5 rounded-full border border-[#205C43]/15 bg-[#205C43]/[0.06] px-3 py-1.5 text-xs font-semibold text-[#205C43] hover:bg-[#205C43]/10 active:bg-[#205C43]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Hear again — repeat the question"><Volume2 className="h-3.5 w-3.5" aria-hidden/> Hear again</button>}
                  </div>
                </div>
                <div className="mt-6 rounded-3xl border border-[#FFF4D6] bg-[#FFF8E9]/60 p-4 sm:p-5">
                  <CountableObjects
                    type={ch.objectType}
                    count={ch.objectCount}
                    highlighted={highlighted}
                    highlightedIndices={tappedIndices}
                    interactive
                    onTap={handleObjectTap}
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#205C43]/80 shadow-sm border border-[#205C43]/10"><Sparkles className="h-3.5 w-3.5 text-[#FFD166]" aria-hidden/> Tap each one to count</span>
                    {tappedIndices.size>0 && <span className="text-xs font-medium text-[#205C43]/60">You tapped {tappedIndices.size} {"\u2014"} keep going!</span>}
                  </div>
                </div>
                <div aria-live="polite" aria-atomic="true" className="mt-4 min-h-[44px]">
                  <AnimatePresence mode="wait">
                    {feedback ? (
                      <motion.div key={`${idx}-${feedback.type}-${feedback.text.slice(0,24)}`} initial={{opacity:0,y:6,scale:0.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-6}} transition={{type:"spring",stiffness:420,damping:26}} className={["flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 text-sm font-semibold leading-5", feedback.type==="correct"?"border-[#77B96A]/30 bg-[#E8F5E9] text-[#205C43]":feedback.type==="hint"?"border-[#FFD166]/40 bg-[#FFF8E9] text-[#7a5a00]":"border-[#8BD3F7]/30 bg-[#E3F2FD] text-[#1a4a6e]"].join(" ")}>
                        {feedback.type==="correct" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#205C43]" aria-hidden/> : <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 opacity-80" aria-hidden/>}
                        <span>{feedback.text}</span>
                      </motion.div>
                    ) : (
                      <p className="px-1 text-center text-xs font-medium text-[#53645B]">Tap a number below {"\u2014"} or use your voice!</p>
                    )}
                  </AnimatePresence>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label="Choose your answer">
                  {ch.options.map((n)=>{
                    const isSelected=selected===n;
                    const isCorrectOption=n===ch.expectedAnswer;
                    const showCorrect=wasCorrect&&isCorrectOption;
                    const showWrong=isSelected&&feedback?.type!=="correct"&&n!==ch.expectedAnswer;
                    return (
                      <button key={n} type="button" aria-label={`Answer ${n}`} aria-pressed={isSelected} disabled={isBusy&&!!wasCorrect} onClick={()=>handleTapAnswer(n)} className={["relative flex min-h-14 items-center justify-center rounded-2xl border-2 text-xl font-extrabold leading-none transition-all","focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] focus-visible:ring-offset-2 focus-visible:ring-offset-white","active:scale-[0.98] select-none", showCorrect?"border-[#205C43] bg-[#205C43] text-white shadow-[0_6px_16px_rgba(32,92,67,0.30)]":showWrong?"border-[#FF8A72]/40 bg-[#FFE4DE] text-[#8a3a2a]":isSelected?"border-[#FFD166] bg-[#FFF4D6] text-[#7a5a00]":"border-[#205C43]/15 bg-white text-[#205C43] hover:border-[#205C43]/25 hover:bg-[#FFF8E9] shadow-sm", isBusy&&wasCorrect?"cursor-default opacity-100":"cursor-pointer"].join(" ")} style={{touchAction:"manipulation"}}>
                        <span>{n}</span>
                        {showCorrect && <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-white/90" aria-hidden/>}
                      </button>
                    );
                  })}
                </div>
                {hintLevel>=2 && !wasCorrect && !revealAnswer && attemptsForThis>=2 && (
                  <div className="mt-3 flex justify-center">
                    <button type="button" onClick={handleReveal} className="text-xs font-semibold text-[#205C43] underline decoration-[#FFD166] decoration-2 underline-offset-4 hover:text-[#123D30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD166] rounded-full px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50">See the answer — show me how to count</button>
                  </div>
                )}
                <div className="mt-6 flex flex-col items-center gap-3">
                  <div className="flex w-full items-center gap-3"><span className="h-px flex-1 bg-[#205C43]/10" aria-hidden/><span className="text-[11px] font-bold uppercase tracking-widest text-[#53645B]">or speak</span><span className="h-px flex-1 bg-[#205C43]/10" aria-hidden/></div>
                  {voiceStatus?.provider==="bolna" && (
                    <div className="flex flex-col items-center gap-2">
                      <p className="inline-flex items-center gap-2 rounded-full border border-[#205C43]/15 bg-white px-3 py-1 text-xs font-semibold text-[#24352B]" aria-live="polite" data-testid="tutor-voice-status">
                        <span aria-hidden className={["h-2 w-2 rounded-full", bolnaSnapshot.state==="active"?"bg-[#2E8B57]":bolnaSnapshot.state==="connecting"||bolnaSnapshot.state==="requesting_permission"?"bg-[#E0A100]":"bg-[#9AA59F]"].join(" ")}/>
                        {bolnaStatusText(bolnaSnapshot.state, voiceStatus.bolnaReady, microphoneOwner==="bolna-call")}
                      </p>
                      {voiceStatus.bolnaReady && (bolnaSnapshot.state==="idle"||bolnaSnapshot.state==="ended"||(bolnaSnapshot.state==="error"&&microphoneOwner!=="bolna-call") ? (
                        <Button type="button" variant="secondary" onClick={handleBolnaStart} disabled={microphoneOwner!==null||voiceState==="requesting_permission"||voiceState==="processing"} >Talk to Miko</Button>
                      ) : bolnaSnapshot.state==="ending" ? (
                        <Button type="button" variant="secondary" disabled>Hanging up{"…"}</Button>
                      ) : (
                        <Button type="button" variant="coral" onClick={handleBolnaStop}>{bolnaSnapshot.state==="error"?"Retry hanging up":bolnaSnapshot.state==="requesting_permission"||bolnaSnapshot.state==="connecting"?"Cancel":"End talk with Miko"}</Button>
                      ))}
                      {bolnaSnapshot.state==="active" && <p className="max-w-xs text-center text-xs text-[#53645B]">Talk with Miko, and tap a number on the screen to answer.</p>}
                      {!voiceStatus.bolnaReady && <p className="max-w-xs text-center text-xs text-[#53645B]">Miko&apos;s voice isn&apos;t available here right now. Tapping the numbers works great!</p>}
                      {bolnaMicProblem
                        ? <MicHelp problem={bolnaMicProblem} onRetry={bolnaMicProblem==="unsupported"?undefined:handleBolnaStart}/>
                        : bolnaSnapshot.error && <p className="max-w-xs text-center text-xs font-semibold text-[#B4442F]" role="alert">{bolnaSnapshot.error}</p>}
                    </div>
                  )}
                  {voiceNotice && <p className="max-w-xs text-center text-xs font-semibold text-[#205C43]" role="status">{voiceNotice}</p>}
                  <VoiceButton state={voiceState} onPress={handleVoicePress} disabled={voiceState==="processing"||voiceState==="requesting_permission"||voiceState==="speaking"||bolnaOwnsAudio}/>
                  {voiceState==="error" && (recognitionProblem
                    ? <MicHelp problem={recognitionProblem} onRetry={recognitionProblem==="unsupported"?undefined:retryRecognition}/>
                    : voiceError && <p className="max-w-[28ch] text-center text-xs font-semibold leading-4 text-[#FF8A72]" role="alert">{voiceError}</p>)}
                  {voiceState==="unavailable" && <p className="max-w-[28ch] text-center text-xs font-medium leading-4 text-zinc-500">Voice isn&apos;t available on this device {"—"} tapping a number works great!</p>}
                  {voiceStatus!==null && voiceStatus.provider!=="browser" && (tutorVoice==="device" ? (
                    <p className="max-w-xs text-center text-xs text-[#53645B]">
                      Device voice is on (this device&apos;s built-in voice, not Miko&apos;s).{" "}
                      <button type="button" onClick={chooseBolnaVoice} className="rounded font-semibold text-[#205C43] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43]">Turn device voice off</button>
                    </p>
                  ) : (
                    <button type="button" onClick={chooseDeviceVoice} disabled={bolnaOwnsAudio} className="rounded-full px-2 py-1 text-xs font-semibold text-[#205C43] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#205C43] disabled:cursor-not-allowed disabled:opacity-50">Use device voice instead</button>
                  ))}
                  {voiceStatus?.provider==="browser" && <p className="max-w-xs text-center text-xs text-[#53645B]">Voice: this device&apos;s built-in voice.</p>}
                </div>
                <div className="mt-6 flex justify-center">
                  <AnimatePresence>
                    {showNext && wasCorrect && (
                      <motion.div initial={{opacity:0,y:8,scale:0.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8}} transition={{type:"spring",stiffness:400,damping:24}} className="w-full sm:w-auto">
                        <Button size="xl" variant="primary" onClick={handleNext} className="w-full sm:w-auto sm:min-w-[220px]" aria-label={isLast?"Finish adventure":"Go to next challenge"}>{isLast?"Finish adventure":"Next challenge"}<Sparkles className="h-5 w-5" aria-hidden/></Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {!showNext && wasCorrect && <span className="text-xs font-medium text-[#205C43]/50">Great job {"\u2014"} get ready for the next one{"\u2026"}</span>}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
        {tutorVoice==="device"
          ? <p className="text-center text-[11px] font-medium leading-4 text-[#205C43]/70">Tip: tap <span className="inline-flex align-middle"><Volume2 className="h-3 w-3" aria-hidden/></span> Hear again to repeat the question.</p>
          : <p className="text-center text-[11px] font-medium leading-4 text-[#205C43]/70">Tip: tap {"\u201c"}Talk to Miko{"\u201d"} to chat while you count.</p>}
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

