import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";

export function AuthScreen() {
  const [mode, setMode]         = useState("signin");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  // Google OAuth redirects back here with `?error=...&error_description=...`
  // on failure (e.g. rejected by the @tlcleaders.com domain trigger). Note:
  // we read from the QUERY STRING, not the hash — supabase-js's client
  // auto-scans window.location.hash on init (to detect tokens/errors) and
  // strips it immediately, often before this effect runs, so the hash can't
  // be relied on. The query string is untouched by that logic and survives.
  useEffect(() => {
    const search = window.location.search;
    const hash   = window.location.hash;
    const source = search.includes("error=") ? search
                 : hash.includes("error=")    ? hash.slice(1)
                 : null;
    if (source) {
      const params = new URLSearchParams(source);
      const desc = params.get("error_description");
      setError(desc ? desc.replace(/\+/g, " ") : "Sign-in failed. Please try again.");
      // Clear both so refreshing doesn't re-show a stale error
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const switchMode = m => { setMode(m); setError(""); };

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // App receives SIGNED_IN event and handles the rest
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          // Email confirmation required
          setError("Check your email to confirm your account, then sign in.");
          switchMode("signin");
          setLoading(false);
        }
        // If session exists, App receives SIGNED_IN and handles the rest
      }
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success the browser redirects to Google — no further action here
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box", fontSize: 13,
    padding: "8px 12px", borderRadius: "var(--border-radius-md)",
    border: "1px solid var(--color-border-secondary)",
    background: "var(--color-background-primary)",
    color: "var(--color-text-primary)", outline: "none",
  };

  const labelStyle = {
    fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)",
    display: "block", marginBottom: 4,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)" }}>
      <div style={{ width: "100%", maxWidth: 380, background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", padding: "32px 28px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>Team Tasks</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            {mode === "signin" ? "Sign in to your account" : "Create an account"}
          </div>
        </div>

        {/* Google sign-in */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 500, padding: "9px 12px", borderRadius: "var(--border-radius-md)", border: "1px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1, marginBottom: 16 }}
        >
          <svg width="16" height="16" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: "var(--color-border-secondary)" }} />
          <span style={{ fontSize: 11, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "var(--color-border-secondary)" }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "signup" && (
            <div>
              <label style={labelStyle}>Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required style={inputStyle} />
            </div>
          )}
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} style={inputStyle} />
          </div>

          {error && (
            <div style={{ fontSize: 12, color: "#A32D2D", padding: "8px 12px", background: "#FCEBEB", borderRadius: "var(--border-radius-md)", border: "0.5px solid #F7C1C1" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ marginTop: 4, fontSize: 13, fontWeight: 500, padding: 9, borderRadius: "var(--border-radius-md)", border: "1px solid #9FE1CB", background: "#E1F5EE", color: "#0F6E56", cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
          {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => switchMode(mode === "signin" ? "signup" : "signin")} style={{ background: "none", border: "none", color: "var(--color-text-primary)", cursor: "pointer", fontWeight: 500, fontSize: 13, textDecoration: "underline", padding: 0 }}>
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </div>

      </div>
    </div>
  );
}
