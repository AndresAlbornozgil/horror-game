import { redirect } from "next/navigation";
import { GameContainer } from "@/components/game/GameContainer";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/utils";

export default async function GamePage({ params }: { params: Promise<{ roomCode: string }> }) {
  const roomCode = normalizeRoomCode((await params).roomCode);
  if (!isValidRoomCode(roomCode)) redirect("/");

  return <GameContainer roomCode={roomCode} />;
}
