console.log("🔍 Gemini Correcteur : Mode Dual-Button activé");

let isEnabled = true;
const originalTexts = new Map();

// Initialisation de l'état
chrome.storage.local.get('enabled', (result) => {
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
  document.querySelectorAll('textarea').forEach(textarea => {
    delete textarea.dataset.geminiId;
    delete textarea.dataset.geminiStatsId;
  });
}

// Icône de l'extension (Dictionnaire PNG base64)
const DICTIONARY_ICON = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAABz0lEQVR4nO3cMU7cQBiAUTZKBweIlNuEK6WCOnQ5EpwjJ0iZCuqkShMtEUI747G/98otMPJ8/B683r26AgAAAAAAAAAAAI7gNOtAX749/551rNX9+PV89vWf3z9NW4+/Po4+gIVf24eRP9zir29YABZ/H4YEYPHfZ4vzNnwP8K/Hu+vZh1zO56/nN4FbuPgEeK3ix7tri/8Gs6fA0E0g65sSgL/8dZkAcQKIE0CcAOIEECeAOAHECSBOAHECiBNAnADiBBAngDgBxE1/JOx/bh9etv4VLmYvz0CYAHECiBNA3FJ7gL1cN4/EBIgTQJwA4gQQJ4A4AcQJIE4AcQKIE0DcUreCvR08nwkQJ4A4AcQttQfYy3XzSEyAOAHECSBOAHECiBNAnADiBBAngDgBxC11K3jLt4Ort6FNgDgBxAkgbqk9QPU6vCUTIE4AcQKIE0CcAOIEECeAOAHECSBOAHECiBNAnADiBBAngDgBxAkgTgBxAogTQJwA4gQQJ4A4AcRNCeBI3wF8NCZA3MUDeLq/OZ17/fbhxSR4g9fO3yjTPxsogrUMuQTMrvgotjhvw/YAItiHoZtAEaxv+H8BT/c3JyEAAAAAAAAAAMAkfwBaSz9XyzzNhAAAAABJRU5ErkJggg==`;

async function getGeminiResponse(text) {
  try {
    let modelFactory = window.ai?.languageModel || navigator.ai?.languageModel || (typeof LanguageModel !== 'undefined' ? LanguageModel : null);
    if (!modelFactory) return null;
    const session = await modelFactory.create({
      systemPrompt: "Tu es un correcteur d'orthographe et de grammaire. Ta mission est de corriger le texte fourni. Tu dois impérativement renvoyer UNIQUEMENT le texte corrigé. Conserve exactement la même structure que l'original : ne rajoute aucun saut de ligne et n'en supprime aucun. Chaque ligne de l'original doit correspondre à une ligne dans ta réponse. Pas de commentaires, pas de préambule, pas de gras."
    });

    const prompt = `Corrige ce texte en gardant les sauts de ligne exactement aux mêmes endroits : "${text}"`;
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

function positionButtons(textarea, container, statsDiv) {
  const rect = textarea.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  container.style.left = (rect.right + scrollLeft - 70) + 'px';
  container.style.top = (rect.top + scrollTop + 5) + 'px';

  if (statsDiv) {
    statsDiv.style.left = (rect.left + scrollLeft) + 'px';
    statsDiv.style.top = (rect.bottom + scrollTop + 2) + 'px';
    statsDiv.style.width = rect.width + 'px';
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

function handleAIAction(textarea, aiBtn, toggleBtn, statsDiv) {
  const text = textarea.value.trim();
  if (!text) return;

  originalTexts.set(textarea, textarea.value);
  const originalLabel = aiBtn.innerHTML;
  aiBtn.innerHTML = '...';
  aiBtn.disabled = true;

  getGeminiResponse(text).then(corrected => {
    aiBtn.innerHTML = originalLabel;
    aiBtn.disabled = false;

    if (corrected && corrected.toLowerCase() !== text.toLowerCase()) {
      const mistakes = countMistakes(text, corrected);
      textarea.value = corrected;
      
      // Configuration du bouton Toggle
      toggleBtn.style.display = 'flex';
      toggleBtn.innerHTML = 'Avant';
      toggleBtn.title = 'Voir la version originale';
      
      statsDiv.innerHTML = `${mistakes} faute${mistakes > 1 ? 's' : ''} corrigée${mistakes > 1 ? 's' : ''}`;
      statsDiv.style.display = 'block';
      statsDiv.style.opacity = '1';
    }
  });
}

function injectButtons() {
  if (!isEnabled) return;
  document.querySelectorAll('textarea').forEach(textarea => {
    const containerId = textarea.dataset.geminiId;
    const statsId = textarea.dataset.geminiStatsId;

    if (containerId && statsId) {
      const existingContainer = document.getElementById(containerId);
      const existingStats = document.getElementById(statsId);
      if (existingContainer && existingStats) {
        positionButtons(textarea, existingContainer, existingStats);
      }
      return;
    }

    if (textarea.offsetWidth === 0) return;

    const id = 'gemini-container-' + Math.random().toString(36).substr(2, 9);
    const sid = 'gemini-stats-' + Math.random().toString(36).substr(2, 9);
    textarea.dataset.geminiId = id;
    textarea.dataset.geminiStatsId = sid;

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
      const currentText = textarea.value;
      const originalText = originalTexts.get(textarea);
      
      if (toggleBtn.innerHTML === 'Avant') {
        // On stocke la version corrigée avant de remettre l'originale
        textarea.dataset.geminiCorrected = currentText;
        textarea.value = originalText;
        toggleBtn.innerHTML = 'Après';
        toggleBtn.title = 'Voir la version corrigée';
        statsDiv.style.display = 'none'; // Cache les stats en mode "Avant"
      } else {
        textarea.value = textarea.dataset.geminiCorrected;
        toggleBtn.innerHTML = 'Avant';
        toggleBtn.title = 'Voir la version originale';
        statsDiv.style.display = 'block'; // Réaffiche les stats en mode "Après"
      }
    };

    aiBtn.onclick = (e) => {
      e.preventDefault();
      handleAIAction(textarea, aiBtn, toggleBtn, statsDiv);
    };

    container.appendChild(toggleBtn);
    container.appendChild(aiBtn);
    document.body.appendChild(container);
    document.body.appendChild(statsDiv);
    
    positionButtons(textarea, container, statsDiv);

    window.addEventListener('scroll', () => positionButtons(textarea, container, statsDiv), { passive: true });
    window.addEventListener('resize', () => positionButtons(textarea, container, statsDiv), { passive: true });
  });
}

setInterval(injectButtons, 1000);
injectButtons();
