import { HeartbeatLine } from "./HeartbeatLine";

interface GameTitleProps {
  /** "lg" for the home screen, "md" for in-app headers. */
  size?: "lg" | "md";
  flicker?: boolean;
}

export function GameTitle({ size = "lg", flicker = true }: GameTitleProps) {
  const sizes =
    size === "lg" ? "text-5xl tracking-[0.3em] sm:text-6xl lg:text-7xl" : "text-3xl tracking-[0.3em] sm:text-5xl";

  return (
    <div className="text-center">
      <p className="label mb-4">Survival horror game</p>
      <h1
        className={`${flicker ? "animate-flicker" : ""} pl-[0.3em] font-semibold uppercase text-bone [text-shadow:0_0_24px_rgb(140_31_31/0.45)] ${sizes}`}
      >
        Dead Signal
      </h1>
      <HeartbeatLine className="mx-auto mt-4" />
    </div>
  );
}
