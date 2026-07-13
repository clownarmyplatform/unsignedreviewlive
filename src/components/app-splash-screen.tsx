"use client";

import { useState } from "react";

type AppSplashScreenProps = {
  isFading?: boolean;
  message?: string;
};

export function AppSplashScreen({
  isFading = false,
  message = "Loading uniqueKontent...",
}: AppSplashScreenProps) {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <div
      className={`fixed inset-0 z-[200] flex h-screen w-screen items-center justify-center bg-black transition-opacity duration-400 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black">
        {!videoFailed ? (
          <video
            autoPlay
            muted
            playsInline
            preload="auto"
            onError={() => setVideoFailed(true)}
            className="h-full w-full object-cover"
          >
            <source src="/assets/ukplatform_splash_compressed.mp4" type="video/mp4" />
          </video>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/70 to-transparent px-6 pb-10 pt-20 text-center sm:pb-12">
          <p className="text-sm font-medium tracking-[0.14em] text-zinc-200 sm:text-base">
            {message}
          </p>
        </div>

        {videoFailed ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <p className="text-sm font-medium tracking-[0.14em] text-zinc-200 sm:text-base">
              {message}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
