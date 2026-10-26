import { requireUser } from "@/lib/auth/dal";
import CameraScanner from "./CameraScanner";

export default async function ScanPage() {
  await requireUser();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Scan your closet
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-lg text-gray-500">
        Point your camera at your clothes. OutfitMax detects each item live —
        review the list and add the ones you want to your wardrobe.
      </p>

      <CameraScanner />
    </main>
  );
}
