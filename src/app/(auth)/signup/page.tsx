import SignupForm from "@/components/auth/SignupForm";

interface SignupPageProps {
  searchParams: Promise<{ invite?: string; group?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  // null when no invite param — SignupForm shows a generic form without the invite banner
  const inviteCode = params.invite ?? null;
  const groupName = params.group ?? null;

  return <SignupForm inviteCode={inviteCode} groupName={groupName} />;
}
