"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Role = "ADMIN" | "STANDARD";

type AuthMode = "login" | "signup";

type AuthUser = {
  id: string;
  email: string;
  role: Role;
};

type CargoRecord = {
  id: string;
  manifestDate: string;
  cargoId: string;
  destination: string;
  weightKg: number;
  createdAt: string;
};

type AuthResponse = {
  user: AuthUser;
  token: string;
  error?: string;
};

const AUTH_STORAGE_KEY = "intergalactic-cargo-auth";
const THEME_STORAGE_KEY = "intergalactic-cargo-theme";

function sortCargoForDashboard(cargo: CargoRecord[]) {
  return [...cargo].sort((a, b) => {
    const aIsEarth = a.destination.toLowerCase() === "earth";
    const bIsEarth = b.destination.toLowerCase() === "earth";

    if (aIsEarth && !bIsEarth) return 1;
    if (!aIsEarth && bIsEarth) return -1;

    return b.weightKg - a.weightKg;
  });
}

function formatWeight(record: CargoRecord, role: Role) {
  if (role === "ADMIN") {
    return `${record.weightKg.toLocaleString()} KG`;
  }

  return `${(record.weightKg * 2.20462).toLocaleString(undefined, {
    maximumFractionDigits: 2
  })} LBS`;
}

