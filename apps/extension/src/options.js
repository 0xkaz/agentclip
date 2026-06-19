const $ = (id) => document.getElementById(id);
const DEFAULT_BASE = "https://agentclip.0xkaz.com";

function dashUrl() {
  return ($("apiBase").value.trim() || DEFAULT_BASE).replace(/\/$/, "");
}

chrome.storage.local.get(["apiBase", "token"]).then(({ apiBase, token }) => {
  if (apiBase) $("apiBase").value = apiBase;
  if (token) $("token").value = token;
  $("dash").href = dashUrl();
});

$("apiBase").addEventListener("input", () => ($("dash").href = dashUrl()));

$("save").addEventListener("click", async () => {
  await chrome.storage.local.set({
    apiBase: $("apiBase").value.trim() || DEFAULT_BASE,
    token: $("token").value.trim(),
  });
  $("dash").href = dashUrl();
  $("status").textContent = "Saved.";
  $("status").style.color = "#16a34a";
  setTimeout(() => ($("status").textContent = ""), 1500);
});

// Quick connectivity/auth check.
$("test").addEventListener("click", async () => {
  const base = dashUrl();
  const token = $("token").value.trim();
  if (!token) {
    $("status").textContent = "Enter a token first.";
    $("status").style.color = "#dc2626";
    return;
  }
  $("status").textContent = "Testing…";
  $("status").style.color = "#475569";
  try {
    const res = await fetch(`${base}/api/snippets?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      $("status").textContent = "✓ Connected — token works.";
      $("status").style.color = "#16a34a";
    } else {
      $("status").textContent = `✗ ${res.status} — check URL/token.`;
      $("status").style.color = "#dc2626";
    }
  } catch (e) {
    $("status").textContent = `✗ ${e.message}`;
    $("status").style.color = "#dc2626";
  }
});
