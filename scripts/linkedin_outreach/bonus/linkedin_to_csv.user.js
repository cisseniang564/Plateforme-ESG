// ==UserScript==
// @name         ESG Flow — LinkedIn to CSV
// @namespace    https://greenconnect.cloud/
// @version      1.0
// @description  Ajoute un bouton "Copier CSV" sur chaque profil LinkedIn — extrait prénom, nom, entreprise, URL.
// @author       ESG Flow
// @match        https://www.linkedin.com/in/*
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

/*
 * INSTALLATION
 * ────────────
 * 1. Installer l'extension Tampermonkey (Chrome / Firefox / Safari) :
 *    https://www.tampermonkey.net/
 *
 * 2. Ouvrir le dashboard Tampermonkey → onglet "+" (nouveau script)
 *
 * 3. Coller ce fichier complet, sauvegarder (Cmd+S / Ctrl+S)
 *
 * 4. Activer le script (toggle vert dans le dashboard)
 *
 * UTILISATION
 * ───────────
 * 1. Va sur n'importe quel profil LinkedIn (https://www.linkedin.com/in/...)
 *
 * 2. Un bouton vert "📋 CSV" apparaît en bas à droite
 *
 * 3. Clique → la ligne CSV est copiée dans le presse-papier au format :
 *
 *    first_name,last_name,company,linkedin_url,role,size,sector,csrd_wave,trigger
 *
 *    Exemple : "Marie","Lefèvre","Acme Food","https://...","RSE",,,,,
 *
 * 4. Colle dans data/prospects.csv (puis complète role/size/sector/csrd_wave/trigger)
 *
 * 5. Lance `python outreach.py drafts` pour générer les messages
 *
 * LIMITES
 * ───────
 * - LinkedIn change sa structure HTML régulièrement → si le bouton arrête de
 *   marcher, mets à jour les sélecteurs ci-dessous (cherche "SELECTORS").
 * - Le script ne récupère pas l'entreprise actuelle si elle n'est pas affichée
 *   dans le headline (utilise la section "Expérience" comme fallback).
 * - Ne récupère PAS l'email (impossible côté client) → utiliser Snov.io ensuite.
 */

(function () {
  'use strict';

  // ── SELECTORS — à mettre à jour si LinkedIn change sa structure ───────────
  const SELECTORS = {
    name: 'h1.text-heading-xlarge, h1[class*="heading-xlarge"]',
    headline: 'div.text-body-medium, div[class*="text-body-medium"]:not(:empty)',
    experienceCompany: 'section[id*="experience"] a[href*="/company/"] span[aria-hidden="true"]',
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  function text(el) {
    return el ? el.textContent.trim().replace(/\s+/g, ' ') : '';
  }

  function escapeCsv(value) {
    if (value == null) return '';
    const s = String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function extract() {
    const nameEl = document.querySelector(SELECTORS.name);
    const headlineEl = document.querySelector(SELECTORS.headline);
    const expCompanyEl = document.querySelector(SELECTORS.experienceCompany);

    const fullName = text(nameEl);
    const parts = fullName.split(' ');
    const firstName = parts.shift() || '';
    const lastName = parts.join(' ');

    // The headline is often "Title at Company" or "Title chez Company" (FR).
    const headline = text(headlineEl);
    let company = '';
    if (/ chez | at | @ /i.test(headline)) {
      company = headline.split(/ chez | at | @ /i)[1] || '';
      company = company.split(/[·|]/)[0].trim();
    }
    // Fallback to first company in Experience section.
    if (!company && expCompanyEl) {
      company = text(expCompanyEl);
    }

    // Clean LinkedIn URL (drop tracking params).
    const url = window.location.href.split('?')[0].replace(/\/$/, '');

    return { firstName, lastName, company, url };
  }

  function buildCsvRow({ firstName, lastName, company, url }) {
    // Header expected by outreach.py:
    // first_name,last_name,company,linkedin_url,role,size,sector,csrd_wave,trigger
    return [
      escapeCsv(firstName),
      escapeCsv(lastName),
      escapeCsv(company),
      escapeCsv(url),
      '', // role (to fill manually: RSE / DAF / Risk / DG / CSO)
      '', // size
      '', // sector
      '', // csrd_wave
      '', // trigger
    ].join(',');
  }

  function flash(button, message, color) {
    const original = button.innerHTML;
    button.innerHTML = message;
    button.style.background = color;
    setTimeout(() => {
      button.innerHTML = original;
      button.style.background = '#10b981';
    }, 1800);
  }

  // ── UI button ──────────────────────────────────────────────────────────────
  function mountButton() {
    if (document.getElementById('esgflow-csv-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'esgflow-csv-btn';
    btn.innerHTML = '📋 CSV';
    btn.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      padding: 12px 18px;
      background: #10b981;
      color: white;
      border: none;
      border-radius: 999px;
      font-family: -apple-system, system-ui, sans-serif;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(16,185,129,0.35);
      transition: transform 0.15s, box-shadow 0.15s;
    `;
    btn.onmouseenter = () => {
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = '0 14px 30px rgba(16,185,129,0.45)';
    };
    btn.onmouseleave = () => {
      btn.style.transform = '';
      btn.style.boxShadow = '0 10px 25px rgba(16,185,129,0.35)';
    };

    btn.addEventListener('click', () => {
      try {
        const data = extract();
        if (!data.firstName || !data.lastName) {
          flash(btn, '⚠ Nom introuvable', '#ef4444');
          console.warn('[ESG Flow] Could not extract name', data);
          return;
        }
        const row = buildCsvRow(data);
        // GM_setClipboard works without focus issues; fallback to writeText.
        if (typeof GM_setClipboard === 'function') {
          GM_setClipboard(row, 'text');
        } else {
          navigator.clipboard.writeText(row);
        }
        flash(btn, '✓ Copié !', '#059669');
        console.log('[ESG Flow] CSV row copied:', row);
      } catch (err) {
        console.error('[ESG Flow] Error', err);
        flash(btn, '⚠ Erreur', '#ef4444');
      }
    });

    document.body.appendChild(btn);
  }

  // LinkedIn is a SPA → re-mount on URL change.
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // wait for new profile to render
      setTimeout(mountButton, 800);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Initial mount
  setTimeout(mountButton, 1200);
})();
