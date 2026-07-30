"use client";

import { useEffect, useRef, useState } from "react";

type AudioStoryRecorderProps = {
  onBack: () => void;
  onContinue: (transcript: string) => void;
};

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

function formatSeconds(total: number) {
  const minutes = Math.floor(total / 60).toString().padStart(2, "0");
  const seconds = (total % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function AudioStoryRecorder({ onBack, onContinue }: AudioStoryRecorderProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const [audio, setAudio] = useState<Blob>();
  const [audioUrl, setAudioUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    stopTracks();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  async function startRecording() {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("A gravação de áudio não é compatível com este navegador.");
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudio(undefined);
      setAudioUrl("");
      setSeconds(0);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const preferredType = ["audio/webm;codecs=opus", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stopTracks();
        if (!blob.size) {
          setError("Não conseguimos salvar o áudio. Tente gravar novamente.");
          return;
        }
        if (blob.size > MAX_AUDIO_BYTES) {
          setError("O áudio ficou maior que 25 MB. Grave uma versão mais curta.");
          return;
        }
        setAudio(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };
      recorder.start();
      setRecording(true);
      timerRef.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    } catch (cause) {
      stopTracks();
      setError(cause instanceof Error ? cause.message : "Não foi possível acessar o microfone.");
    }
  }

  function stopRecording() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  }

  async function transcribe() {
    if (!audio) return;
    setSending(true);
    setError("");
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!baseUrl || !publishableKey) throw new Error("A transcrição ainda não foi configurada.");
      const body = new FormData();
      body.append("audio", audio, "historia.webm");
      const response = await fetch(`${baseUrl}/functions/v1/transcribe-story-audio`, {
        method: "POST",
        headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}` },
        body,
      });
      const data = await response.json() as { transcript?: string; error?: string };
      if (!response.ok || !data.transcript?.trim()) throw new Error(data.error || "Não foi possível transcrever seu áudio.");
      onContinue(data.transcript.trim());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível transcrever seu áudio.");
    } finally {
      setSending(false);
    }
  }

  return <main className="flow audio-story" aria-live="polite">
    <button className="brand-back" onClick={onBack}>← Voltar para a história</button>
    <p className="kicker">CONTE POR ÁUDIO</p>
    <h1>Fale do seu jeito. Nós cuidamos de transformar em música.</h1>
    <p className="audio-story-lead">Aperte para gravar e conte os momentos, apelidos e sentimentos que não podem faltar nessa surpresa.</p>
    <section className="audio-story-card">
      <div className="audio-story-tips">
        <strong>Você pode contar:</strong>
        <span>• Como essa história começou</span>
        <span>• Uma lembrança que emociona vocês</span>
        <span>• Apelidos, frases ou detalhes especiais</span>
      </div>
      <div className={`recorder-orb ${recording ? "is-recording" : ""}`}>
        <span aria-hidden="true">{recording ? "●" : "🎙"}</span>
      </div>
      <p className="recording-state">{recording ? "Gravando sua história" : audio ? "Seu áudio está pronto" : "Toque para começar a gravar"}</p>
      <b className="recording-timer">{formatSeconds(seconds)}</b>
      {audioUrl && <audio className="story-audio-player" controls src={audioUrl}>Seu navegador não suporta áudio.</audio>}
      {!recording ? <button className="audio-record-button" type="button" onClick={() => void startRecording()} disabled={sending}>🎙 {audio ? "Gravar novamente" : "Gravar minha história"}</button> : <button className="audio-record-button stop" type="button" onClick={stopRecording}>■ Parar gravação</button>}
    </section>
    <button className="primary audio-continue" type="button" disabled={!audio || recording || sending} onClick={() => void transcribe()}>{sending ? "Entendendo sua história…" : "Seguir"}</button>
    {error && <p className="error">{error}</p>}
  </main>;
}
