"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Role = "ADMIN" | "STANDARD";

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
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("commander@nebula-corp.com");
  const [password, setPassword] = useState("SecurePass123");
  const [session, setSession] = useState<{ user: AuthUser; token: string } | null>(null);
  const [cargo, setCargo] = useState<CargoRecord[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const sortedCargo = useMemo(() => sortCargoForDashboard(cargo), [cargo]);

  useEffect(() => {
    const storedSession = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (storedSession) {
      setSession(JSON.parse(storedSession));
    }
  }, []);

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

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    setMessage(`Logged in as ${data.user.role}.`);
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
    setMessage("");
  }

  if (!session) {
    return (
      <main className="shell auth-shell">
        <section className="auth-panel">
          <div className="brand-block">
            <p className="eyebrow">Intergalactic Cargo Portal</p>
            <h1>Manifest control for orbital logistics.</h1>
            <p className="muted">
              Sign in or create an account. Nebula Corp addresses receive Admin clearance
              automatically.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <div className="mode-switch" aria-label="Authentication mode">
              <button
                className={authMode === "login" ? "mode-button active" : "mode-button"}
                type="button"
                onClick={() => setAuthMode("login")}
              >
                Login
              </button>
              <button
                className={authMode === "signup" ? "mode-button active" : "mode-button"}
                type="button"
                onClick={() => setAuthMode("signup")}
              >
                Signup
              </button>
            </div>

            <label className="field">
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                required
              />
            </label>

            <label className="field">
              Password
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                minLength={8}
                required
              />
            </label>

            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Working..." : authMode === "login" ? "Login" : "Create Account"}
            </button>

            {message && <p className="notice error">{message}</p>}
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="shell dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Intergalactic Cargo Portal</p>
          <h1>Cargo Dashboard</h1>
          <p className="muted">
            {session.user.role === "ADMIN"
              ? "Admin clearance active. Weights are shown in KG."
              : "Standard clearance active. Weights are shown in LBS."}
          </p>
        </div>

        <div className="session-card">
          <span className="role-badge">{session.user.role}</span>
          <strong>{session.user.email}</strong>
          <button className="secondary-button" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {session.user.role === "ADMIN" && (
        <section className="toolbar" aria-label="Admin upload controls">
          <label className="file-control">
            <span>Manifest</span>
            <input
              type="file"
              accept=".txt,text/plain"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <button className="primary-button" type="button" onClick={handleUpload} disabled={isUploading}>
            {isUploading ? "Uploading..." : "File Upload"}
          </button>
        </section>
      )}

      {message && <p className="notice">{message}</p>}

      <section className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cargo ID</th>
              <th>Destination</th>
              <th>Weight</th>
              <th>Manifest Date</th>
            </tr>
          </thead>
          <tbody>
            {sortedCargo.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty-cell">
                  No cargo records available.
                </td>
              </tr>
            ) : (
              sortedCargo.map((record) => (
                <tr key={record.id}>
                  <td>{record.cargoId}</td>
                  <td>{record.destination}</td>
                  <td>{formatWeight(record, session.user.role)}</td>
                  <td>{new Date(record.manifestDate).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
