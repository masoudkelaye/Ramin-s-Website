// api/submit-review.js
// Public endpoint — lets customers submit a review directly from the
// website. No password required (this is meant to be public); the
// business owner can edit or remove any review afterwards from /admin.
//
// Spam protection here is basic: a honeypot field + length limits.
// This is not a CAPTCHA. For a small local business this is usually
// enough, but if spam becomes a problem, this endpoint should be
// switched to a moderation queue instead of publishing immediately.

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

function clean(str, max) {
  return String(str || "").trim().slice(0, max);
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
    return res.status(500).json({ error: "Server nicht konfiguriert." });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

  // Honeypot — a hidden field real visitors never fill in.
  if (body.website) {
    return res.status(200).json({ ok: true });
  }

  const name = clean(body.name, 60);
  const role = clean(body.role, 60);
  const quote = clean(body.quote, 500);
  const rating = Math.max(1, Math.min(5, parseInt(body.rating, 10) || 5));

  if (name.length < 2 || quote.length < 5) {
    return res.status(400).json({ error: "Bitte Name und Bewertungstext ausfüllen." });
  }

  try {
    const existing = await githubRequest(`/repos/${repo}/contents/${FILE_PATH}?ref=${branch}`);
    const current = JSON.parse(Buffer.from(existing.content, "base64").toString("utf-8"));
    const testimonials = Array.isArray(current.testimonials) ? current.testimonials : [];

    testimonials.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      role,
      rating,
      quote,
      createdAt: new Date().toISOString(),
    });

    const updated = Object.assign({}, current, { testimonials });
    const encoded = Buffer.from(JSON.stringify(updated, null, 2), "utf-8").toString("base64");

    await githubRequest(`/repos/${repo}/contents/${FILE_PATH}`, {
      method: "PUT",
      body: JSON.stringify({
        message: `New customer review from ${name}`,
        content: encoded,
        branch,
        sha: existing.sha,
      }),
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
};
