import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const user = await requireUser();

  // Load the extra profile details (may be null if never saved yet).
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-md px-4 py-12 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Your profile
      </h1>
      <p className="mt-3 text-lg text-gray-500">Manage your account details.</p>

      <ProfileForm
        email={user.email ?? ""}
        fullName={profile?.full_name ?? ""}
        phone={profile?.phone ?? ""}
      />

      {/* Log out lives here now, per the design. */}
      <form action={signOut} className="mt-8">
        <button className="w-full rounded-full border border-[#2b2420]/25 px-8 py-4 text-base font-semibold transition hover:bg-[#2b2420]/5">
          Log out
        </button>
      </form>
    </main>
  );
}
