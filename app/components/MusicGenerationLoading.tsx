"use client";

import { useEffect, useState } from "react";

type Props = {
  kicker: string;
  title: string;
  description: string;
  phrases: readonly [string, string, string, string];
};

export function MusicGenerationLoading({ kicker, title, description, phrases }: Props) {
  const [progress, setProgress] = useState(5);

  useEffect(() => {
    const startedAt = Date.now();
    const update = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const target = elapsed < 20 ? 5 + elapsed * 2 : Math.min(94, 45 + (elapsed - 20) * 0.27);
      setProgress((current) => Math.max(current, Math.round(target)));
    };
    update();
    const timer = window.setInterval(update, 800);
    return () => window.clearInterval(timer);
  }, []);

  const phrase = progress < 30 ? phrases[0] : progress < 55 ? phrases[1] : progress < 78 ? phrases[2] : phrases[3];

  return <main className="flow v2-flow center music-loading" aria-live="polite">
    <p className="kicker">{kicker}</p>
    <div className="music-loading-note">♫</div>
    <p className="music-loading-phrase">{phrase}</p>
    <h1>{title}</h1>
    <p className="v2-copy">{description}</p>
    <div className="music-progress"><span style={{ width: `${progress}%` }} /></div>
    <b className="music-progress-number">{progress}%</b>
  </main>;
}
