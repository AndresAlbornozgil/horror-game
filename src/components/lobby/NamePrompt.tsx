"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { PlayerNameInput } from "@/components/home/PlayerNameInput";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { sanitizePlayerName } from "@/lib/utils";

interface NamePromptProps {
  onSubmit: (name: string) => void;
}

/** Shown when someone opens an invite link without a saved name. */
export function NamePrompt({ onSubmit }: NamePromptProps) {
  const [draft, setDraft] = useState("");
  const clean = sanitizePlayerName(draft);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (clean) onSubmit(clean);
  };

  return (
    <Modal title="You were invited">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <PlayerNameInput value={draft} onChange={setDraft} autoFocus />
        <Button type="submit" variant="primary" disabled={!clean}>
          Enter
        </Button>
      </form>
    </Modal>
  );
}
