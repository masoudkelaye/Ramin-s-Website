// api/content.js
// GET  → returns the current data/content.json from the repo (public, read-only).
// POST → verifies the admin password, then commits an updated content.json
//        straight to GitHub. Vercel picks up that commit and redeploys
//        automatically, so the live site updates within ~30-60 seconds.
//
// Required Vercel Environment Variables (Project → Settings → Environment Variables):
//   GITHUB_TOKEN   — fine-grained token, "Contents: Read and write" on this repo only
//   GITHUB_REPO    — e.g. "masoudkelaye/Ramin-s-Website"
//   GITHUB_BRANCH  — e.g. "main"
//   ADMIN_PASSWORD — the password used to log into /admin

const GITHUB_API = "https://api.github.com";
const FILE_PATH = "data/content.json";

async function githubRequest(path, options = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "ramin-admin-panel",
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `GitHub API error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!repo || !process.env.GITHUB_TOKEN) {
    return res.status(500).json({ error: "Server nicht konfiguriert (GITHUB_TOKEN/GITHUB_REPO fehlt)." });
  }

  if (req.method === "GET") {
    try {
      const file = await githubRequest(`/repos/${repo}/contents/${FILE_PATH}?ref=${branch}`);
      const content = Buffer.from(file.content, "base64").toString("utf-8");
      return res.status(200).json(JSON.parse(content));
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.message });
    }
  }

  if (req.method === "POST") {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { password, content } = body;

    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Falsches Passwort." });
    }
    if (!content) {
      return res.status(400).json({ error: "Kein Inhalt übergeben." });
    }

    try {
      let sha;
      try {
        const existing = await githubRequest(`/repos/${repo}/contents/${FILE_PATH}?ref=${branch}`);
        sha = existing.sha;
      } catch (e) {
        if (e.status !== 404) throw e;
      }

      const encoded = Buffer.from(JSON.stringify(content, null, 2), "utf-8").toString("base64");
      const result = await githubRequest(`/repos/${repo}/contents/${FILE_PATH}`, {
        method: "PUT",
        body: JSON.stringify({
          message: "Update site content via admin panel",
          content: encoded,
          branch,
          ...(sha ? { sha } : {}),
        }),
      });

      return res.status(200).json({ ok: true, commit: result.commit && result.commit.sha });
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
