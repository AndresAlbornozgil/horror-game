import { PLAYER_NAME_MAX_LENGTH } from "@/lib/constants";
import { Input } from "@/components/ui/Input";

interface PlayerNameInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function PlayerNameInput({ value, onChange, disabled, autoFocus }: PlayerNameInputProps) {
  return (
    <Input
      label="Player Name"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      maxLength={PLAYER_NAME_MAX_LENGTH}
      placeholder="Enter Name"
      disabled={disabled}
      autoFocus={autoFocus}
    />
  );
}
