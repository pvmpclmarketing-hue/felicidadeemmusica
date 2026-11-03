"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./vsl-insta-player.module.css";

export default function VslInstaPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCta, setShowCta] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowCta(true), 10000);
    return () => window.clearTimeout(timeout);
  }, []);

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
      } catch {
        setIsPlaying(false);
      }
    } else {
      video.pause();
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.content} aria-label="Vídeo de apresentação">
        <p className={styles.brand}>Felicidade em Música</p>

        <div className={styles.player}>
          <video
            ref={videoRef}
            className={styles.video}
            controls
            playsInline
            preload="metadata"
            poster="/vslinsta/vsl-poster.jpg"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          >
            <source src="/vslinsta/vsl-musica.mp4" type="video/mp4" />
            Seu navegador não conseguiu carregar o vídeo. Atualize a página ou tente outro navegador.
          </video>

          {!isPlaying && (
            <button
              className={styles.playButton}
              type="button"
              onClick={togglePlayback}
              aria-label="Reproduzir vídeo"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5.7c0-.8.9-1.3 1.6-.9l10 6.3a1.1 1.1 0 0 1 0 1.8l-10 6.3a1.1 1.1 0 0 1-1.6-.9V5.7Z" fill="currentColor" />
              </svg>
            </button>
          )}
        </div>

        <a
          className={`${styles.cta} ${showCta ? styles.ctaVisible : ""}`}
          href="https://felicidadeemmusica.shop/"
          aria-hidden={!showCta}
          tabIndex={showCta ? 0 : -1}
        >
          Criar Minha Música
          <span aria-hidden="true">→</span>
        </a>
      </section>
    </main>
  );
}
