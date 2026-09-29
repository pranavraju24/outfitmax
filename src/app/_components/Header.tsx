import Link from "next/link";
import { getUser } from "@/lib/auth/dal";
import { signOut } from "@/app/login/actions";

// A server component shown on every page (added in layout.tsx). It reads the
// current user and shows either a "Log in" link or the user's email + Log out.
export default async function Header() {
  const user = await getUser();

  return (
    <header className="sticky top-0 z-50 border-b border-[#2b2420]/10 bg-[#fbf4e6]/85 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-bold hover:text-[#E86A45]">
          Home
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/analyze" className="hover:underline">
            Analyze
          </Link>
          {user ? (
            <>
              <Link href="/closet" className="hover:underline">
                My Closet
              </Link>
              <Link href="/outfits" className="hover:underline">
                Outfit ideas
              </Link>
              <span className="hidden text-gray-500 sm:inline">{user.email}</span>
              {/* Logging out is a mutation, so it's a Server Action in a form. */}
              <form action={signOut}>
                <button className="rounded-md border border-gray-300 px-3 py-1 hover:bg-gray-50">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-[#E86A45] px-4 py-1.5 font-medium text-white transition hover:bg-[#d65b38]"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
