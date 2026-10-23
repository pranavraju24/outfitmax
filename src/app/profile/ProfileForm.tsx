"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "./actions";

export default function ProfileForm({
  email,
  fullName,
  phone,
}: {
  email: string;
  fullName: string;
  phone: string;
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    undefined
  );

  return (
    <form
      action={action}
      className="mt-8 space-y-5 rounded-2xl border border-[#2b2420]/15 p-8 text-left"
    >
      {/* Email — read-only, since it comes from your login account. */}
      <div>
        <label className="block text-base font-medium">Email</label>
        <input
          value={email}
          readOnly
          className="mt-2 w-full cursor-not-allowed rounded-xl border border-[#2b2420]/25 bg-[#2b2420]/5 p-4 text-base text-gray-500 outline-none"
        />
        <p className="mt-1 text-sm text-gray-500">
          Your email is managed by your login and can&apos;t be changed here.
        </p>
      </div>

      <div>
        <label htmlFor="full_name" className="block text-base font-medium">
          Name
        </label>
        <input
          id="full_name"
          name="full_name"
          defaultValue={fullName}
          placeholder="Your name"
          className="mt-2 w-full rounded-xl border border-[#2b2420]/25 p-4 text-base outline-none focus:border-[#E86A45]"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-base font-medium">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={phone}
          placeholder="e.g. (555) 123-4567"
          className="mt-2 w-full rounded-xl border border-[#2b2420]/25 p-4 text-base outline-none focus:border-[#E86A45]"
        />
      </div>

      {state?.error && <p className="text-base text-red-600">{state.error}</p>}
      {state?.success && (
        <p className="text-base text-green-700">Profile saved!</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-[#E86A45] px-8 py-4 text-base font-semibold text-white transition hover:bg-[#d65b38] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
