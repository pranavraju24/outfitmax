import Link from "next/link";
import { getUser } from "@/lib/auth/dal";

// A server component shown on every page (added in layout.tsx). It reads the
// current user and shows either a "Log in" link (logged out) or a "Profile"
// button (logged in, which links to /profile where Log out lives).
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
              <Link
                href="/profile"
                className="rounded-full bg-[#E86A45] px-4 py-1.5 font-medium text-white transition hover:bg-[#d65b38]"
              >
                Profile
              </Link>
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
