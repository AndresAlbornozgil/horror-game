import { Button } from "@/components/ui/Button";

interface CreateRoomButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function CreateRoomButton({ onClick, disabled, loading }: CreateRoomButtonProps) {
  return (
    <Button variant="primary" className="w-full" onClick={onClick} disabled={disabled}>
      {loading ? "Opening…" : "Create Room"}
    </Button>
  );
}
