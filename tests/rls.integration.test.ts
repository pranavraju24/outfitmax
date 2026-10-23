import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY } from "./local-supabase";

// Admin client (service role) — used only to create/delete the test users.
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type TestUser = { client: SupabaseClient; id: string };

// Creates a confirmed user and returns a client signed in AS that user, so its
// requests run under Row-Level Security (the `authenticated` role).
async function makeUser(email: string, password: string): Promise<TestUser> {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) throw createErr;

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
  });
  const { error: signInErr } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr) throw signInErr;

  return { client, id: created.user!.id };
}

describe("Row-Level Security: garments are private per user", () => {
  let userA: TestUser;
  let userB: TestUser;
  const stamp = Date.now();

  beforeAll(async () => {
    userA = await makeUser(`a_${stamp}@test.local`, "password123");
    userB = await makeUser(`b_${stamp}@test.local`, "password123");
  });

  afterAll(async () => {
    // Deleting the users cascades and removes their garments.
    if (userA?.id) await admin.auth.admin.deleteUser(userA.id);
    if (userB?.id) await admin.auth.admin.deleteUser(userB.id);
  });

  it("lets a user insert and read their OWN garment", async () => {
    const { error } = await userA.client.from("garments").insert({
      user_id: userA.id,
      storage_path: `${userA.id}/shirt.jpg`,
      name: "A's shirt",
      tags: [],
    });
    expect(error).toBeNull();

    const { data } = await userA.client.from("garments").select("*");
    expect(data).toHaveLength(1);
    expect(data?.[0].name).toBe("A's shirt");
  });

  it("does NOT let another user read those garments", async () => {
    const { data } = await userB.client.from("garments").select("*");
    expect(data).toEqual([]); // B sees none of A's items
  });

  it("does NOT let a user insert a row owned by someone else", async () => {
    const { error } = await userB.client.from("garments").insert({
      user_id: userA.id, // pretending to be A
      storage_path: `${userA.id}/spoof.jpg`,
      name: "spoofed",
      tags: [],
    });
    expect(error).not.toBeNull(); // RLS with-check blocks the insert
  });
});
