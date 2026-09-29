"use client";

import { useActionState, useEffect, useRef } from "react";
import { addGarment, type AddGarmentState } from "./actions";

export default function AddGarmentForm() {
  const [state, action, pending] = useActionState<AddGarmentState, FormData>(
    addGarment,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the file input after a successful add.
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="rounded-2xl border-2 border-dashed border-[#2b2420]/25 p-8 text-center"
    >
      <label htmlFor="image" className="block text-xl font-semibold">
        Add a clothing photo
      </label>
      <p className="mt-2 text-sm text-gray-500">
        Gemini will identify it and file it into your closet automatically.
      </p>

      <div className="mt-6 flex flex-col items-center gap-4">
        <input
          id="image"
          name="image"
          type="file"
          accept="image/*"
          required
          className="block w-full max-w-xs text-base file:mr-4 file:rounded-full file:border-0 file:bg-black file:px-5 file:py-2.5 file:text-sm file:font-medium file:text-white"
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full max-w-xs rounded-full bg-black px-8 py-4 text-base font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Analyzing & saving…" : "Add to wardrobe"}
        </button>
      </div>

      {state?.error && <p className="mt-4 text-base text-red-600">{state.error}</p>}
      {state?.success && (
        <p className="mt-4 text-base text-green-700">Added to your closet!</p>
      )}
    </form>
  );
}
