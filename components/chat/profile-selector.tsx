"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { fetcher, cn } from "@/lib/utils";
import { OnboardingStepper } from "./onboarding-stepper";
import { PlusIcon, ShieldAlertIcon, GraduationCapIcon } from "lucide-react";

// Helper to get a nice gradient and emoji based on student name hash
function getAvatarPreset(name: string) {
  const gradients = [
    "from-amber-400 to-orange-500",
    "from-orange-400 to-rose-500",
    "from-rose-400 to-red-500",
    "from-amber-400 to-brand-coral",
    "from-red-400 to-brand-coral",
  ];

  const emojis = ["🦊", "🐯", "🦁", "🐨", "🐼", "🐻", "🐵", "🦄", "🦅", "🦉"];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash);

  return {
    gradient: gradients[index % gradients.length],
    emoji: emojis[index % emojis.length],
  };
}

export function ProfileSelector() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR("/api/profiles", fetcher);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const profiles = data?.profiles || [];

  const handleSelectProfile = async (studentId: string) => {
    setSwitchingId(studentId);
    try {
      const response = await fetch("/api/profiles/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });

      if (!response.ok) {
        throw new Error("Failed to activate profile");
      }

      // Revalidate to update the shell active state
      await mutate();
    } catch (err) {
      console.error(err);
    } finally {
      setSwitchingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
        <Spinner className="size-8 text-brand-coral animate-spin" />
        <p className="mt-4 text-sm text-muted-foreground">Loading student profiles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
        <ShieldAlertIcon className="size-12 text-destructive mb-4" />
        <h3 className="text-lg font-bold">Failed to load profiles</h3>
        <p className="text-sm text-muted-foreground mb-4">Please try again later.</p>
        <Button onClick={() => mutate()} className="bg-brand-coral hover:bg-brand-coral/80 text-white">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
      <div className="w-full max-w-4xl text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Who is learning today?
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            Choose a student profile to enter SARA's interactive Year 8/9 GCSE classroom.
          </p>
        </div>

        {/* Netflix-style circular profiles grid */}
        <div className="flex flex-wrap justify-center gap-8 py-8">
          {profiles.map((profile: any) => {
            const preset = getAvatarPreset(profile.name);
            const isSwitching = switchingId === profile.id;

            return (
              <div
                key={profile.id}
                className="group flex flex-col items-center space-y-4 cursor-pointer text-center"
                onClick={() => !isSwitching && handleSelectProfile(profile.id)}
              >
                <div
                  className={cn(
                    "relative size-28 rounded-full bg-gradient-to-tr flex items-center justify-center shadow-md border-4 border-transparent transition-all duration-300 group-hover:scale-105 group-hover:border-brand-coral group-hover:shadow-brand-coral/20 group-hover:shadow-lg",
                    preset.gradient
                  )}
                >
                  {isSwitching ? (
                    <Spinner className="size-8 text-white animate-spin" />
                  ) : (
                    <span className="text-5xl select-none">{preset.emoji}</span>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-foreground transition-colors group-hover:text-brand-coral">
                    {profile.name}
                  </h3>
                  <span className="inline-block text-xs font-semibold bg-muted px-2.5 py-0.5 rounded-full text-muted-foreground">
                    Year {profile.schoolYear}
                  </span>
                  <p className="text-xs text-muted-foreground max-w-[120px] truncate">
                    {profile.selectedSubjects && profile.selectedSubjects.length > 0
                      ? profile.selectedSubjects.join(", ")
                      : "No subjects"}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Add Student button */}
          <div
            className="group flex flex-col items-center space-y-4 cursor-pointer text-center"
            onClick={() => setShowOnboarding(true)}
          >
            <div className="size-28 rounded-full border-4 border-dashed border-muted-foreground/30 flex items-center justify-center transition-all duration-300 group-hover:border-brand-coral group-hover:bg-brand-coral/5 group-hover:scale-105">
              <PlusIcon className="size-10 text-muted-foreground transition-colors group-hover:text-brand-coral" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-lg text-muted-foreground transition-colors group-hover:text-brand-coral">
                Add Student
              </h3>
              <p className="text-xs text-muted-foreground">Set up a new profile</p>
            </div>
          </div>
        </div>

        {/* Dashboard Access */}
        <div className="pt-6 border-t border-border/40 max-w-md mx-auto">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            className="w-full h-12 text-sm font-semibold rounded-xl"
          >
            <GraduationCapIcon className="size-4 mr-2" />
            Go to Guardian Dashboard
          </Button>
        </div>
      </div>

      {showOnboarding && (
        <OnboardingStepper
          onComplete={(newProfile) => {
            setShowOnboarding(false);
            // This set activeStudentId in the session/cookie via route, we just need to revalidate profiles
            mutate();
          }}
          onCancel={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}
