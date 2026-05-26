console.log("🔍 Gemini Correcteur : Mode Dual-Button activé");

let isEnabled = true;
const originalTexts = new Map();

// Initialisation de l'état
chrome.storage.local.get('enabled').then((result) => {
  isEnabled = result.enabled !== false;
  if (isEnabled) {
    injectButtons();
  } else {
    removeButtons();
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    isEnabled = changes.enabled.newValue;
    if (isEnabled) {
      injectButtons();
    } else {
      removeButtons();
    }
  }
});

function removeButtons() {
  document.querySelectorAll('.gemini-btn-container, .gemini-stats').forEach(el => el.remove());
  document.querySelectorAll('textarea, [contenteditable="true"]').forEach(el => {
    delete el.dataset.geminiId;
    delete el.dataset.geminiStatsId;
    delete el.dataset.geminiCorrected;
    
    if (el._geminiResizeObserver) {
      el._geminiResizeObserver.disconnect();
      delete el._geminiResizeObserver;
    }
  });
}

// Icône de l'extension (Dictionnaire PNG base64)
const DICTIONARY_ICON = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAABz0lEQVR4nO3cMU7cQBiAUTZKBweIlNuEK6WCOnQ5EpwjJ0iZCuqkShMtEUI747G/98otMPJ8/B683r26AgAAAAAAAAAAAI7gNOtAX749/551rNX9+PV89vWf3z9NW4+/Po4+gIVf24eRP9zir29YABZ/H4YEYPHfZ4vzNnwP8K/Hu+vZh1zO56/nN4FbuPgEeK3ix7tri/8Gs6fA0E0g65sSgL/8dZkAcQKIE0CcAOIEECeAOAHECSBOAHECiBNAnADiBBAngDgBxE1/JOx/bh9etv4VLmYvz0CYAHECiBNA3FJ7gL1cN4/EBIgTQJwA4gQQJ4A4AcQJIE4AcQKIE0DcUreCvR08nwkQJ4A4AcQttQfYy3XzSEyAOAHECSBOAHECiBNAnADiBBAngDgBxC11K3jLt4Ort6FNgDgBxAkgbqk9QPU6vCUTIE4AcQKIE0CcAOIEECeAOAHECSBOAHECiBNAnADiBBAngDgBxAkgTgBxAogTQJwA4gQQJ4A4AcRNCeBI3wF8NCZA3MUDeLq/OZ17/fbhxSR4g9fO3yjTPxsogrUMuQTMrvgotjhvw/YAItiHoZtAEaxv+H8BT/c3JyEAAAAAAAAAAMAkfwBaSz9XyzzNhAAAAABJRU5ErkJggg==`;

async function getGeminiResponse(text) {
  try {
    let modelFactory = window.ai?.languageModel || navigator.ai?.languageModel || (typeof LanguageModel !== 'undefined' ? LanguageModel : null);
    if (!modelFactory) return null;
    const session = await modelFactory.create({
      systemPrompt: "Tu es un correcteur d'orthographe, de grammaire et de typographie. Ta mission est de corriger le texte fourni en veillant impérativement à ajouter une majuscule en début de chaque phrase et la ponctuation finale nécessaire (comme un point) si elle est manquante. Tu dois renvoyer UNIQUEMENT le texte corrigé. Conserve exactement la même structure que l'original : ne rajoute aucun saut de ligne et n'en supprime aucun. Chaque ligne de l'original doit correspondre à une ligne dans ta réponse. Pas de commentaires, pas de préambule, pas de gras."
    });

    const prompt = `Corrige l'orthographe, la grammaire, la typographie (majuscules en début de phrase et ponctuation de fin de phrase manquante) de ce texte en gardant les sauts de ligne exactement aux mêmes endroits : "${text}"`;
    const result = await session.prompt(prompt);
    if (session.destroy) session.destroy();
    return result.trim()
      .replace(/^\*\*.*?\*\*\s*/i, '')
      .replace(/^Voici la version corrigée\s*:\s*/i, '')
      .replace(/^Version corrigée\s*:\s*/i, '')
      .replace(/^"(.*)"$/, '$1')
      .trim();
  } catch (err) {
    return null;
  }
}

