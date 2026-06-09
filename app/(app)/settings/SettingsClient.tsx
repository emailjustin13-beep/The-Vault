"use client";

import { useState } from "react";
import { Settings as SettingsType } from "@/db/schema";
import {
  CheckCircle2, XCircle, RefreshCw, Database,
  Key, Zap, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

interface Props {
  initialSettings: SettingsType | null;
  userId: string;
}

type StatusState = "idle" | "loading" | "success" | "error";

export function SettingsClient({ initialSettings, userId }: Props) {
  const [putioToken, setPutioToken] = useState(initialSettings?.putioAccessToken || "");
  const [tmdbKey, setTmdbKey] = useState(initialSettings?.tmdbApiKey || "");
  const [saving, setSaving] = useState(false);
  const [scanStatus, setScanStatus] = useState<StatusState>("idle");
  const [testPutio, setTestPutio] = useState<StatusState>("idle");
  const [testTmdb, setTestTmdb] = useState<StatusState>("idle");
  const [scanJobId, setScanJobId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ putioAccessToken: putioToken, tmdbApiKey: tmdbKey }),
      });
      if (res.ok) {
        setMessage("Settings saved.");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setMessage("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection(service: "putio" | "tmdb") {
    const setter = service === "putio" ? setTestPutio : setTestTmdb;
    setter("loading");
    try {
      const res = await fetch(`/api/${service === "putio" ? "putio" : "tmdb"}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          service === "putio"
            ? { accessToken: putioToken }
            : { apiKey: tmdbKey }
        ),
      });
      setter(res.ok ? "success" : "error");
    } catch {
      setter("error");
    }
    setTimeout(() => setter("idle"), 4000);
  }

  async function startScan() {
    setScanStatus("loading");
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setScanJobId(data.jobId);
        setScanStatus("success");
      } else {
        setScanStatus("error");
      }
    } catch {
      setScanStatus("error");
    }
    setTimeout(() => setScanStatus("idle"), 5000);
  }

  return (
    <div className="space-y-6">
      {/* Put.io */}
      <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" />
            Put.io Connection
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1.5">Access Token</label>
            <input
              type="password"
              value={putioToken}
              onChange={(e) => setPutioToken(e.target.value)}
              placeholder="Your Put.io OAuth token"
              className="w-full bg-card border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
            />
            <p className="text-xs text-muted mt-1.5">
              Get your token from{" "}
              <a
                href="https://app.put.io/oauth"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline inline-flex items-center gap-0.5"
              >
                app.put.io/oauth <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
          <button
            onClick={() => testConnection("putio")}
            disabled={!putioToken || testPutio === "loading"}
            className="flex items-center gap-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-4 py-2 transition-colors disabled:opacity-40"
          >
            <StatusIcon status={testPutio} />
            {testPutio === "loading" ? "Testing..." : testPutio === "success" ? "Connected!" : testPutio === "error" ? "Failed" : "Test Connection"}
          </button>
        </div>
      </div>

      {/* TMDb */}
      <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-accent" />
            TMDb API
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1.5">API Key</label>
            <input
              type="password"
              value={tmdbKey}
              onChange={(e) => setTmdbKey(e.target.value)}
              placeholder="Your TMDb API key"
              className="w-full bg-card border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
            />
            <p className="text-xs text-muted mt-1.5">
              Free key from{" "}
              <a
                href="https://www.themoviedb.org/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline inline-flex items-center gap-0.5"
              >
                themoviedb.org <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
          <button
            onClick={() => testConnection("tmdb")}
            disabled={!tmdbKey || testTmdb === "loading"}
            className="flex items-center gap-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-4 py-2 transition-colors disabled:opacity-40"
          >
            <StatusIcon status={testTmdb} />
            {testTmdb === "loading" ? "Testing..." : testTmdb === "success" ? "Connected!" : testTmdb === "error" ? "Failed" : "Test Connection"}
          </button>
        </div>
      </div>

      {/* Library Scan */}
      <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-accent" />
            Library Scan
          </h2>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-muted">
            Scan your Put.io files and match them with metadata from TMDb.
          </p>
          <button
            onClick={startScan}
            disabled={!putioToken || scanStatus === "loading"}
            className={cn(
              "flex items-center gap-2 text-sm font-medium rounded-lg px-4 py-2.5 transition-colors",
              scanStatus === "success"
                ? "bg-success/10 text-success border border-success/20"
                : scanStatus === "error"
                ? "bg-error/10 text-error border border-error/20"
                : "bg-accent hover:bg-accent-hover text-black disabled:opacity-40"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", scanStatus === "loading" && "animate-spin")} />
            {scanStatus === "loading"
              ? "Scanning..."
              : scanStatus === "success"
              ? `Scan started! Job: ${scanJobId?.slice(0, 8)}...`
              : scanStatus === "error"
              ? "Scan failed"
              : "Scan Library"}
          </button>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="bg-accent hover:bg-accent-hover text-black font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {message && (
          <span className="text-sm text-success">{message}</span>
        )}
      </div>

      {/* Sign out */}
      <div className="pt-4 border-t border-white/5">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-muted hover:text-error transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: StatusState }) {
  if (status === "success") return <CheckCircle2 className="w-4 h-4 text-success" />;
  if (status === "error") return <XCircle className="w-4 h-4 text-error" />;
  if (status === "loading") return <RefreshCw className="w-4 h-4 animate-spin" />;
  return null;
}
