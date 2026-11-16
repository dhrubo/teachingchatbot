import { AuthForm, type AuthTab } from "@/components/auth/auth-form";

export const dynamic = "force-dynamic";

const VALID_TABS: readonly AuthTab[] = [
  "signin",
  "pin",
  "register-student",
  "register-parent",
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab = VALID_TABS.includes(tab as AuthTab)
    ? (tab as AuthTab)
    : "signin";

  return (
    <main className="min-h-screen">
      <AuthForm initialTab={initialTab} />
    </main>
  );
}
