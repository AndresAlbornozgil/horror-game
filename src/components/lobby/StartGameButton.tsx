import { Button } from "@/components/ui/Button";

interface StartGameButtonProps {
  onStart: () => void;
  waitingOn: number;
}

export function StartGameButton({ onStart, waitingOn }: StartGameButtonProps) {
  return (
    <div className="flex flex-col gap-2">
      <Button variant="primary" className="w-full" onClick={onStart} disabled={waitingOn > 0}>
        Start Game
      </Button>
      {waitingOn > 0 && (
        <p className="label text-center">
          Waiting for {waitingOn} {waitingOn === 1 ? "player" : "players"} to ready up
        </p>
      )}
    </div>
  );
}
