import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initSnapfeed } from "@microsoft/snapfeed";
import { githubAdapter } from "@microsoft/snapfeed/adapters";
import "@xterm/xterm/css/xterm.css";
import "./styles/app.css";

const GITHUB_CLIENT_ID = "Ov23ctnKbEALA3WUk14j";

async function githubDeviceFlow(): Promise<string | null> {
  try {
    const codeResp = await fetch("https://github.com/login/device/code", {
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
      const resp = await fetch("https://github.com/login/oauth/access_token", {
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

async function getGitHubToken(): Promise<string> {
  const stored = localStorage.getItem("remux-github-token");
  if (stored) return stored;
  try {
    const resp = await fetch("/api/auth/github-token");
    const data = await resp.json() as { token: string | null };
    if (data.token) { localStorage.setItem("remux-github-token", data.token); return data.token; }
  } catch {}
  return "";
}

getGitHubToken().then((token) => {
  initSnapfeed({
    endpoint: "/api/telemetry/events",
    trackClicks: true, trackNavigation: true, trackErrors: true,
    trackApiErrors: true, captureConsoleErrors: true,
    feedback: {
      enabled: true, screenshotMaxWidth: 1200, screenshotQuality: 0.6,
      annotations: true, allowContextToggle: true, allowScreenshotToggle: true,
      defaultIncludeContext: true, defaultIncludeScreenshot: true,
    },
    adapters: [
      githubAdapter({
        token: token || "pending",
        owner: "eisber", repo: "remux", labels: ["feedback"],
        categoryLabels: { bug: "bug", idea: "enhancement", question: "question" },
      }),
    ],
  });
});

createRoot(document.getElementById("root")!).render(<App />);
