/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import { Smartphone, ShieldCheck, MapPin, HeartPulse } from "lucide-react";
import { useTranslations } from "next-intl";
import type { User } from "@/types/user";

/** Typed helper for passing CSS custom properties through `style`. */
const vars = (v: Record<string, string>) => v as CSSProperties;

/** Mouse effects only make sense with a real pointer and when motion is allowed. */
function canUsePointerEffects() {
  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Tracks the cursor over an element and writes smoothed CSS variables:
 *   --mx / --my : cursor position in px (spotlight + lit grid)
 *   --px / --py : cursor offset from center, -1..1 (parallax + tilt)
 *   --spot      : 1 while hovering, 0 otherwise (fades the spotlight)
 * Uses refs + rAF instead of state, so the mouse never triggers a React re-render.
 */
function useHeroPointer<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !canUsePointerEffects()) return;

    const target = { x: 0, y: 0, nx: 0, ny: 0 };
    const current = { x: 0, y: 0, nx: 0, ny: 0 };
    const keys = ["x", "y", "nx", "ny"] as const;
    let raf = 0;

    const tick = () => {
      let moving = false;
      for (const k of keys) {
        const d = target[k] - current[k];
        if (Math.abs(d) > 0.001) {
          current[k] += d * 0.14;
          moving = true;
        } else {
          current[k] = target[k];
        }
      }
      el.style.setProperty("--mx", `${current.x.toFixed(1)}px`);
      el.style.setProperty("--my", `${current.y.toFixed(1)}px`);
      el.style.setProperty("--px", current.nx.toFixed(3));
      el.style.setProperty("--py", current.ny.toFixed(3));
      raf = moving ? requestAnimationFrame(tick) : 0;
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const read = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target.x = e.clientX - r.left;
      target.y = e.clientY - r.top;
      target.nx = Math.max(-1, Math.min(1, (target.x / r.width - 0.5) * 2));
      target.ny = Math.max(-1, Math.min(1, (target.y / r.height - 0.5) * 2));
    };

    const onEnter = (e: PointerEvent) => {
      read(e);
      current.x = target.x; // snap so the glow doesn't fly in from the corner
      current.y = target.y;
      el.style.setProperty("--spot", "1");
      start();
    };
    const onMove = (e: PointerEvent) => {
      read(e);
      start();
    };
    const onLeave = () => {
      target.nx = 0;
      target.ny = 0;
      el.style.setProperty("--spot", "0");
      start();
    };

    el.addEventListener("pointerenter", onEnter, { passive: true });
    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return ref;
}

