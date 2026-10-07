"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ROOM_CODE_LENGTH } from "@/lib/constants";
import { normalizeRoomCode } from "@/lib/utils";

interface JoinRoomFormProps {
  onJoin: (roomCode: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function JoinRoomForm({ onJoin, disabled, loading }: JoinRoomFormProps) {
  const [code, setCode] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onJoin(code);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Room Code"
        value={code}
        onChange={(event) => setCode(normalizeRoomCode(event.target.value))}
        maxLength={ROOM_CODE_LENGTH}
        placeholder="ABCD23"
        className="text-center text-xl uppercase"
        disabled={disabled}
      />
      <Button type="submit" className="w-full" disabled={disabled || code.length === 0}>
        {loading ? "Entering…" : "Join Room"}
      </Button>
    </form>
  );
}
