import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import OutfitSuggester from "./OutfitSuggester";

export default async function OutfitsPage() {
  await requireUser();

  // How many items are in the closet? (head:true = count only, no rows.)
  const supabase = await createClient();
  const { count } = await supabase
    .from("garments")
    .select("*", { count: "exact", head: true });
  const itemCount = count ?? 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Outfit ideas
      </h1>
      <p className="mt-3 text-lg text-gray-500">
        Assembled from the {itemCount} item{itemCount === 1 ? "" : "s"} in your
        closet.
      </p>

      <div className="mx-auto mt-8 max-w-xl">
        {itemCount < 2 ? (
          <p className="text-gray-600">
            Add at least 2 items to your{" "}
            <Link href="/closet" className="underline">
              closet
            </Link>{" "}
            first, then come back for outfit suggestions.
          </p>
        ) : (
          <OutfitSuggester />
        )}
      </div>
    </main>
  );
}
