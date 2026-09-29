import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Runs on every request (via proxy.ts). Two jobs:
//   1. Refresh the user's login token so their session stays alive and the
//      server always sees an up-to-date session.
//   2. Redirect not-logged-in visitors away from wardrobe pages to /login.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write refreshed cookies onto both the request and the response so
          // the rest of this request (and the browser) get the new session.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: don't run other code between creating the client and getUser().
  // getUser() is what actually refreshes the token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Guard the wardrobe pages: guests get sent to the login page.
  const isProtected =
    path.startsWith("/closet") ||
    path.startsWith("/wardrobe") ||
    path.startsWith("/outfits");
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If an already-logged-in user lands on /login, send them into the app.
  if (path === "/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/closet";
    return NextResponse.redirect(url);
  }

  return response;
}
