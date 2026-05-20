# 🔍 Correcteur Gemini Nano

[![Version](https://img.shields.io/badge/version-1.0-blue.svg)](https://www.gameandme.fr)
[![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![AI](https://img.shields.io/badge/AI-Gemini_Nano-orange.svg)](https://developer.chrome.com/docs/ai/built-in-ai)

**Correcteur Gemini Nano** est une extension de navigateur moderne qui intègre l'intelligence artificielle directement dans vos champs de saisie. Elle utilise **Gemini Nano**, le modèle de langage ultra-léger de Google, s'exécutant localement dans votre navigateur pour une correction orthographique et grammaticale instantanée et privée.

---

## ✨ Points Forts

- 🔒 **Confidentialité Totale** : Aucune donnée ne quitte votre ordinateur. La correction est effectuée localement via l'API `window.ai`.
- 🚀 **Performance Native** : Latence quasi nulle grâce à l'exécution on-device.
- 🔄 **Comparateur Intelligent** : Basculez entre la version originale et corrigée d'un clic pour garder le contrôle.
- 📊 **Feedback Visuel** : Affichage précis du nombre de fautes corrigées directement sous le champ de saisie.
- 🛠️ **Injection Dynamique** : Compatible avec les sites web modernes (React, Vue, etc.) grâce à une détection active des champs `textarea`.

---

## 🛠️ Configuration Requise (API Expérimentale)

Cette extension utilise les fonctionnalités de l'IA intégrée ("Built-in AI") de Google Chrome.

### Activation de Gemini Nano :
1.  **Flags Chrome** :
    *   `chrome://flags/#optimization-guide-on-device-model` → **Enabled BypassPrefRequirement**
    *   `chrome://flags/#prompt-api-for-gemini-nano` → **Enabled**
2.  **Mise à jour du modèle** :
    *   Allez sur `chrome://components/`
    *   Cherchez **Optimization Guide On Device Model**
    *   Cliquez sur **Check for update** (attendez la fin du téléchargement, ~1.5 Go).
3.  **Redémarrage** : Relancez complètement votre navigateur.

---

## 📦 Installation

1.  Téléchargez ou clonez ce dépôt.
2.  Rendez-vous sur `chrome://extensions/`.
3.  Activez le **Mode développeur**.
4.  Cliquez sur **Charger l'extension dépaquetée** et sélectionnez le dossier du projet.

---

## 🖥️ Utilisation

L'extension ajoute automatiquement deux boutons en haut à droite de chaque `textarea` :

1.  **Corriger** (Bouton Bleu) : Lance l'analyse IA et remplace le texte.
2.  **Avant/Après** (Bouton Orange) : Apparaît après une correction pour vous permettre de comparer les modifications.

Un bandeau d'information bleu sous le champ vous indiquera le nombre de fautes traitées.

---

## ⚙️ Détails Techniques

- **Moteur** : Gemini Nano via `navigator.ai.languageModel`.
- **Système de Prompt** : Utilise un `systemPrompt` strict pour garantir que seule la correction est renvoyée, sans bavardage de l'IA.
- **UI** : Boutons injectés en `position: absolute` avec un `z-index` élevé pour garantir la visibilité sur tous les sites.
- **Monitoring** : Intervalle de scrutation d'une seconde pour supporter le chargement asynchrone des formulaires.

---

## 📄 Licence

Ce projet est sous licence MIT.

---

**Développé par [Yohann Nizon](https://www.gameandme.fr)**
