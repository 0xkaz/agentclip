// Service worker: context menu -> stash the selection -> open a confirm window.

const MENU_ID = "agentclip-save";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Save to AgentClip",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  await chrome.storage.session.set({
    pending: {
      content: info.selectionText ?? "",
      source_url: tab?.url ?? "",
      title: tab?.title ?? "",
    },
  });
  await chrome.windows.create({
    url: chrome.runtime.getURL("confirm.html"),
    type: "popup",
    width: 480,
    height: 420,
  });
});
