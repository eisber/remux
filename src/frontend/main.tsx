import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initSnapfeed } from "@microsoft/snapfeed";
import "@xterm/xterm/css/xterm.css";
import "./styles/app.css";

const GITHUB_CLIENT_ID = "Ov23ctnKbEALA3WUk14j";

async function githubDeviceFlow(): Promise<string | null> {
  try {
    // Use server proxy to avoid CORS (GitHub doesn't allow browser requests).
    const codeResp = await fetch("/api/auth/github/device-code", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, scope: "public_repo" }),
    });
    const codeData = await codeResp.json() as {
      device_code: string; user_code: string; verification_uri: string; interval: number;
    };

    const ok = window.confirm(
      `To send feedback as a GitHub issue, authorize remux:\n\n` +
      `1. Go to: ${codeData.verification_uri}\n` +
      `2. Enter code: ${codeData.user_code}\n\nClick OK after you've authorized.`
    );
    if (!ok) return null;

    const interval = (codeData.interval || 5) * 1000;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, interval));
      const resp = await fetch("/api/auth/github/access-token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          device_code: codeData.device_code,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        }),
      });
      const data = await resp.json() as { access_token?: string; error?: string };
      if (data.access_token) {
        fetch("/api/auth/github-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: data.access_token }),
        }).catch(() => {});
        localStorage.setItem("remux-github-token", data.access_token);
        return data.access_token;
      }
      if (data.error === "authorization_pending") continue;
      if (data.error === "slow_down") { await new Promise((r) => setTimeout(r, 5000)); continue; }
      break;
    }
  } catch (err) { console.error("GitHub device flow failed:", err); }
  return null;
}

/** Custom adapter that lazily triggers Device Flow on first feedback. */
function lazyGithubAdapter(): { name: string; send: (event: Record<string, unknown>) => Promise<{ ok: boolean; error?: string; deliveryId?: string }> } {
  return {
    name: "github-device-flow",
    async send(event) {
      let token = localStorage.getItem("remux-github-token");

      // Try server-side storage.
      if (!token) {
        try {
          const resp = await fetch("/api/auth/github-token");
          const data = await resp.json() as { token: string | null };
          if (data.token) {
            token = data.token;
            localStorage.setItem("remux-github-token", token);
          }
        } catch {}
      }

      // Trigger Device Flow if still no token.
      if (!token) {
        token = await githubDeviceFlow();
        if (!token) return { ok: false, error: "User cancelled GitHub authorization" };
      }

      // Create issue via GitHub API.
      const message = String(event.message ?? event.label ?? "Feedback");
      const category = String(event.category ?? "feedback");
      const page = String(event.page ?? window.location.href);
      const labels = ["feedback"];
      const categoryMap: Record<string, string> = { bug: "bug", idea: "enhancement", question: "question" };
      if (categoryMap[category]) labels.push(categoryMap[category]);

      const body = [
        `**Category:** ${category}`,
        `**Page:** ${page}`,
        `**Time:** ${new Date().toISOString()}`,
        "",
        message,
        "",
        event.screenshot ? `![screenshot](${event.screenshot})` : "",
      ].filter(Boolean).join("\n");

      const resp = await fetch("https://api.github.com/repos/eisber/remux/issues", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          title: `[Feedback] ${message.substring(0, 80)}`,
          body,
          labels,
        }),
      });

      if (!resp.ok) {
        if (resp.status === 401) {
          localStorage.removeItem("remux-github-token");
          fetch("/api/auth/github-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: "" }),
          }).catch(() => {});
        }
        return { ok: false, error: `GitHub API ${resp.status}` };
      }

      const issue = await resp.json() as { number?: number };
      return { ok: true, deliveryId: String(issue.number ?? "") };
    },
  };
}

initSnapfeed({
  endpoint: "/api/telemetry/events",
  trackClicks: true, trackNavigation: true, trackErrors: true,
  trackApiErrors: true, captureConsoleErrors: true,
  feedback: {
    enabled: true, screenshotMaxWidth: 1200, screenshotQuality: 0.6,
    annotations: true, allowContextToggle: true, allowScreenshotToggle: true,
    defaultIncludeContext: true, defaultIncludeScreenshot: true,
  },
  adapters: [lazyGithubAdapter() as never],
});

createRoot(document.getElementById("root")!).render(<App />);
