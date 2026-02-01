# BravoPoultry - Checklist Deploiement & Securite

## Architecture de Deploiement

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Vercel      │────▶│     Render      │────▶│   PostgreSQL    │
│   (Frontend)    │     │   (Backend)     │     │   (Render DB)   │
│   Next.js 14    │     │   FastAPI       │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
     CDG1 (Paris)         Frankfurt              Frankfurt
```

---

## 1. PREPARATION RENDER (Backend)

### 1.1 Creer le compte et projet
- [ ] Creer un compte sur [render.com](https://render.com)
- [ ] Connecter le repository GitHub
- [ ] Creer un nouveau "Web Service" depuis le repo

### 1.2 Configuration du service
- [ ] **Name:** `bravopoultry-api`
- [ ] **Region:** Frankfurt (EU)
- [ ] **Branch:** `main`
- [ ] **Root Directory:** `backend`
- [ ] **Runtime:** Docker
- [ ] **Plan:** Starter ($7/mois) ou Free (avec cold starts)

### 1.3 Variables d'environnement (Dashboard Render)
```
DATABASE_URL          = [auto-genere par Render si DB liee]
SECRET_KEY            = [generer: python -c "import secrets; print(secrets.token_urlsafe(32))"]
ALGORITHM             = HS256
ACCESS_TOKEN_EXPIRE_MINUTES = 10080
APP_NAME              = BravoPoultry
DEBUG                 = False
API_V1_PREFIX         = /api/v1
CORS_ORIGINS          = https://bravopoultry.vercel.app,https://bravopoultry.com
FRONTEND_URL          = https://bravopoultry.vercel.app
EMAIL_FROM            = noreply@bravopoultry.com
SMTP_HOST             = [votre serveur SMTP]
SMTP_PORT             = 587
SMTP_USER             = [votre email SMTP]
SMTP_PASSWORD         = [votre mot de passe SMTP]
```

### 1.4 Base de donnees PostgreSQL
- [ ] Creer une database Render PostgreSQL
- [ ] **Name:** `bravopoultry-db`
- [ ] **Region:** Frankfurt (meme que le backend!)
- [ ] **Plan:** Starter ($7/mois)
- [ ] Lier la database au Web Service

---

## 2. PREPARATION VERCEL (Frontend)

### 2.1 Creer le projet
- [ ] Creer un compte sur [vercel.com](https://vercel.com)
- [ ] Importer le repository GitHub
- [ ] **Root Directory:** `frontend`
- [ ] **Framework Preset:** Next.js

### 2.2 Variables d'environnement (Dashboard Vercel)
```
NEXT_PUBLIC_API_URL   = https://bravopoultry-api.onrender.com
NEXT_PUBLIC_APP_NAME  = BravoPoultry
NEXT_PUBLIC_ENV       = production
```

### 2.3 Domaine personnalise (optionnel)
- [ ] Ajouter domaine `bravopoultry.com`
- [ ] Configurer les DNS chez votre registrar
- [ ] Activer HTTPS automatique

---

## 3. CHECKLIST SECURITE

### 3.1 Backend - Configuration
- [ ] `DEBUG=False` en production
- [ ] `SECRET_KEY` unique et fort (32+ caracteres)
- [ ] CORS limite aux domaines autorises uniquement
- [ ] HTTPS force (Render le fait automatiquement)

### 3.2 Backend - Authentification
- [x] Mots de passe hashes avec bcrypt
- [x] JWT avec expiration (7 jours)
- [x] Verification email obligatoire
- [x] Rate limiting sur reset password (1/min)
- [x] Token reset expire en 1 heure
- [ ] Considerer reduire ACCESS_TOKEN_EXPIRE_MINUTES a 1440 (24h)

### 3.3 Backend - Base de donnees
- [ ] PostgreSQL en production (pas SQLite!)
- [ ] Utilisateur DB avec permissions limitees
- [ ] Backups automatiques actives (Render le fait)
- [ ] Pas de credentials dans le code

### 3.4 Frontend - Securite
- [x] Headers de securite dans vercel.json
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin
- [x] Tokens stockes correctement (localStorage/sessionStorage)
- [x] Logout automatique sur 401
- [ ] Considerer Content-Security-Policy

### 3.5 Donnees sensibles
- [ ] Pas de secrets dans le code source
- [ ] `.env` dans `.gitignore`
- [ ] Utiliser les variables d'environnement des plateformes
- [ ] Ne pas logger les mots de passe ou tokens

---

## 4. CHECKLIST PRE-PRODUCTION BETA

### 4.1 Fonctionnalites critiques
- [x] Inscription avec verification email
- [x] Connexion / Deconnexion
- [x] "Se souvenir de moi" fonctionne
- [x] Reinitialisation mot de passe
- [x] Modification mot de passe (parametres)
- [x] Pages legales (CGU, Confidentialite)

### 4.2 Tests a effectuer
- [ ] Tester inscription complete (email reel)
- [ ] Tester reset password (email reel)
- [ ] Tester toutes les operations CRUD (lots, production, etc.)
- [ ] Tester les permissions par role
- [ ] Tester sur mobile (responsive)
- [ ] Tester les exports PDF

### 4.3 Configuration Email
- [ ] Configurer un service SMTP de production:
  - **Brevo (Sendinblue):** Gratuit jusqu'a 300 emails/jour
  - **Mailgun:** 5000 emails gratuits/mois
  - **SendGrid:** 100 emails/jour gratuits
  - **Amazon SES:** ~$0.10 pour 1000 emails

### 4.4 Monitoring & Logs
- [ ] Verifier les logs Render pour erreurs
- [ ] Configurer alertes (Render Dashboard)
- [ ] Considerer Sentry pour tracking d'erreurs

---

## 5. COMMANDES DE DEPLOIEMENT

### 5.1 Premier deploiement

```bash
# 1. Pousser le code sur GitHub
git add .
git commit -m "Prepare deployment to Render + Vercel"
git push origin main

