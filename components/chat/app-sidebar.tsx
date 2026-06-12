"use client";

import {
  LogInIcon,
  PanelLeftIcon,
  PenSquareIcon,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "next-auth";
import { useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { SaraMascot } from "@/components/brand/sara-mascot";
import { useMission } from "@/components/chat/mission-orchestrator";
import {
  getChatHistoryPaginationKey,
  SidebarHistory,
} from "@/components/chat/sidebar-history";
import { SidebarUserNav } from "@/components/chat/sidebar-user-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile, toggleSidebar } = useSidebar();
  const { mutate } = useSWRConfig();
  const { exitMission } = useMission();

  // Return Home: reset the mission UI (overlays) without deleting any data.
  const goHome = () => {
    setOpenMobile(false);
    exitMission();
    router.push("/");
  };
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  const isGuest = !user || user.type === "guest";

  const handleDeleteAll = () => {
    setShowDeleteAllDialog(false);
    router.replace("/");
    mutate(unstable_serialize(getChatHistoryPaginationKey), [], {
      revalidate: false,
    });

    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/history`, {
      method: "DELETE",
    });

    toast.success("All chats deleted");
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="pb-0 pt-3">
          <SidebarMenu>
            <SidebarMenuItem className="flex flex-row items-center justify-between">
              <div className="group/logo relative flex items-center justify-center">
                <SidebarMenuButton
                  className="size-8 !px-0 items-center justify-center group-data-[collapsible=icon]:group-hover/logo:opacity-0"
                  onClick={goHome}
                  tooltip="Home"
                >
                  <SaraMascot animated={false} size={24} />
                </SidebarMenuButton>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      className="pointer-events-none absolute inset-0 size-8 opacity-0 group-data-[collapsible=icon]:pointer-events-auto group-data-[collapsible=icon]:group-hover/logo:opacity-100"
                      onClick={() => toggleSidebar()}
                    >
                      <PanelLeftIcon className="size-4" />
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent className="hidden md:block" side="right">
                    Open sidebar
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="group-data-[collapsible=icon]:hidden">
                <SidebarTrigger className="text-sidebar-foreground/60 transition-colors duration-150 hover:text-sidebar-foreground" />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="pt-1">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="h-8 rounded-lg border border-sidebar-border text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    onClick={goHome}
                    tooltip="New mission"
                  >
                    <PenSquareIcon className="size-4" />
                    <span className="font-medium">New mission</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {user && !isGuest && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className="rounded-lg text-sidebar-foreground/40 transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setShowDeleteAllDialog(true)}
                      tooltip="Delete All Chats"
                    >
                      <TrashIcon className="size-4" />
                      <span className="text-[13px]">Delete all</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {isGuest ? (
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="flex flex-col items-center gap-3 px-3 py-6 text-center">
                  <SaraMascot animated={false} size={40} />
                  <div>
                    <p className="text-xs font-medium text-sidebar-foreground/80">
                      Free mode
                    </p>
                    <p className="mt-0.5 text-[11px] text-sidebar-foreground/40">
                      5 questions per day
                    </p>
                  </div>
                  <Link
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-violet-500 px-4 py-1.5 text-xs font-medium text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    href="/login"
                    onClick={() => setOpenMobile(false)}
                  >
                    <LogInIcon className="size-3" />
                    Sign in to save
                  </Link>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : (
            <SidebarHistory user={user} />
          )}

          {/* GCSE Domains Rollup Panel */}
          <SidebarGroup className="mt-auto border-t border-sidebar-border pt-4">
            <SidebarGroupContent>
              <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-sidebar-foreground/45">
                GCSE Progress
              </p>
              <div className="space-y-3 px-3">
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-sidebar-foreground/70">
                    <span>Numbers</span>
                    <span>75%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400" style={{ width: "75%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-sidebar-foreground/70">
                    <span>Ratio & Proportion</span>
                    <span>40%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400" style={{ width: "40%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-sidebar-foreground/70">
                    <span>Algebra</span>
                    <span>20%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400" style={{ width: "20%" }} />
                  </div>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border pt-2 pb-3">
          {user && <SidebarUserNav user={user} />}
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <AlertDialog
        onOpenChange={setShowDeleteAllDialog}
        open={showDeleteAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all
              your chats and remove them from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
