import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(), signOut: vi.fn(), client: vi.fn()
}));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: mocks.client }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(url); } }));
import { signIn, signOut } from "../actions";

describe("creator sign-in actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.client.mockResolvedValue({ auth: mocks });
  });
  it("rejects missing credentials before contacting Supabase", async () => {
    await expect(signIn(new FormData())).rejects.toThrow("/login?error=credentials");
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("uses the cookie-backed user client and preserves the password", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    const form = new FormData();
    form.set("email", " creator@example.com "); form.set("password", " password ");
    form.set("next", "https://attacker.invalid");
    await expect(signIn(form)).rejects.toThrow("/account");
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: "creator@example.com", password: " password " });
  });
  it.each(["provider error", "network error"])("hides %s details", async (kind) => {
    if (kind === "provider error") mocks.signInWithPassword.mockResolvedValue({ error: { message: "private detail" } });
    else mocks.signInWithPassword.mockRejectedValue(new Error("private detail"));
    const form = new FormData(); form.set("email", "creator@example.com"); form.set("password", "secret");
    await expect(signIn(form)).rejects.toThrow("/login?error=credentials");
  });
  it("signs out only the current session", async () => {
    mocks.signOut.mockResolvedValue({ error: null });
    await expect(signOut()).rejects.toThrow("/login");
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("does not report successful logout on a provider failure", async () => {
    mocks.signOut.mockResolvedValue({ error: { message: "private detail" } });
    await expect(signOut()).rejects.toThrow("/account?error=signout");
  });
});
