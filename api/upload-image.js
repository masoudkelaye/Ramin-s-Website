// api/upload-image.js
// Replaces one image (hero.jpg or gallery-01.jpg .. gallery-10.jpg) by
// committing the new file to assets/img/ in the GitHub repo.
// Uses the same environment variables as api/content.js.

const GITHUB_API = "https://api.github.com";
const ALLOWED_FILENAME = /^(hero|gallery-(0[1-9]|1[0-3]))\.(jpg|jpeg|png|webp)$/i;

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
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  if (!repo || !process.env.GITHUB_TOKEN) {
    return res.status(500).json({ error: "Server nicht konfiguriert (GITHUB_TOKEN/GITHUB_REPO fehlt)." });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const { password, filename, base64 } = body;

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Falsches Passwort." });
  }
  if (!filename || !base64 || !ALLOWED_FILENAME.test(filename)) {
    return res.status(400).json({ error: "Ungültiger Dateiname. Erlaubt: hero.jpg, gallery-01.jpg … gallery-10.jpg" });
  }

  const filePath = `assets/img/${filename}`;

  try {
    let sha;
    try {
      const existing = await githubRequest(`/repos/${repo}/contents/${filePath}?ref=${branch}`);
      sha = existing.sha;
    } catch (e) {
      if (e.status !== 404) throw e;
    }

    const result = await githubRequest(`/repos/${repo}/contents/${filePath}`, {
      method: "PUT",
      body: JSON.stringify({
        message: `Update image ${filename} via admin panel`,
        content: base64,
        branch,
        ...(sha ? { sha } : {}),
      }),
    });

    return res.status(200).json({ ok: true, commit: result.commit && result.commit.sha });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
};
