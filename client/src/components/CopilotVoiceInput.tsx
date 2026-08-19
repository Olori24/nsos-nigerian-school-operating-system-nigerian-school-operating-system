import { supportsBrowserSpeechRecognition, speechTranscript, voiceInputErrorMessage } from "@/lib/copilotVoiceInput";
import { Loader2, Mic, MicOff } from "lucide-react";
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

export function CopilotVoiceInput({ value, onValueChange, disabled }: { value: string; onValueChange: (value: string) => void; disabled: boolean }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);

  useEffect(() => {
    setSupported(supportsBrowserSpeechRecognition(recognitionConstructor()));
    return () => recognitionRef.current?.abort();
  }, []);

  const toggleListening = () => {
    if (disabled) return;
    if (listening) { recognitionRef.current?.stop(); return; }
    const Constructor = recognitionConstructor();
    if (!Constructor) { toast.message("Voice input is not available in this browser. You can still type your request."); return; }
    const recognition = new Constructor();
    recognitionRef.current = recognition;
    recognition.lang = "en-NG";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = event => {
      const transcript = speechTranscript(Array.from(event.results).map(result => ({ isFinal: result.isFinal, transcript: result[0]?.transcript ?? "" })));
      if (transcript) onValueChange(transcript.slice(0, 600));
    };
    recognition.onerror = event => { if (event.error !== "aborted") toast.error(voiceInputErrorMessage(event.error)); };
    recognition.onend = () => { recognitionRef.current = null; setListening(false); };
    try { recognition.start(); setListening(true); } catch { toast.error("Voice input could not start. Please type your request instead."); setListening(false); }
  };

  const label = listening ? "Stop voice input" : "Use voice input";
  return <div className="relative flex items-center"><button type="button" onClick={toggleListening} disabled={disabled || !supported} className={`grid h-[38px] w-[38px] place-items-center rounded-md border transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${listening ? "border-[#3c8a61] bg-[#e9f7ec] text-[#196145]" : "border-border bg-background text-muted-foreground hover:border-[#8eb9a0] hover:text-[#176145]"}`} aria-label={label} aria-pressed={listening} title={supported ? `${label}. Review the transcript before sending.` : "Voice input is not available in this browser."}>{listening ? <Loader2 className="h-4 w-4 animate-spin" /> : supported ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}</button>{listening && <span className="sr-only" aria-live="polite">Listening. Your transcript appears in the Copilot input for review.</span>}</div>;
}
