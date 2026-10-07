export function LoadingScreen({ message = "Entering the dark…" }: { message?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-void">
      <p className="label animate-flicker text-base">{message}</p>
    </div>
  );
}
