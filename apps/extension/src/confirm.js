// Confirm/edit screen: load the pending selection, let the user edit, then POST.

const $ = (id) => document.getElementById(id);

async function load() {
  const { pending } = await chrome.storage.session.get("pending");
  if (pending) {
    $("content").value = pending.content ?? "";
    $("title").value = pending.title ?? "";
    $("source").value = pending.source_url ?? "";
  }
  $("content").focus();
}

async function save() {
  const { apiBase, token } = await chrome.storage.local.get(["apiBase", "token"]);
  if (!apiBase || !token) {
    $("status").textContent = "Set API base + token in the extension options first.";
    return;
  }
  $("save").disabled = true;
  $("status").textContent = "Saving…";
  try {
    const res = await fetch(`${apiBase.replace(/\/$/, "")}/api/snippets`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        content: $("content").value,
        title: $("title").value.trim() || undefined,
        source_url: $("source").value.trim() || undefined,
        tags: $("tags").value.trim() || undefined,
        encrypted: $("encrypted").checked,
      }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    $("status").textContent = "Saved.";
    setTimeout(() => window.close(), 600);
  } catch (e) {
    $("status").textContent = `Error: ${e.message}`;
    $("save").disabled = false;
  }
}

$("save").addEventListener("click", save);
$("cancel").addEventListener("click", () => window.close());
load();