export default function HomePage() {
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [session, setSession] = useState<{ user: AuthUser; token: string } | null>(null);
  const [cargo, setCargo] = useState<CargoRecord[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const sortedCargo = useMemo(() => sortCargoForDashboard(cargo), [cargo]);

  useEffect(() => {
    const storedSession = window.localStorage.getItem(AUTH_STORAGE_KEY);
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (storedSession) {
      setSession(JSON.parse(storedSession));
    }

    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!session) return;

    void loadCargo();
  }, [session]);

  async function loadCargo() {
    const response = await fetch("/api/cargo");
    const data = (await response.json()) as { cargo?: CargoRecord[]; error?: string };

    if (!response.ok) {
      setMessage(data.error ?? "Could not load cargo.");
      return;
    }

    setCargo(data.cargo ?? []);
  }

  function openAuthForm(nextAuthMode: AuthMode) {
    setAuthMode(nextAuthMode);
    setMessage("");
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authMode) return;

    setIsSubmitting(true);
    setMessage("");

    const response = await fetch(`/api/${authMode}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = (await response.json()) as AuthResponse;

    setIsSubmitting(false);

    if (!response.ok) {
      setMessage(data.error ?? "Authentication failed.");
      return;
    }

    const nextSession = { user: data.user, token: data.token };
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    setEmail("");
    setPassword("");
    setAuthMode(null);
    setMessage(`Welcome. ${data.user.role} dashboard loaded.`);
  }

  async function handleUpload() {
    if (!session || !selectedFile) {
      setMessage("Choose a manifest file first.");
      return;
    }

    setIsUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", selectedFile);

    const response = await fetch("/api/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`
      },
      body: formData
    });

    const responseText = await response.text();
    let uploadResult: { savedCount?: number; skippedPrimeCargoIds?: string[]; error?: string };

    try {
      uploadResult = JSON.parse(responseText);
    } catch {
      uploadResult = { error: responseText };
    }

    setIsUploading(false);

    if (!response.ok) {
      setMessage(uploadResult.error ?? "Upload failed.");
      return;
    }

    setSelectedFile(null);
    setMessage(
      `Upload complete. Saved ${uploadResult.savedCount ?? 0} records. Skipped primes: ${
        uploadResult.skippedPrimeCargoIds?.join(", ") || "none"
      }.`
    );
    await loadCargo();
  }

  function handleLogout() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setSession(null);
    setCargo([]);
    setSelectedFile(null);
    setAuthMode(null);
    setMessage("");
  }

  const themeButtonLabel = theme === "light" ? "Dark" : "Light";

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-100">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-extrabold uppercase text-teal-700 dark:text-teal-300">
              Intergalactic Cargo Portal
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              type="button"
              onClick={() => setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"))}
            >
              {themeButtonLabel}
            </button>
            <button
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              type="button"
              onClick={() => openAuthForm("login")}
            >
              Sign in
            </button>
            <button
              className="rounded-full bg-teal-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 dark:bg-teal-400 dark:text-slate-950 dark:hover:bg-teal-300"
              type="button"
              onClick={() => openAuthForm("signup")}
            >
              Sign up
            </button>
          </div>
        </nav>

        <section className="mx-auto grid min-h-[calc(100vh-92px)] w-full max-w-6xl items-center gap-8 px-6 py-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-extrabold uppercase text-teal-700 dark:text-teal-300">
              Orbital Logistics Console
            </p>
            <h1 className="text-5xl font-black leading-tight tracking-normal text-slate-950 dark:text-white md:text-6xl">
              Secure cargo operations, one manifest at a time.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Review saved cargo, upload verified manifests, and keep route weights readable for
              every clearance level.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                className="rounded-md bg-teal-700 px-5 py-3 font-extrabold text-white shadow-lg shadow-teal-900/10 transition hover:bg-teal-800 dark:bg-teal-400 dark:text-slate-950 dark:hover:bg-teal-300"
                type="button"
                onClick={() => openAuthForm("login")}
              >
                Sign in
              </button>
              <button
                className="rounded-md border border-slate-300 bg-white px-5 py-3 font-extrabold text-slate-800 transition hover:border-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-teal-300"
                type="button"
                onClick={() => openAuthForm("signup")}
              >
                Create account
              </button>
            </div>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900">
            {authMode ? (
              <form className="grid gap-5" onSubmit={handleAuthSubmit}>
                <div>
                  <p className="text-sm font-extrabold uppercase text-teal-700 dark:text-teal-300">
                    {authMode === "login" ? "Sign in" : "Sign up"}
                  </p>
                  <h2 className="mt-2 text-2xl font-black">
                    {authMode === "login" ? "Welcome back" : "Create access"}
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                  <button
                    className={`rounded-md px-3 py-2 text-sm font-extrabold transition ${
                      authMode === "login"
                        ? "bg-white text-teal-800 shadow-sm dark:bg-slate-950 dark:text-teal-300"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                    type="button"
                    onClick={() => openAuthForm("login")}
                  >
                    Sign in
                  </button>
                  <button
                    className={`rounded-md px-3 py-2 text-sm font-extrabold transition ${
                      authMode === "signup"
                        ? "bg-white text-teal-800 shadow-sm dark:bg-slate-950 dark:text-teal-300"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                    type="button"
                    onClick={() => openAuthForm("signup")}
                  >
                    Sign up
                  </button>
                </div>

                <label className="grid gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                  Email
                  <input
                    className="min-h-12 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-teal-950"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                  Password
                  <span className="grid grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-md border border-slate-300 bg-white transition focus-within:border-teal-600 focus-within:ring-4 focus-within:ring-teal-100 dark:border-slate-700 dark:bg-slate-950 dark:focus-within:ring-teal-950">
                    <input
                      className="min-h-12 bg-transparent px-3 text-slate-950 outline-none dark:text-white"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type={showPassword ? "text" : "password"}
                      autoComplete={authMode === "login" ? "current-password" : "new-password"}
                      minLength={8}
                      required
                    />
                    <button
                      className="border-l border-slate-300 px-4 text-sm font-extrabold text-teal-700 dark:border-slate-700 dark:text-teal-300"
                      type="button"
                      onClick={() => setShowPassword((isVisible) => !isVisible)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </span>
                </label>

                <button
                  className="min-h-12 rounded-md bg-teal-700 px-4 font-extrabold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-400 dark:text-slate-950 dark:hover:bg-teal-300"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Verifying..." : authMode === "login" ? "Sign in" : "Create account"}
                </button>

                {message && (
                  <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                    {message}
                  </p>
                )}
              </form>
            ) : (
              <div className="grid min-h-[360px] content-center gap-5">
                <div className="rounded-lg bg-teal-50 p-4 dark:bg-teal-950/40">
                  <p className="text-sm font-extrabold text-teal-800 dark:text-teal-200">
                    Ready for clearance
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Choose Sign in or Sign up from the top bar to open the access form.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                    <strong className="block text-xl">JWT</strong>
                    <span className="text-xs text-slate-500">Auth</span>
                  </div>
                  <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                    <strong className="block text-xl">RBAC</strong>
                    <span className="text-xs text-slate-500">Roles</span>
                  </div>
                  <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                    <strong className="block text-xl">DB</strong>
                    <span className="text-xs text-slate-500">Cargo</span>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-6 text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold uppercase text-teal-700 dark:text-teal-300">
            Intergalactic Cargo Portal
          </p>
          <h1 className="mt-2 text-3xl font-black">Cargo Display</h1>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            type="button"
            onClick={() => setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"))}
          >
            {themeButtonLabel}
          </button>
          <span className="rounded-full bg-amber-100 px-3 py-2 text-sm font-extrabold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {session.user.role}
          </span>
          <button
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            type="button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </nav>

      <section className="mx-auto mt-6 grid w-full max-w-6xl gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Signed in as <strong>{session.user.email}</strong>.{" "}
            {session.user.role === "ADMIN"
              ? "Weights are displayed in KG."
              : "Weights are displayed in LBS."}
          </p>
        </div>

        {session.user.role === "ADMIN" && (
          <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="grid gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
              Manifest file
              <input
                className="rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                type="file"
                accept=".txt,text/plain"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <button
              className="min-h-12 rounded-md bg-teal-700 px-5 font-extrabold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-400 dark:text-slate-950 dark:hover:bg-teal-300"
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "File Upload"}
            </button>
          </section>
        )}

        {message && (
          <p className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm font-semibold text-teal-800 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-200">
            {message}
          </p>
        )}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="bg-slate-100 text-left text-xs uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <th className="px-4 py-3">Cargo ID</th>
                  <th className="px-4 py-3">Destination</th>
                  <th className="px-4 py-3">Weight</th>
                  <th className="px-4 py-3">Manifest Date</th>
                </tr>
              </thead>
              <tbody>
                {sortedCargo.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={4}>
                      No cargo records available.
                    </td>
                  </tr>
                ) : (
                  sortedCargo.map((record) => (
                    <tr
                      className="border-t border-slate-200 dark:border-slate-800"
                      key={record.id}
                    >
                      <td className="px-4 py-3 font-bold">{record.cargoId}</td>
                      <td className="px-4 py-3">{record.destination}</td>
                      <td className="px-4 py-3">{formatWeight(record, session.user.role)}</td>
                      <td className="px-4 py-3">
                        {new Date(record.manifestDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
