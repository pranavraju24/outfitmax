import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// In Next.js 16, this file (formerly "middleware.ts") runs before requests.
// We delegate to updateSession, which refreshes the Supabase session and
// guards protected routes.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

// Run on all routes EXCEPT Next.js internals and static image files.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
