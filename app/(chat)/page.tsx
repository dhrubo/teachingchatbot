import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { getChatsByUserId } from "@/lib/db/queries";

export default async function Page() {
  const session = await auth();

  // For guests or signed-out users, show the empty new-chat screen.
  if (!session?.user || session.user.type === "guest") {
    return null;
  }

  // For logged-in users, redirect to the most recent chat (if any).
  const { chats } = await getChatsByUserId({
    id: session.user.id,
    limit: 1,
    startingAfter: null,
    endingBefore: null,
  });

  if (chats.length > 0) {
    redirect(`/chat/${chats[0].id}`);
  }

  return null;
}
