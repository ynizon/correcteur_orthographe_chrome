// Premium Logic - Correcteur Gemini Nano - popup.js

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const blacklistBtn = document.getElementById('mode-blacklist-btn');
  const whitelistBtn = document.getElementById('mode-whitelist-btn');
  
  const currentDomainText = document.getElementById('current-domain-text');
  const currentStatusIndicator = document.getElementById('current-status-indicator');
  const currentStatusText = document.getElementById('current-status-text');
  
  const toggleCurrentSiteBtn = document.getElementById('toggle-current-site-btn');
  const toggleBtnIcon = document.getElementById('toggle-btn-icon');
  const toggleBtnText = document.getElementById('toggle-btn-text');
  
  const exceptionsTitle = document.getElementById('exceptions-title');
  const exceptionsCount = document.getElementById('exceptions-count');
  const exceptionsList = document.getElementById('exceptions-list');
  const emptyState = document.getElementById('empty-state');
  const emptyStateText = document.getElementById('empty-state-text');
  
  const manualDomainInput = document.getElementById('manual-domain-input');
  const addManualDomainBtn = document.getElementById('add-manual-domain-btn');
  
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');

  let currentHostname = '';
  let extensionMode = 'blacklist'; // 'blacklist' ou 'whitelist'
  let excludedDomains = []; // liste d'exceptions

  // Initialisation : Récupérer l'onglet actif et charger la configuration
  async function init() {
    await getActiveTabHost();
    await loadSettings();
    setupEventListeners();
  }

  // Obtenir le domaine de l'onglet actif
  async function getActiveTabHost() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs[0] && tabs[0].url) {
        const urlStr = tabs[0].url;
        if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
          const url = new URL(urlStr);
          currentHostname = url.hostname;
          currentDomainText.textContent = currentHostname;
        } else {
          currentHostname = '';
          currentDomainText.textContent = 'Non disponible (Page syst\u00e8me)';
          toggleCurrentSiteBtn.disabled = true;
          toggleCurrentSiteBtn.style.opacity = '0.5';
          toggleCurrentSiteBtn.style.cursor = 'not-allowed';
        }
      }
    } catch (e) {
      console.error("Erreur lors de la récupération de l'onglet actif :", e);
      currentHostname = '';
      currentDomainText.textContent = 'Non disponible';
      toggleCurrentSiteBtn.disabled = true;
    }
  }

  // Charger les paramètres depuis le stockage de Chrome
  async function loadSettings() {
    const data = await chrome.storage.local.get(['mode', 'domains']);
    extensionMode = data.mode || 'blacklist';
    excludedDomains = data.domains || [];
    renderUI();
  }

  // Vérifier la correspondance des domaines (avec sous-domaines)
  function isDomainMatch(currentHost, exceptionDomain) {
    if (!currentHost || !exceptionDomain) return false;
    const current = currentHost.toLowerCase();
    const target = exceptionDomain.toLowerCase();
    return current === target || current.endsWith('.' + target);
  }

  // Rendre l'interface utilisateur en fonction des données
  function renderUI() {
    // 1. Mettre à jour le sélecteur de mode
    if (extensionMode === 'blacklist') {
      blacklistBtn.classList.add('active');
      blacklistBtn.setAttribute('aria-checked', 'true');
      whitelistBtn.classList.remove('active');
      whitelistBtn.setAttribute('aria-checked', 'false');
      
      exceptionsTitle.textContent = 'Exceptions (Liste noire)';
      emptyStateText.textContent = 'Aucun site n\'est exclu pour le moment. L\'extension fonctionne partout.';
    } else {
      whitelistBtn.classList.add('active');
      whitelistBtn.setAttribute('aria-checked', 'true');
      blacklistBtn.classList.remove('active');
      blacklistBtn.setAttribute('aria-checked', 'false');
      
      exceptionsTitle.textContent = 'Exceptions (Liste blanche)';
      emptyStateText.textContent = 'Aucun site n\'est autoris\u00e9 pour le moment. L\'extension est inactive partout.';
    }

    // 2. Déterminer l'état du site actuel
    if (currentHostname) {
      const isExcluded = excludedDomains.some(d => isDomainMatch(currentHostname, d));
      const isActive = extensionMode === 'blacklist' ? !isExcluded : isExcluded;

      if (isActive) {
        currentStatusIndicator.className = 'status-indicator active';
        currentStatusText.textContent = 'Actif';
        toggleBtnIcon.textContent = '\ud83d\udeab';
        toggleBtnText.textContent = 'D\u00e9sactiver sur ce site';
      } else {
        currentStatusIndicator.className = 'status-indicator inactive';
        currentStatusText.textContent = 'D\u00e9sactiv\u00e9';
        toggleBtnIcon.textContent = '\u2728';
        toggleBtnText.textContent = 'Activer sur ce site';
      }
      toggleCurrentSiteBtn.disabled = false;
      toggleCurrentSiteBtn.style.opacity = '1';
      toggleCurrentSiteBtn.style.cursor = 'pointer';
    }

    // 3. Rendre la liste des exceptions
    renderExceptionsList();
  }

  // Rendre la liste des exceptions
  function renderExceptionsList() {
    exceptionsList.innerHTML = '';
    const query = searchInput.value.trim().toLowerCase();
    
    // Filtrer selon la recherche
    const filteredDomains = excludedDomains.filter(domain => domain.toLowerCase().includes(query));
    
    exceptionsCount.textContent = excludedDomains.length;

    if (filteredDomains.length === 0) {
      emptyState.style.display = 'flex';
      if (query) {
        emptyStateText.textContent = 'Aucun r\u00e9sultat trouv\u00e9 pour votre recherche.';
      } else {
        if (extensionMode === 'blacklist') {
          emptyStateText.textContent = 'Aucun site n\'est exclu. L\'extension est active partout.';
        } else {
          emptyStateText.textContent = 'Aucun site n\'est autoris\u00e9. L\'extension est inactive partout.';
        }
      }
    } else {
      emptyState.style.display = 'none';
      filteredDomains.forEach(domain => {
        const li = document.createElement('li');
        li.className = 'exception-item';
        
        const span = document.createElement('span');
        span.className = 'domain-name';
        span.textContent = domain;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.title = 'Supprimer ce domaine';
        deleteBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        `;
        
        deleteBtn.addEventListener('click', () => removeDomain(domain));
        
        li.appendChild(span);
        li.appendChild(deleteBtn);
        exceptionsList.appendChild(li);
      });
    }
  }

  // Nettoyer l'entrée utilisateur pour n'extraire que le domaine
  function cleanDomainInput(input) {
    let val = input.trim().toLowerCase();
    if (!val) return '';
    try {
      if (val.startsWith('http://') || val.startsWith('https://')) {
        return new URL(val).hostname;
      }
      if (val.includes('/') || val.includes('?')) {
        return new URL('https://' + val).hostname;
      }
    } catch (e) {}
    
    // Nettoyer les préfixes protocoles et www si rentrés manuellement
    val = val.replace(/^(https?:\/\/)?(www\.)?/, '');
    val = val.split('/')[0].split('?')[0];
    return val;
  }

  // Ajouter un domaine
  async function addDomain(domain) {
    const cleaned = cleanDomainInput(domain);
    if (!cleaned) return;
    
    // Valider le format de domaine simple (au moins un point)
    if (!cleaned.includes('.') || cleaned.length < 4) {
      alert("Veuillez saisir un domaine valide (ex: github.com).");
      return;
    }

    if (!excludedDomains.includes(cleaned)) {
      excludedDomains.push(cleaned);
      // Trier par ordre alphabétique pour plus de clarté
      excludedDomains.sort();
      await chrome.storage.local.set({ domains: excludedDomains });
      renderUI();
    } else {
      alert("Ce domaine est d\u00e9j\u00e0 enregistr\u00e9.");
    }
  }

  // Supprimer un domaine de la liste
  async function removeDomain(domain) {
    excludedDomains = excludedDomains.filter(d => d !== domain);
    await chrome.storage.local.set({ domains: excludedDomains });
    renderUI();
  }

  // Configurer tous les écouteurs d'événements
  function setupEventListeners() {
    // Boutons de bascule de Mode
    blacklistBtn.addEventListener('click', async () => {
      if (extensionMode !== 'blacklist') {
        extensionMode = 'blacklist';
        await chrome.storage.local.set({ mode: 'blacklist' });
        renderUI();
      }
    });

    whitelistBtn.addEventListener('click', async () => {
      if (extensionMode !== 'whitelist') {
        extensionMode = 'whitelist';
        await chrome.storage.local.set({ mode: 'whitelist' });
        renderUI();
      }
    });

    // Bouton de désactivation/activation sur le site actuel
    toggleCurrentSiteBtn.addEventListener('click', async () => {
      if (!currentHostname) return;
      
      const index = excludedDomains.indexOf(currentHostname);
      if (index === -1) {
        // Ajouter aux exceptions
        excludedDomains.push(currentHostname);
        excludedDomains.sort();
      } else {
        // Retirer des exceptions
        excludedDomains.splice(index, 1);
      }
      
      await chrome.storage.local.set({ domains: excludedDomains });
      renderUI();
    });

    // Ajout manuel d'exceptions
    addManualDomainBtn.addEventListener('click', () => {
      const domain = manualDomainInput.value;
      if (domain) {
        addDomain(domain);
        manualDomainInput.value = '';
      }
    });

    manualDomainInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const domain = manualDomainInput.value;
        if (domain) {
          addDomain(domain);
          manualDomainInput.value = '';
        }
      }
    });

    // Recherche en temps réel
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim();
      clearSearchBtn.style.display = query ? 'block' : 'none';
      renderExceptionsList();
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      renderExceptionsList();
    });
  }

  // Démarrer l'application
  init();
});
