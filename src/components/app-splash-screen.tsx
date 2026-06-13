"use client";

import { useState } from "react";

type AppSplashScreenProps = {
  isFading?: boolean;
  message?: string;
};

export function AppSplashScreen({
  isFading = false,
  message = "Loading Clown Army Studio...",
}: AppSplashScreenProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div
      className={`fixed inset-0 z-[200] flex h-screen w-screen items-center justify-center bg-black transition-opacity duration-400 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
        {!imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/assets/URLsplash.webp"
            alt="Clown Army Studio loading animation"
            onError={() => setImageFailed(true)}
            className="h-auto max-h-[60vh] w-auto max-w-[min(82vw,40rem)] object-contain"
          />
        ) : null}

        <p className="mt-5 text-sm font-medium tracking-[0.14em] text-zinc-300 sm:text-base">
          {message}
        </p>
      </div>
    </div>
  );
}
