"use client";

import { PanelLeftIcon } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { memo } from "react";
import { SaraMascot } from "@/components/brand/sara-mascot";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { guestRegex } from "@/lib/constants";
import { HomeLogo } from "./home-logo";
import { ProgressPill } from "./progress-indicator";
import { SoundToggle } from "./sound-toggle";
import { TopicPicker } from "./topic-picker";
import { TopicsMenuButton } from "./topics-menu";
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
        className="rounded-full px-4 text-muted-foreground hover:text-foreground transition-all duration-200 hover:translate-y-[-1px] hover:bg-white/5"
        size="sm"
        variant="ghost"
      >
        <Link href="/login">Sign in</Link>
      </Button>
      <Button
        asChild
        className="rounded-full bg-[image:var(--gradient-sunset)] px-4 font-semibold text-white shadow-md shadow-amber-500/10 transition-all duration-200 hover:scale-[1.03] hover:translate-y-[-1px] active:scale-[0.98] hover:shadow-[0_0_15px_-3px_rgba(244,63,94,0.3)] hover:border hover:border-amber-500/20"
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
  const { data } = useSession();
  const isGuest = !data?.user || guestRegex.test(data.user.email ?? "");

  // Desktop collapsed: hide header on desktop when sidebar is collapsed.
  // But for guests (no sidebar) always show the header.
  if (state === "collapsed" && !isMobile && !isGuest) {
    return null;
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 bg-[#090915]/80 px-3 backdrop-blur-md border-b border-indigo-950/40">
      {!isGuest && (
        <Button
          className="md:hidden hover:bg-white/5 transition-all duration-200 hover:translate-y-[-1px]"
          onClick={toggleSidebar}
          size="icon-sm"
          variant="ghost"
        >
          <PanelLeftIcon className="size-4" />
        </Button>
      )}

      {/* Logo → Return Home (resets the mission UI, keeps progress/messages). */}
      <HomeLogo className="flex items-center gap-1.5 transition-all duration-200 hover:opacity-90 active:scale-[0.98] hover:translate-y-[-0.5px]">
        <SaraMascot animated={false} size={22} />
        <span className="text-sm font-semibold tracking-tight text-foreground">
          SARA
        </span>
      </HomeLogo>

      {/* Primary topic discovery for everyone. */}
      <TopicPicker className="transition-all duration-200 hover:translate-y-[-1px] hover:bg-white/5" />

      {!isReadonly && !isGuest && (
        <VisibilitySelector
          chatId={chatId}
          className="transition-all duration-200 hover:translate-y-[-1px] hover:bg-white/5"
          selectedVisibilityType={selectedVisibilityType}
        />
      )}

      {!isGuest && <TopicsMenuButton className="transition-all duration-200 hover:translate-y-[-1px]" />}

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
