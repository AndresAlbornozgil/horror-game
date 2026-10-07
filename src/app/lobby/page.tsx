import { redirect } from "next/navigation";

// Rooms are always addressed by code; the home screen is the entry point.
export default function LobbyIndexPage() {
  redirect("/");
}
