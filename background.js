// Initialisation des valeurs par défaut lors de l'installation
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['mode', 'domains']);
  if (data.mode === undefined) {
    await chrome.storage.local.set({ mode: 'blacklist' });
  }
  if (data.domains === undefined) {
    await chrome.storage.local.set({ domains: [] });
  }
});

// Helper pour vérifier la correspondance des domaines (avec sous-domaines)
function isDomainMatch(currentHost, exceptionDomain) {
  if (!currentHost || !exceptionDomain) return false;
  const current = currentHost.toLowerCase();
  const target = exceptionDomain.toLowerCase();
  return current === target || current.endsWith('.' + target);
}

// Détermine si l'extension est active pour un hôte donné
function checkEnabled(mode, domains, hostname) {
  if (!hostname) return false;
  const isExcluded = domains.some(d => isDomainMatch(hostname, d));
  if (mode === 'whitelist') {
    return isExcluded; // En mode whitelist, actif uniquement si présent dans la liste
  } else {
    return !isExcluded; // En mode blacklist, actif si absent de la liste (par défaut)
  }
}

// Extrait proprement l'hôte depuis l'URL
function getHostFromUrl(urlStr) {
  try {
    if (!urlStr) return '';
    if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) return '';
    const url = new URL(urlStr);
    return url.hostname;
  } catch (e) {
    return '';
  }
}

// Met à jour l'icône, le badge et le titre de l'action de l'extension pour un onglet donné
async function updateTabState(tabId, url) {
  if (!tabId) return;

  const hostname = getHostFromUrl(url);
  
  // Si ce n'est pas une page web supportée (ex: chrome://, about:blank, etc.)
  if (!hostname) {
    chrome.action.setBadgeText({ text: 'N/A', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#9CA3AF', tabId }); // Gris
    chrome.action.setTitle({ 
      title: "Correcteur Gemini Nano - Non disponible sur cette page", 
      tabId 
    });
    return;
  }

  const { mode = 'blacklist', domains = [] } = await chrome.storage.local.get(['mode', 'domains']);
  const isActive = checkEnabled(mode, domains, hostname);

  if (isActive) {
    chrome.action.setBadgeText({ text: 'ON', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#10B981', tabId }); // Vert émeraude
    chrome.action.setTitle({ 
      title: `Correcteur Gemini Nano (Actif sur ${hostname})`, 
      tabId 
    });
  } else {
    chrome.action.setBadgeText({ text: 'OFF', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#EF4444', tabId }); // Rouge rose
    chrome.action.setTitle({ 
      title: `Correcteur Gemini Nano (D\u00e9sactiv\u00e9 sur ${hostname})`, 
      tabId 
    });
  }
}

// Écouteur de changement d'onglet actif
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
      await updateTabState(activeInfo.tabId, tab.url);
    }
  } catch (e) {
    // Ignorer les erreurs d'onglets non accessibles
  }
});

// Écouteur de mise à jour d'onglet (navigation, rechargement)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab && tab.url) {
    await updateTabState(tabId, tab.url);
  }
});

// Écouteur des modifications du stockage local pour rafraîchir tous les onglets actifs en temps réel
chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.mode || changes.domains) {
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id && tab.url) {
          await updateTabState(tab.id, tab.url);
        }
      }
    } catch (e) {
      console.error("Erreur lors de la mise \u00e0 jour des onglets suite \u00e0 un changement de stockage :", e);
    }
  }
});
