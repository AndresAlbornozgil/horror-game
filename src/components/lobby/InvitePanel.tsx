"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

interface InvitePanelProps {
  roomCode: string;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API is unavailable on insecure origins; fall back to a temporary textarea.
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

export function InvitePanel({ roomCode }: InvitePanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyText(`${window.location.origin}/lobby/${roomCode}`);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Panel title="Room Code">
      <p className="mb-5 text-center font-typewriter text-4xl tracking-[0.35em] text-bone" aria-label={`Room code ${roomCode}`}>
        {roomCode}
      </p>
      <Button className="w-full" onClick={handleCopy}>
        {copied ? "Copied" : "Copy Invite Link"}
      </Button>
    </Panel>
  );
}
