import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/db/admin";
import { isGroupMember } from "@/lib/db/groups";

export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Admins go directly to the operations panel
  if (await isAdmin(user.id)) redirect("/admin");

  // Invited group members go to the player dashboard
  if (await isGroupMember(user.id)) redirect("/dashboard");

  // Everyone else (accounts created without an invite) sees the access wall
  redirect("/no-access");
}
