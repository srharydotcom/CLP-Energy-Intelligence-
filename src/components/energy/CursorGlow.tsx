import { useEffect, useRef } from "react";

/** A presentation-only light layer. No React render is tied to pointer movement. */
export function CursorGlow() {
  const glow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const light = glow.current;
    if (!light) return;

    let frame = 0;
    let x = -1000;
    let y = -1000;

    const move = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        light.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        light.style.opacity = "1";
        frame = 0;
      });
    };
    const leave = () => {
      light.style.opacity = "0";
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={glow} className="cursor-glow" aria-hidden="true" />;
}