/** Pauses all hero animations while the hero is scrolled out of view. */
function usePauseOffscreen<T extends HTMLElement>(ref: RefObject<T | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => {
      el.dataset.offscreen = entry.isIntersecting ? "false" : "true";
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

const floatCard =
  "hero-float flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-900/70 shadow-xl backdrop-blur-xl transition-colors duration-300 hover:border-red-500/60 hover:bg-slate-900/90";

const primaryBtn =
  "group relative block w-full overflow-hidden rounded-lg bg-red-600 px-8 py-4 text-center font-semibold text-white shadow-md transition duration-300 hover:-translate-y-1 hover:bg-red-500 hover:shadow-[0_12px_40px_-12px_rgba(239,68,68,0.8)]";

export default function Hero({ user }: { user: User | null }) {
  const t = useTranslations("landing.hero");
  const sectionRef = useHeroPointer<HTMLElement>();
  usePauseOffscreen(sectionRef);

  return (
    <section ref={sectionRef} className="relative isolate overflow-hidden bg-slate-950 text-white">
      {/* Background: faint grid, cursor-lit grid, cursor spotlight, ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="hero-grid" />
        <div className="hero-grid-lit" />
        <div className="hero-spotlight" />
        <div className="hero-breathe absolute left-1/2 top-1/2 h-87.5 w-87.5 sm:h-125 sm:w-125 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-700/10 blur-3xl" />
        <div
          className="hero-breathe absolute right-0 top-0 h-64 w-64 sm:h-96 sm:w-96 rounded-full bg-red-500/10 blur-3xl"
          style={vars({ "--d": "-2s" })}
        />
      </div>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-16 px-4 sm:px-6 py-20 lg:flex-row lg:py-36">
        <div className="flex-1 w-full text-center lg:text-start">
          <span
            className="hero-rise inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-red-300 backdrop-blur"
            style={vars({ "--d": "0ms" })}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            {t("badge")}
          </span>

          <h1
            className="hero-rise mt-6 text-4xl sm:text-5xl md:text-7xl font-bold leading-tight"
            style={vars({ "--d": "100ms" })}
          >
            {t("titleLine1")}
            <br />
            <span className="hero-shimmer-text">{t("titleLine2")}</span>
          </h1>

          <p
            className="hero-rise mt-6 sm:mt-8 max-w-2xl mx-auto lg:mx-0 text-base sm:text-lg leading-7 sm:leading-8 text-slate-300"
            style={vars({ "--d": "220ms" })}
          >
            {t("description1")}
          </p>
          <p
            className="hero-rise mt-4 sm:mt-6 max-w-2xl mx-auto lg:mx-0 text-sm sm:text-base text-slate-400 leading-6 sm:leading-7"
            style={vars({ "--d": "320ms" })}
          >
            {t("description2")}
          </p>

          <div
            className="hero-rise mt-8 sm:mt-10 flex flex-wrap justify-center lg:justify-start gap-4"
            style={vars({ "--d": "420ms" })}
          >
            <div className="w-full sm:w-auto">
              <Link href={user ? "/emergency" : "/login"} className={primaryBtn}>
                <span className="relative z-10">{user ? t("callEmergency") : t("login")}</span>
                {/* light sheen that sweeps across on hover */}
                <span
                  aria-hidden
                  className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
                />
              </Link>
            </div>

            <div className="w-full sm:w-auto">
              <a
                href="#workflow"
                className="block w-full rounded-lg border border-slate-700 bg-slate-800/50 px-8 py-4 text-center font-semibold text-white backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-red-500/50 hover:bg-slate-800"
              >
                {t("exploreWorkflow")}
              </a>
            </div>
          </div>

          <a
            href="#app-download"
            className="hero-rise group mt-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
            style={vars({ "--d": "520ms" })}
          >
            <Smartphone className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110" />
            {t("getApp")}
          </a>
        </div>

        <div
          className="hero-rise flex-1 w-full flex items-center justify-center py-10 lg:py-0 select-none"
          style={vars({ "--d": "250ms" })}
        >
          {/* Whole visual tilts toward the cursor */}
          <div
            className="relative h-72 w-72 sm:h-96 sm:w-96 lg:h-112 lg:w-md"
            style={{
              transform:
                "perspective(1100px) rotateX(calc(var(--py, 0) * -7deg)) rotateY(calc(var(--px, 0) * 9deg))",
              transformStyle: "preserve-3d",
            }}
          >
            <div className="hero-breathe absolute inset-0 rounded-full bg-red-600/20 blur-[60px]" />

            {/* Radar: ripples, rings, sweep, orbiting dots (shift opposite the cursor for depth) */}
            <div
              className="absolute inset-0"
              style={{ transform: "translate3d(calc(var(--px, 0) * -10px), calc(var(--py, 0) * -10px), 0)" }}
            >
              {[0, 1.6, 3.2].map((d) => (
                <div
                  key={d}
                  className="hero-ripple absolute inset-0 rounded-full border border-red-500/40"
                  style={vars({ "--d": `${d}s` })}
                />
              ))}

              <div className="absolute inset-0 rounded-full border border-slate-800" />
              <div className="absolute inset-8 sm:inset-10 rounded-full border border-slate-800/70" />
              <div className="absolute inset-16 sm:inset-20 rounded-full border border-slate-800/50" />

              <div className="hero-sweep absolute inset-0" />

              <div className="hero-orbit absolute inset-0" style={vars({ "--dur": "22s" })}>
                <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-400 shadow-[0_0_14px_3px_rgba(248,113,113,0.8)]" />
              </div>
              <div className="hero-orbit hero-orbit-reverse absolute inset-8 sm:inset-10" style={vars({ "--dur": "16s" })}>
                <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-300 shadow-[0_0_12px_3px_rgba(253,186,116,0.7)]" />
              </div>
            </div>

            {/* Logo tile */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-[1.75rem] border border-red-500/20 bg-linear-to-br from-red-600/20 to-transparent shadow-[0_0_70px_rgba(220,38,38,0.5)] backdrop-blur-sm">
                <img src="/logo6.png" alt="NAJDA" className="h-18 w-18 filter brightness-200" draggable={false} />
              </div>
            </div>

            {/* Floating cards (move with the cursor, a bit more than the radar) */}
            <div
              className="absolute -top-2 -left-6 sm:-left-10"
              style={{ transform: "translate3d(calc(var(--px, 0) * 26px), calc(var(--py, 0) * 26px), 0)" }}
            >
              <div className={floatCard} style={vars({ "--r": "-10deg", "--dur": "6s" })}>
                <ShieldCheck className="h-7 w-7 sm:h-8 sm:w-8 text-red-400" />
              </div>
            </div>

            <div
              className="absolute top-1/3 -right-6 sm:-right-12"
              style={{ transform: "translate3d(calc(var(--px, 0) * 34px), calc(var(--py, 0) * 34px), 0)" }}
            >
              <div className={floatCard} style={vars({ "--r": "8deg", "--dur": "7s", "--d": "-2s" })}>
                <HeartPulse className="h-7 w-7 sm:h-8 sm:w-8 text-red-400" />
              </div>
            </div>

            <div
              className="absolute -bottom-4 left-1/4 sm:left-10"
              style={{ transform: "translate3d(calc(var(--px, 0) * 20px), calc(var(--py, 0) * 20px), 0)" }}
            >
              <div className={floatCard} style={vars({ "--r": "6deg", "--dur": "5.5s", "--d": "-4s" })}>
                <MapPin className="h-7 w-7 sm:h-8 sm:w-8 text-red-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}