"use client";

import { PanelLeftIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { guestRegex } from "@/lib/constants";
import { ProgressPill } from "./progress-indicator";
import { SoundToggle } from "./sound-toggle";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";

function AuthButtons() {
  const { data, status } = useSession();
  const isGuest = guestRegex.test(data?.user?.email ?? "");

  // Only nudge guests (or signed-out) to sign in / sign up.
  if (status === "loading" || (data?.user && !isGuest)) {
    return null;
  }

  return (
    <>
      <Button
        asChild
        className="rounded-full px-4 text-muted-foreground hover:text-foreground"
        size="sm"
        variant="ghost"
      >
        <Link href="/login">Sign in</Link>
      </Button>
      <Button
        asChild
        className="rounded-full bg-[image:var(--gradient-sunset)] px-4 font-semibold text-white shadow-[var(--shadow-card)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
        size="sm"
      >
        <Link href="/register">Sign up free ✨</Link>
      </Button>
    </>
  );
}

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const { state, toggleSidebar, isMobile } = useSidebar();

  if (state === "collapsed" && !isMobile) {
    return null;
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 bg-sidebar/80 px-3 backdrop-blur-sm">
      <Button
        className="md:hidden"
        onClick={toggleSidebar}
        size="icon-sm"
        variant="ghost"
      >
        <PanelLeftIcon className="size-4" />
      </Button>

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
        />
      )}

      <div className="ml-auto flex items-center gap-2">
        <ProgressPill />
        <AuthButtons />
        <SoundToggle />
      </div>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});
