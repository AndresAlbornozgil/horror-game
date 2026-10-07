import { Button } from "@/components/ui/Button";

interface ReadyButtonProps {
  isReady: boolean;
  onToggle: () => void;
}

export function ReadyButton({ isReady, onToggle }: ReadyButtonProps) {
  return (
    <Button variant={isReady ? "secondary" : "primary"} className="w-full" onClick={onToggle}>
      {isReady ? "Not Ready" : "Ready"}
    </Button>
  );
}
