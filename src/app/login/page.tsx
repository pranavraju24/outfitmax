"use client";

import { useActionState, useState } from "react";
import { authenticate, type AuthState } from "./actions";

export default function LoginPage() {
  // Which form are we showing — "login" or "signup"?
  const [mode, setMode] = useState<"login" | "signup">("login");

  // useActionState wires our Server Action to the form. It hands back:
  //   state   -> whatever the action returned (an error, or nothing)
  //   action  -> the function to give <form action={...}>
  //   pending -> true while the request is in flight (for a loading state)
  const [state, action, pending] = useActionState<AuthState, FormData>(
    authenticate,
    undefined
  );

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        {mode === "login" ? "Log in" : "Create your account"}
      </h1>
      <p className="mt-3 text-lg text-gray-500">
        {mode === "login"
          ? "Welcome back to OutfitMax."
          : "Start building your digital wardrobe."}
      </p>

      <form action={action} className="mt-8 space-y-5 text-left">
        {/* Tells the server action which mode we're in. */}
        <input type="hidden" name="mode" value={mode} />

        <div>
          <label htmlFor="email" className="block text-base font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-2 w-full rounded-xl border border-[#2b2420]/25 p-4 text-base outline-none focus:border-[#E86A45]"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-base font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            className="mt-2 w-full rounded-xl border border-[#2b2420]/25 p-4 text-base outline-none focus:border-[#E86A45]"
          />
          {mode === "signup" && (
            <p className="mt-2 text-sm text-gray-500">At least 8 characters.</p>
          )}
        </div>

        {state?.error && (
          <p className="text-base text-red-600">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-black px-8 py-4 text-base font-semibold text-white disabled:opacity-50"
        >
          {pending
            ? "Please wait…"
            : mode === "login"
            ? "Log in"
            : "Sign up"}
        </button>
      </form>

      <p className="mt-8 text-center text-base text-gray-500">
        {mode === "login" ? "New here?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="font-medium text-black underline"
        >
          {mode === "login" ? "Create an account" : "Log in"}
        </button>
      </p>
    </main>
  );
}
