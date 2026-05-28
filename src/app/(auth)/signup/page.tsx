import SignupForm from "@/components/auth/SignupForm";

interface SignupPageProps {
  searchParams: Promise<{ invite?: string; group?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const inviteCode = params.invite ?? "WC2026";
  const groupName = params.group ?? "La Trampa del Offside";

  return <SignupForm inviteCode={inviteCode} groupName={groupName} />;
}