function getElementText(el) {
  if (el.tagName === 'TEXTAREA') {
    return el.value;
  }
  return getTextFromContentEditable(el);
}

function getTextFromContentEditable(el) {
  function walk(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.getAttribute('contenteditable') === 'false') {
        return '';
      }
      if (node.tagName === 'BR') {
        return '\n';
      }
    }
    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue;
    }
    
    let text = '';
    let isBlock = false;
    if (node.nodeType === Node.ELEMENT_NODE) {
      const display = window.getComputedStyle(node).display;
      if (display === 'block' || node.tagName === 'DIV' || node.tagName === 'P') {
        isBlock = true;
      }
    }
    
    for (let child of node.childNodes) {
      text += walk(child);
    }
    
    if (isBlock && text && !text.endsWith('\n')) {
      text += '\n';
    }
    
    return text;
  }
  
  return walk(el).trim();
}

function setElementText(el, text) {
  if (el.tagName === 'TEXTAREA') {
    el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    el.focus();
    try {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      selection.removeAllRanges();
      selection.addRange(range);
      
      if (!document.execCommand('insertText', false, text)) {
        el.innerText = text;
      }
    } catch (e) {
      console.error("Gemini Correcteur - Erreur lors de l'écriture dans le contenteditable :", e);
      el.innerText = text;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function positionButtons(el, container, statsDiv) {
  const parent = el.parentElement;
  if (!parent) return;

  const parentStyle = window.getComputedStyle(parent);
  if (parentStyle.position === 'static') {
    parent.style.position = 'relative';
  }

  const rect = el.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  
  const top = rect.top - parentRect.top;
  const right = parentRect.right - rect.right;
  const left = rect.left - parentRect.left;
  const width = rect.width;
  const height = rect.height;
  
  // Annuler toute propriété 'left' définie précédemment pour éviter les conflits
  container.style.left = 'auto';
  // Aligner précisément le conteneur à 8px du bord droit de l'élément cible
  container.style.right = (right + 8) + 'px';
  container.style.top = (top + 5) + 'px';

  if (statsDiv) {
    statsDiv.style.left = left + 'px';
    statsDiv.style.top = (top + height + 2) + 'px';
    statsDiv.style.width = width + 'px';
  }
}

function countMistakes(original, corrected) {
  const originalWords = original.trim().split(/\s+/);
  const correctedWords = corrected.trim().split(/\s+/);
  let mistakes = 0;
  const maxLen = Math.max(originalWords.length, correctedWords.length);
  for (let i = 0; i < maxLen; i++) {
    if (originalWords[i] !== correctedWords[i]) mistakes++;
  }
  return mistakes;
}

function handleAIAction(el, aiBtn, toggleBtn, statsDiv) {
  const text = getElementText(el);
  if (!text) return;

  originalTexts.set(el, text);
  const originalLabel = aiBtn.innerHTML;
  aiBtn.innerHTML = '...';
  aiBtn.disabled = true;

  getGeminiResponse(text).then(corrected => {
    aiBtn.innerHTML = originalLabel;
    aiBtn.disabled = false;

    if (corrected && corrected.toLowerCase() !== text.toLowerCase()) {
      const mistakes = countMistakes(text, corrected);
      setElementText(el, corrected);
      
      // Configuration du bouton Toggle
      toggleBtn.style.display = 'flex';
      toggleBtn.innerHTML = 'Avant';
      toggleBtn.title = 'Voir la version originale';
      
      statsDiv.innerHTML = `${mistakes} faute${mistakes > 1 ? 's' : ''} corrigée${mistakes > 1 ? 's' : ''}`;
      statsDiv.style.display = 'block';
      statsDiv.style.opacity = '1';
      
      // Repositionner les boutons après modification de la hauteur du contenu
      positionButtons(el, toggleBtn.parentElement, statsDiv);
    }
  });
}

function injectButtons() {
  if (!isEnabled) return;
  document.querySelectorAll('textarea, [contenteditable="true"]').forEach(el => {
    // Ne pas afficher si l'attribut name est 'q'
    if (el.getAttribute('name') === 'q') {
      const containerId = el.dataset.geminiId;
      const statsId = el.dataset.geminiStatsId;
      if (containerId) {
        document.getElementById(containerId)?.remove();
        delete el.dataset.geminiId;
      }
      if (statsId) {
        document.getElementById(statsId)?.remove();
        delete el.dataset.geminiStatsId;
      }
      delete el.dataset.geminiCorrected;
      if (el._geminiResizeObserver) {
        el._geminiResizeObserver.disconnect();
        delete el._geminiResizeObserver;
      }
      return;
    }

    // Ignorer les éléments internes de notre propre interface
    if (el.classList.contains('gemini-btn') || el.classList.contains('gemini-stats') || el.classList.contains('gemini-btn-container')) {
      return;
    }

    const containerId = el.dataset.geminiId;
    const statsId = el.dataset.geminiStatsId;

    if (containerId && statsId) {
      const existingContainer = document.getElementById(containerId);
      const existingStats = document.getElementById(statsId);
      if (existingContainer && existingStats) {
        positionButtons(el, existingContainer, existingStats);
      }
      return;
    }

    if (el.offsetWidth === 0) return;

    const id = 'gemini-container-' + Math.random().toString(36).substr(2, 9);
    const sid = 'gemini-stats-' + Math.random().toString(36).substr(2, 9);
    el.dataset.geminiId = id;
    el.dataset.geminiStatsId = sid;

    const container = document.createElement('div');
    container.id = id;
    container.className = 'gemini-btn-container';
    
    const statsDiv = document.createElement('div');
    statsDiv.id = sid;
    statsDiv.className = 'gemini-stats';
    statsDiv.style.display = 'none';

    // Bouton IA
    const aiBtn = document.createElement('button');
    aiBtn.className = 'gemini-btn gemini-ai-btn';
    aiBtn.innerHTML = `<img src="${DICTIONARY_ICON}" width="16" height="16" style="margin-right:4px"> Corriger`;
    aiBtn.title = 'Corriger avec Gemini';

    // Bouton Toggle (Avant/Après)
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'gemini-btn gemini-toggle-btn';
    toggleBtn.innerHTML = 'Avant';
    toggleBtn.title = 'Voir la version originale';
    toggleBtn.style.display = 'none';

    toggleBtn.onclick = (e) => {
      e.preventDefault();
      const currentText = getElementText(el);
      const originalText = originalTexts.get(el);
      
      if (toggleBtn.innerHTML === 'Avant') {
        // On stocke la version corrigée avant de remettre l'originale
        el.dataset.geminiCorrected = currentText;
        setElementText(el, originalText);
        toggleBtn.innerHTML = 'Après';
        toggleBtn.title = 'Voir la version corrigée';
        statsDiv.style.display = 'none'; // Cache les stats en mode "Avant"
      } else {
        setElementText(el, el.dataset.geminiCorrected);
        toggleBtn.innerHTML = 'Avant';
        toggleBtn.title = 'Voir la version originale';
        statsDiv.style.display = 'block'; // Réaffiche les stats en mode "Après"
      }
      
      // Repositionner les boutons après modification de la hauteur
      positionButtons(el, container, statsDiv);
    };

    aiBtn.onclick = (e) => {
      e.preventDefault();
      handleAIAction(el, aiBtn, toggleBtn, statsDiv);
    };

    container.appendChild(toggleBtn);
    container.appendChild(aiBtn);
    
    const parent = el.parentElement;
    if (parent) {
      parent.appendChild(container);
      parent.appendChild(statsDiv);
      
      positionButtons(el, container, statsDiv);

      // Utiliser ResizeObserver pour adapter dynamiquement la position et taille lors du redimensionnement
      try {
        const resizeObserver = new ResizeObserver(() => {
          positionButtons(el, container, statsDiv);
        });
        resizeObserver.observe(el);
        el._geminiResizeObserver = resizeObserver;
      } catch (e) {
        window.addEventListener('resize', () => positionButtons(el, container, statsDiv), { passive: true });
      }
    }
  });
}

setInterval(injectButtons, 1000);
injectButtons();
