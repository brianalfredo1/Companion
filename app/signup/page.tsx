"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Step = "account" | "room" | "invite-created" | "confirm-email";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  // If already signed in (e.g. redirected here without a room), skip to the
  // room step; if a room already exists, go home.
  useEffect(() => {
    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, couple_room_id")
          .eq("id", session.user.id)
          .maybeSingle();
        if (profile?.couple_room_id) {
          router.replace("/dashboard");
          return;
        }
        if (profile?.name) setName(profile.name);
        setStep("room");
      }
      setChecking(false);
    }
    check();
  }, [router]);

  async function ensureProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, name: name.trim() || "Me" });
    if (error) throw error;
  }

  async function handleAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.session) {
        setStep("confirm-email");
        return;
      }
      await ensureProfile();
      setStep("room");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateRoom() {
    setError(null);
    setBusy(true);
    try {
      await ensureProfile();
      const { data, error } = await supabase.rpc("create_room");
      if (error) throw error;
      setCreatedCode(data as string);
      setStep("invite-created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create room");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoinRoom(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await ensureProfile();
      const { data, error } = await supabase.rpc("join_room", {
        code: inviteCode,
      });
      if (error) throw error;
      if (!data) {
        setError("Invalid invite code (or the room is already full).");
        return;
      }
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join room");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400";

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="mx-auto flex min-h-screen max-w-[430px] flex-col justify-center bg-white px-6">
        <div className="mb-8 text-center">
          <p className="mb-2 text-4xl">🤍</p>
          <h1 className="text-2xl font-semibold text-neutral-900">Us</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {step === "account" && "Create your account"}
            {step === "room" && `Hi ${name || "there"} — set up your room`}
            {step === "invite-created" && "Your room is ready"}
            {step === "confirm-email" && "One more step"}
          </p>
        </div>

        {checking ? (
          <div className="h-32 animate-pulse rounded-2xl bg-neutral-100" />
        ) : step === "account" ? (
          <form onSubmit={handleAccount} className="space-y-3">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={inputClass}
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className={inputClass}
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              className={inputClass}
            />
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-neutral-900 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? "Creating account…" : "Continue"}
            </button>
            <p className="pt-2 text-center text-sm text-neutral-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-neutral-900 underline"
              >
                Sign in
              </Link>
            </p>
          </form>
        ) : step === "room" ? (
          <div className="space-y-6">
            <button
              onClick={handleCreateRoom}
              disabled={busy}
              className="w-full rounded-2xl border border-neutral-200 p-5 text-left disabled:opacity-50"
            >
              <p className="text-base font-semibold text-neutral-900">
                💌 Create a new room
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                You&apos;ll get an invite code to share with your person.
              </p>
            </button>
            <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-neutral-400">
              <div className="h-px flex-1 bg-neutral-200" />
              or
              <div className="h-px flex-1 bg-neutral-200" />
            </div>
            <form onSubmit={handleJoinRoom} className="space-y-3">
              <input
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Invite code (6 characters)"
                maxLength={6}
                className={`${inputClass} text-center font-mono text-lg tracking-[0.4em]`}
              />
              <button
                type="submit"
                disabled={busy || inviteCode.length !== 6}
                className="w-full rounded-full bg-neutral-900 py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? "Joining…" : "Join with invite code"}
              </button>
            </form>
            {error && <p className="text-sm text-rose-600">{error}</p>}
          </div>
        ) : step === "invite-created" ? (
          <div className="space-y-5 text-center">
            <p className="text-sm text-neutral-500">
              Share this code with your person so they can join:
            </p>
            <div className="rounded-2xl border border-neutral-200 py-6 font-mono text-3xl font-semibold tracking-[0.4em] text-neutral-900">
              {createdCode}
            </div>
            <button
              onClick={() => router.replace("/dashboard")}
              className="w-full rounded-full bg-neutral-900 py-3 text-sm font-medium text-white"
            >
              Go to dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-neutral-500">
              We sent a confirmation link to{" "}
              <span className="font-medium text-neutral-900">{email}</span>.
              Confirm your email, then sign in to finish setting up your room.
            </p>
            <Link
              href="/login"
              className="block w-full rounded-full bg-neutral-900 py-3 text-sm font-medium text-white"
            >
              Go to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
