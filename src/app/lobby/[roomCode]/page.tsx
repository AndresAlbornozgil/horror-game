import { redirect } from "next/navigation";
import { Lobby } from "@/components/lobby/Lobby";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/utils";

export default async function LobbyRoomPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const roomCode = normalizeRoomCode((await params).roomCode);
  if (!isValidRoomCode(roomCode)) redirect("/");

  return <Lobby roomCode={roomCode} />;
}
