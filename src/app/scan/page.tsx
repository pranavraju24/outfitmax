import { requireUser } from "@/lib/auth/dal";
import ScanModes from "./ScanModes";

export default async function ScanPage() {
  await requireUser();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Scan your closet
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-lg text-gray-500">
        Detect your clothes with a live camera, or upload a video and we&apos;ll
        scan through it — then review the detected items and add them to your
        wardrobe.
      </p>

      <ScanModes />
    </main>
  );
}
