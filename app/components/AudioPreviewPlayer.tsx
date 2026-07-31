"use client";

import { useEffect, useRef, useState } from "react";

const PREVIEW_SECONDS = 30;
const timeLabel = (seconds: number) => `00:${Math.max(0, Math.min(PREVIEW_SECONDS, Math.floor(seconds))).toString().padStart(2, "0")}`;

export function AudioPreviewPlayer({ src, label }: { src: string; label: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => audioRef.current?.pause(), []);

  function updateProgress() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.currentTime >= PREVIEW_SECONDS) {
      audio.pause();
      audio.currentTime = PREVIEW_SECONDS;
      setPlaying(false);
    }
    setCurrentTime(Math.min(audio.currentTime, PREVIEW_SECONDS));
  }

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      if (audio.currentTime >= PREVIEW_SECONDS) audio.currentTime = 0;
      await audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Math.max(0, Math.min(PREVIEW_SECONDS, value));
    audio.currentTime = next;
    setCurrentTime(next);
  }

  return <div className="audio-preview-player">
    <audio ref={audioRef} preload="metadata" src={src} onTimeUpdate={updateProgress} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
    <button className="audio-preview-toggle" type="button" onClick={() => void toggle()} aria-label={playing ? `Pausar ${label}` : `Ouvir ${label}`}>{playing ? "❚❚" : "▶"}</button>
    <span className="audio-preview-time">{timeLabel(currentTime)}</span>
    <input className="audio-preview-progress" type="range" min="0" max={PREVIEW_SECONDS} step="0.1" value={Math.min(currentTime, PREVIEW_SECONDS)} onChange={(event) => seek(Number(event.target.value))} aria-label={`Progresso de ${label}; prévia limitada a 30 segundos`} />
    <span className="audio-preview-time">00:30</span>
  </div>;
}
