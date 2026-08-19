import { canAutoSubmitVoiceTranscript, supportsBrowserSpeechRecognition, speechTranscript, VOICE_AUTO_SUBMIT_DELAY_MS, voiceInputErrorMessage } from "@/lib/copilotVoiceInput";
import { Loader2, Mic, MicOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type RecognitionEvent = { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> };
type Recognition = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; abort: () => void; onresult: ((event: RecognitionEvent) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null };
type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const browser = window as typeof window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

export function CopilotVoiceInput({ value, onValueChange, onAutoSubmit, disabled }: { value: string; onValueChange: (value: string) => void; onAutoSubmit: (value: string) => void; disabled: boolean }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const transcriptRef = useRef("");
  const valueRef = useRef(value);
  const shouldAutoSubmitRef = useRef(true);
  const autoSubmitTimerRef = useRef<number | null>(null);

  const cancelAutoSubmit = () => {
    if (autoSubmitTimerRef.current !== null) window.clearTimeout(autoSubmitTimerRef.current);
    autoSubmitTimerRef.current = null;
    setAutoSubmitting(false);
  };

  useEffect(() => {
    setSupported(supportsBrowserSpeechRecognition(recognitionConstructor()));
    return () => { recognitionRef.current?.abort(); cancelAutoSubmit(); };
  }, []);

  useEffect(() => { valueRef.current = value; }, [value]);

  const scheduleAutoSubmit = () => {
    const transcript = transcriptRef.current.trim();
    if (!canAutoSubmitVoiceTranscript(transcript)) return;
    cancelAutoSubmit();
    setAutoSubmitting(true);
    autoSubmitTimerRef.current = window.setTimeout(() => {
      autoSubmitTimerRef.current = null;
      setAutoSubmitting(false);
      if (shouldAutoSubmitRef.current && valueRef.current.trim() === transcript) onAutoSubmit(transcript);
    }, VOICE_AUTO_SUBMIT_DELAY_MS);
  };

  const toggleListening = () => {
    if (disabled) return;
    cancelAutoSubmit();
    if (listening) { recognitionRef.current?.stop(); return; }
    const Constructor = recognitionConstructor();
    if (!Constructor) { toast.message("Voice input is not available in this browser. You can still type your request."); return; }
    const recognition = new Constructor();
    transcriptRef.current = "";
    shouldAutoSubmitRef.current = true;
    recognitionRef.current = recognition;
    recognition.lang = "en-NG";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = event => {
      const transcript = speechTranscript(Array.from(event.results).map(result => ({ isFinal: result.isFinal, transcript: result[0]?.transcript ?? "" }))).slice(0, 600);
      transcriptRef.current = transcript;
      if (transcript) onValueChange(transcript);
    };
    recognition.onerror = event => { shouldAutoSubmitRef.current = false; if (event.error !== "aborted") toast.error(voiceInputErrorMessage(event.error)); };
    recognition.onend = () => { recognitionRef.current = null; setListening(false); if (shouldAutoSubmitRef.current) scheduleAutoSubmit(); };
    try { recognition.start(); setListening(true); } catch { toast.error("Voice input could not start. Please type your request instead."); setListening(false); }
  };

  const label = listening ? "Stop voice input" : "Use voice input";
  return <div className="relative flex items-center gap-1"><button type="button" onClick={toggleListening} disabled={disabled || !supported || autoSubmitting} className={`grid h-[38px] w-[38px] place-items-center rounded-md border transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${listening ? "border-[#3c8a61] bg-[#e9f7ec] text-[#196145]" : "border-border bg-background text-muted-foreground hover:border-[#8eb9a0] hover:text-[#176145]"}`} aria-label={label} aria-pressed={listening} title={supported ? `${label}. Speech is sent automatically after it ends; cancel remains available briefly.` : "Voice input is not available in this browser."}>{listening ? <Loader2 className="h-4 w-4 animate-spin" /> : supported ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}</button>{autoSubmitting && <button type="button" onClick={cancelAutoSubmit} className="inline-flex h-[38px] items-center gap-1 rounded-md border border-[#d8b5a7] bg-[#fff8f4] px-2 text-[10px] font-semibold text-[#924c3b] transition hover:bg-[#fcedE6] active:scale-[0.97]" aria-label="Cancel automatic voice search" title="Cancel automatic voice search"><X className="h-3.5 w-3.5" />Cancel</button>}{listening && <span className="sr-only" aria-live="polite">Listening. Your transcript appears in the Copilot input. Search starts shortly after you stop speaking.</span>}{autoSubmitting && <span className="sr-only" aria-live="polite">Voice transcription complete. Sending your Copilot search shortly. Use Cancel to keep editing.</span>}</div>;
}
