chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ enabled: true });
});

chrome.action.onClicked.addListener(async (tab) => {
  const { enabled } = await chrome.storage.local.get('enabled');
  const newState = !enabled;
  
  await chrome.storage.local.set({ enabled: newState });
  
  updateActionUI(newState);
});

function updateActionUI(enabled) {
  const title = enabled ? "Désactiver le Correcteur Gemini" : "Activer le Correcteur Gemini";
  const badgeText = enabled ? "" : "OFF";
  const badgeColor = "#FF0000";

  chrome.action.setTitle({ title });
  chrome.action.setBadgeText({ text: badgeText });
  chrome.action.setBadgeBackgroundColor({ color: badgeColor });
}

// Ensure UI is correct on startup
chrome.storage.local.get('enabled').then(({ enabled }) => {
  updateActionUI(enabled !== false); // default to true
});
