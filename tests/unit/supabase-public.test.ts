import { afterEach, describe, expect, it, vi } from "vitest";
import { createPublicSupabase } from "@/lib/supabase/public";

describe("createPublicSupabase", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("có URL nhưng thiếu anon key → lỗi rõ ràng", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(() => createPublicSupabase()).toThrow("Thiếu NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });
});
