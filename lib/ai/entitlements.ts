import type { UserType } from "@/app/(auth)/auth";
import { getAppConfig } from "@/lib/app-config";

type Entitlements = {
  maxMessagesPerHour: number;
};

export function getEntitlements(userType: UserType): Entitlements {
  const config = getAppConfig();
  return {
    maxMessagesPerHour:
      userType === "guest" ? config.guestDailyQuestionLimit : 10,
  };
}
