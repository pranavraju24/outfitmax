import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/wardrobe/storage";
import type { Garment } from "@/lib/wardrobe/types";
import AddGarmentForm from "./AddGarmentForm";
import ClosetBrowser from "./ClosetBrowser";

export default async function ClosetPage() {
  const user = await requireUser();

  // Fetch THIS user's garments. We use the logged-in server client, so Row Level
  // Security automatically limits results to rows they own — no manual filtering.
  const supabase = await createClient();
  const { data } = await supabase
    .from("garments")
    .select("*")
    .order("created_at", { ascending: false });
  const garments = (data ?? []) as Garment[];

  // Turn each private storage path into a temporary displayable URL.
  const items = await Promise.all(
    garments.map(async (g) => ({ g, url: await getSignedUrl(g.storage_path) }))
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">My Closet</h1>
      <p className="mt-3 text-lg text-gray-500">
        Logged in as {user.email}. {garments.length} item
        {garments.length === 1 ? "" : "s"}.
      </p>

      <div className="mx-auto mt-8 max-w-xl">
        <AddGarmentForm />
      </div>

      {items.length === 0 ? (
        <p className="mt-10 text-lg text-gray-500">
          Your closet is empty. Add a clothing photo above to get started.
        </p>
      ) : (
        <ClosetBrowser items={items} />
      )}
    </main>
  );
}