# 2. Sur Render:
#    - Creer Web Service depuis GitHub
#    - Creer PostgreSQL Database
#    - Configurer les variables d'environnement

# 3. Sur Vercel:
#    - Importer le projet depuis GitHub
#    - Configurer les variables d'environnement
#    - Deployer
```

### 5.2 Mise a jour du vercel.json apres deploiement Render

Une fois l'URL Render connue, mettre a jour `frontend/vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://VOTRE-APP.onrender.com/api/:path*"
    }
  ]
}
```

---

## 6. COUTS ESTIMES

### Option Gratuite (avec limitations)
| Service | Plan | Cout |
|---------|------|------|
| Render Web Service | Free | $0 (cold starts, spin down apres 15min) |
| Render PostgreSQL | Free | $0 (expire apres 90 jours) |
| Vercel | Hobby | $0 |
| **Total** | | **$0/mois** |

### Option Production (recommandee)
| Service | Plan | Cout |
|---------|------|------|
| Render Web Service | Starter | $7/mois |
| Render PostgreSQL | Starter | $7/mois |
| Vercel | Pro | $20/mois (optionnel) |
| Brevo (Email) | Free | $0 |
| **Total** | | **$14-34/mois** |

---

## 7. APRES LE DEPLOIEMENT

- [ ] Tester toutes les fonctionnalites en production
- [ ] Creer un compte admin de production
- [ ] Configurer Google Analytics (optionnel)
- [ ] Configurer le domaine personnalise
- [ ] Documenter les procedures de backup
- [ ] Planifier les mises a jour regulieres

---

## 8. CONTACTS SUPPORT

- **Render:** support@render.com
- **Vercel:** support@vercel.com
- **Documentation Render:** https://render.com/docs
- **Documentation Vercel:** https://vercel.com/docs
