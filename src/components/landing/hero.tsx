"use client";

import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { MagneticButton } from "./magnetic-button";
import { useGsap } from "@/lib/hooks/use-gsap";
import gsap from "gsap";

export function Hero() {
  const containerRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Belt-and-suspenders for `loop`: some browsers stall briefly at the end of
  // muted-autoplay videos, so we explicitly rewind+play on `ended`.
  const handleEnded = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {});
  };

  useGsap(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.9 } });

      tl.fromTo("[data-hero='line1']", { y: 50, opacity: 0 }, { y: 0, opacity: 1 })
        .fromTo("[data-hero='line2']", { y: 50, opacity: 0 }, { y: 0, opacity: 1 }, "-=0.7")
        .fromTo("[data-hero='subtitle']", { y: 30, opacity: 0 }, { y: 0, opacity: 1 }, "-=0.5")
        .fromTo("[data-hero='cta']", { y: 20, opacity: 0 }, { y: 0, opacity: 1 }, "-=0.4")
        .fromTo(
          "[data-hero='video']",
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.1 },
          "-=0.4",
        );
    },
    containerRef,
    [],
  );

  return (
    <section
      ref={containerRef}
      className="relative px-6 pt-28 pb-16 sm:px-12 sm:pt-36 sm:pb-24"
    >
      <div className="mx-auto w-full max-w-6xl">
        {/* Text */}
        <div className="text-center">
          <h1>
            <span
              data-hero="line1"
              className="block text-5xl font-bold tracking-tight text-text opacity-0 sm:text-6xl lg:text-7xl"
            >
              Track work.
            </span>
            <span
              data-hero="line2"
              className="block font-serif text-5xl italic text-text opacity-0 sm:text-6xl lg:text-7xl"
            >
              Ship it.
            </span>
          </h1>

          <p
            data-hero="subtitle"
            className="mx-auto mt-6 max-w-md font-mono text-sm leading-relaxed text-text-secondary opacity-0 sm:mt-8 sm:text-base"
          >
            A lightweight issue tracker for teams who&apos;d rather build than manage tickets.
          </p>

          <div
            data-hero="cta"
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 opacity-0 sm:mt-10"
          >
            <MagneticButton href="/signup" size="lg">
              Start Free
            </MagneticButton>

            <a
              href="#features"
              className="group flex items-center gap-1.5 font-mono text-sm text-text-secondary transition-colors duration-200 hover:text-text"
            >
              See how it works
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </a>
          </div>
        </div>

        {/* Video */}
        <div
          data-hero="video"
          className="relative mt-12 overflow-hidden rounded-xl border border-border bg-surface opacity-0 shadow-[0_24px_80px_rgba(46,46,44,0.12),_0_4px_16px_rgba(46,46,44,0.04)] sm:mt-20 sm:rounded-2xl"
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/flow-demo-poster.jpg"
            onEnded={handleEnded}
            className="block h-auto w-full"
            aria-label="Flow product demo"
          >
            <source src="/flow-demo.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </section>
  );
}
