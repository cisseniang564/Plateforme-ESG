# Kit d'onboarding — Connecteurs ESGFlow
**À envoyer au client après signature du contrat**
Version 1.0 — GreenConnect ESGFlow

---

## Bienvenue 👋

Pour que votre plateforme ESGFlow soit opérationnelle rapidement, nous avons besoin que votre équipe prépare les accès aux systèmes que vous souhaitez connecter.

Ce document liste **exactement ce qu'il faut préparer**, **qui doit s'en charger en interne**, et **le délai estimé** pour chaque connecteur.

> **Délai moyen d'activation complète : 5 à 15 jours ouvrés**
> La majeure partie de ce délai dépend de vos procédures internes — plus tôt vous transmettez les accès, plus vite votre plateforme est opérationnelle.

---

## Étape 1 — Choisissez vos connecteurs

Cochez les systèmes que vous utilisez :

- [ ] SAP S/4HANA
- [ ] SAP SuccessFactors
- [ ] Oracle Fusion
- [ ] NetSuite
- [ ] Workday
- [ ] BambooHR
- [ ] Cegid Quadra / Cegid XRP
- [ ] Pennylane
- [ ] Schneider Electric (EcoStruxure)
- [ ] Enedis (données de consommation électrique)
- [ ] EDF Entreprises (données énergie)
- [ ] Carbon Interface (émissions carbone)
- [ ] Climatiq API (facteurs d'émission)

---

## Étape 2 — Préparez les accès par système

---

### 🔷 SAP S/4HANA

**Qui s'en charge :** Administrateur SAP Basis / DSI

**Ce qu'il faut créer :**
1. Ouvrir la transaction **SM59** (connexions RFC)
2. Créer un utilisateur de service de type "Communication" (transaction SU01)
3. Lui attribuer le rôle `/IWFND/RT_GW_USER` ou un rôle équivalent avec accès OData
4. Activer le service OData correspondant dans **SOAMANAGER** ou **/IWFND/MAINT_SERVICE**

**Informations à nous transmettre :**
| Champ | Valeur |
|---|---|
| URL du système SAP | `https://votre-sap.domaine.com` |
| Client SAP (Mandant) | ex. `100` |
| Nom d'utilisateur du compte de service | |
| Mot de passe du compte de service | |

**Délai estimé :** 2 à 5 jours ouvrés (création du compte + activation service)

---

### 🔷 SAP SuccessFactors

**Qui s'en charge :** Administrateur SuccessFactors / RH IT

**Ce qu'il faut créer :**
1. Aller dans **Admin Center → OAuth2 Client Application**
2. Cliquer sur "Register Client Application"
3. Donner un nom (`ESGFlow Integration`)
4. Cocher les scopes : `read_user_data`, `read_org_data`
5. Enregistrer → récupérer le **Client ID** et générer le **Secret**

**Informations à nous transmettre :**
| Champ | Valeur |
|---|---|
| URL de l'instance SuccessFactors | `https://api4.successfactors.com` |
| Company ID | ex. `SFPART000000` |
| Client ID (OAuth2) | |
| Client Secret (OAuth2) | |

**Délai estimé :** 1 à 3 jours ouvrés

---

### 🔷 Oracle Fusion Cloud

**Qui s'en charge :** Administrateur Oracle Cloud / DSI

**Ce qu'il faut créer :**
1. Aller dans **Security → OAuth2 → Register Application**
2. Type : "Client Credentials"
3. Accorder les scopes REST API nécessaires (Finance, HCM selon besoins)
4. Récupérer le **Client ID** et **Client Secret**

**Informations à nous transmettre :**
| Champ | Valeur |
|---|---|
| URL de base Oracle Fusion | `https://votreinstance.fa.oraclecloud.com` |
| Client ID | |
| Client Secret | |

**Délai estimé :** 2 à 5 jours ouvrés

---

### 🔷 NetSuite

**Qui s'en charge :** Administrateur NetSuite / Finance IT

**Ce qu'il faut créer :**
1. **Setup → Integrations → Manage Integrations → New**
2. Cocher "Token-Based Authentication"
3. Récupérer le **Consumer Key** et **Consumer Secret**
4. Créer un rôle dédié avec accès aux records financiers en lecture
5. Créer un **Access Token** (Setup → Users/Roles → Access Tokens)

**Informations à nous transmettre :**
| Champ | Valeur |
|---|---|
| Account ID NetSuite | ex. `1234567` |
| Consumer Key | |
| Consumer Secret | |
| Token ID | |
| Token Secret | |

**Délai estimé :** 2 à 4 jours ouvrés

---

### 🔷 Workday

**Qui s'en charge :** Administrateur Workday / RH IT

**Ce qu'il faut créer :**
1. Aller dans **System → API Clients → Register API Client**
2. Type : "Integration System Client"
3. Nommer le client `ESGFlow`
4. Accorder les scopes : Human Capital Management (lecture), Financial Management (lecture)
5. Récupérer le **Client ID** et générer un **Client Secret**

**Informations à nous transmettre :**
| Champ | Valeur |
|---|---|
| Tenant URL Workday | `https://wd3.myworkday.com/votre-entreprise` |
| Client ID | |
| Client Secret | |

**Délai estimé :** 2 à 5 jours ouvrés

---

### 🔷 BambooHR

**Qui s'en charge :** Administrateur BambooHR / RH

**Ce qu'il faut créer :**
1. Se connecter à BambooHR avec un compte admin
2. Cliquer sur le prénom (en haut à droite) → **API Keys**
3. Cliquer sur "Add New Key"
4. Nommer la clé `ESGFlow` → copier la clé générée

**Informations à nous transmettre :**
| Champ | Valeur |
|---|---|
| Sous-domaine BambooHR | ex. `votre-entreprise` (depuis `votre-entreprise.bamboohr.com`) |
| Clé API | |

**Délai estimé :** 30 minutes

---

### 🔷 Cegid Quadra / Cegid XRP

**Qui s'en charge :** Votre revendeur Cegid ou administrateur Cegid

**Ce qu'il faut faire :**
1. Contacter votre **revendeur Cegid** ou le support Cegid
2. Demander l'activation du module **Web Services / API REST**
3. Créer un utilisateur technique avec accès lecture aux modules Comptabilité et Paie
4. Demander les paramètres de connexion API

**Informations à nous transmettre :**
| Champ | Valeur |
|---|---|
| URL de l'API Cegid | |
| Identifiant technique | |
| Mot de passe / Token | |
| Dossier comptable (code) | |

**Délai estimé :** 5 à 10 jours ouvrés (dépend du revendeur)

---

### 🔷 Pennylane

**Qui s'en charge :** Comptable / Directeur Financier / Admin Pennylane

**Ce qu'il faut créer :**
1. Se connecter à Pennylane
2. Aller dans **Paramètres → Intégrations → API**
3. Cliquer sur "Générer un token"
4. Nommer le token `ESGFlow`

**Informations à nous transmettre :**
| Champ | Valeur |
|---|---|
| Token API | |

**Délai estimé :** 15 minutes

---

### 🔷 Enedis (données de consommation électrique)

**Qui s'en charge :** Responsable Énergie / Facility Manager

**Ce qu'il faut faire :**
1. Aller sur **[datahub-enedis.fr](https://datahub-enedis.fr)**
2. Se connecter avec les identifiants de l'entreprise (SIRET requis)
3. Aller dans **Espace Pro → Mes applications → Créer une application**
4. Sélectionner les données : Courbes de charge, Index, Données contractuelles
5. Récupérer le **Client ID** et **Client Secret** OAuth2

**⚠️ Important :** Préparer la liste de tous vos **Points De Livraison (PDL)** — numéros à 14 chiffres sur vos factures EDF/Enedis.

**Informations à nous transmettre :**
| Champ | Valeur |
|---|---|
| Client ID Enedis | |
| Client Secret Enedis | |
| Liste des PDL (numéros à 14 chiffres) | |

**Délai estimé :** 5 à 10 jours ouvrés (validation Enedis)

---

### 🔷 EDF Entreprises

**Qui s'en charge :** Responsable Énergie / Acheteur Énergie

**Ce qu'il faut faire :**
1. Contacter votre **chargé de compte EDF Pro**
2. Demander l'accès à l'**API EDF Entreprises** (portail B2B)
3. Fournir votre SIRET et la liste des sites concernés
4. EDF vous enverra les credentials par email sécurisé

**Informations à nous transmettre :**
| Champ | Valeur |
|---|---|
| Client ID EDF API | |
| Client Secret EDF API | |
| Périmètre sites (liste) | |

**Délai estimé :** 7 à 15 jours ouvrés

---

### 🔷 Schneider Electric — EcoStruxure

**Qui s'en charge :** Responsable Technique / Facility Manager

**Ce qu'il faut faire :**
1. Aller sur **[exchange.se.com](https://exchange.se.com)**
2. Créer un compte développeur
3. Aller dans **My Apps → Register Application**
4. Sélectionner les APIs : EcoStruxure Asset Advisor ou Energy Hub selon votre équipement
5. Récupérer la **Subscription Key** (API Key)

**Informations à nous transmettre :**
| Champ | Valeur |
|---|---|
| Subscription Key | |
| URL de base EcoStruxure | |

**Délai estimé :** 2 à 5 jours ouvrés

---

### 🟢 Carbon Interface

**Qui s'en charge :** Vous-même (compte plateforme)

**Ce qu'il faut faire :**
1. Aller sur **[app.carboninterface.com](https://app.carboninterface.com)**
2. Créer un compte (gratuit pour démarrer)
3. Dashboard → **API Key** → copier la clé

**Informations à nous transmettre :**
| Champ | Valeur |
|---|---|
| Clé API Carbon Interface | |

**Délai estimé :** 15 minutes

---

### 🟢 Climatiq API

**Qui s'en charge :** Vous-même (compte plateforme)

**Ce qu'il faut faire :**
1. Aller sur **[app.climatiq.io](https://app.climatiq.io)**
2. S'inscrire → **API Keys → Create new key**
3. Nommer la clé `ESGFlow`

**Informations à nous transmettre :**
| Champ | Valeur |
|---|---|
| Clé API Climatiq | |

**Délai estimé :** 15 minutes

---

## Étape 3 — Nous transmettre les accès

Transmettez les informations collectées **de manière sécurisée** :

> ✉️ **Ne jamais envoyer les clés API par email en clair.**
>
> Utilisez l'un de ces moyens sécurisés :
> - **Bitwarden Send** (envoi chiffré gratuit) : [send.bitwarden.com](https://send.bitwarden.com)
> - **1Password** (si votre entreprise l'utilise)
> - **Fichier chiffré** (7-Zip AES-256) transmis par email avec mot de passe par SMS

Contact de votre Customer Success Manager : **[À compléter]**

---

## Récapitulatif des délais

| Priorité | Connecteurs | Délai | Responsable interne |
|---|---|---|---|
| 🔴 Urgent | Pennylane, BambooHR, Carbon Interface, Climatiq | < 1 jour | Finance / RH / Vous |
| 🟠 Court | SAP SuccessFactors, Workday, Enedis | 3 à 7 jours | RH IT / Énergie |
| 🟡 Moyen | SAP S/4HANA, Oracle, NetSuite | 5 à 10 jours | DSI |
| 🟢 Long | EDF, Cegid, Schneider | 7 à 15 jours | Énergie / Revendeur |

---

## Questions fréquentes

**Q : Faut-il créer de nouveaux comptes ou utiliser des comptes existants ?**
> Pour les ERP, nous recommandons de créer un **utilisateur de service dédié** (non nominatif) avec les droits minimum nécessaires en lecture. Cela évite les interruptions si un employé quitte l'entreprise.

**Q : ESGFlow a-t-il accès en écriture à nos systèmes ?**
> Non. Tous les connecteurs fonctionnent en **lecture seule**. ESGFlow récupère des données pour les consolider dans votre tableau de bord ESG — il n'écrit rien dans vos systèmes sources.

**Q : Les données transitent-elles par vos serveurs ?**
> Oui, les données transitent par notre infrastructure hébergée en Europe (RGPD). Elles sont chiffrées en transit (TLS 1.3) et au repos (AES-256). Voir notre politique de confidentialité et le DPA disponible sur demande.

**Q : Puis-je révoquer un accès à tout moment ?**
> Oui. Vous pouvez désactiver un connecteur depuis votre plateforme ESGFlow à tout moment, ou révoquer directement la clé API dans le système source.

---

*Document préparé par GreenConnect — ESGFlow*
*Pour toute question : support@greenconnect.cloud*
