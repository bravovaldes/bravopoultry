# BravoPoultry

> Le SaaS Avicole le Plus Complet au Monde

## Stack Technique

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL
- **Auth**: JWT + OAuth2
- **Charts**: Recharts
- **PWA**: next-pwa

## Structure du Projet

```
bravopoultry/
├── backend/                 # API FastAPI
│   ├── app/
│   │   ├── api/            # Endpoints REST
│   │   ├── core/           # Config, security
│   │   ├── db/             # Database connection
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # Business logic + ML
│   ├── migrations/         # Alembic migrations
│   └── tests/
│
├── frontend/               # Next.js PWA
│   ├── app/               # App Router pages
│   ├── components/        # React components
│   ├── lib/              # Utilities
│   ├── hooks/            # Custom hooks
│   └── types/            # TypeScript types
│
└── docs/                  # Documentation
```

## Installation

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Modifier .env avec vos credentials
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Modifier .env.local
npm run dev
```

## Fonctionnalités

### Gestion des Lots
- Poulet de chair (croissance, IC, mortalité)
- Pondeuses (taux de ponte, calibrage)

### Analytics
- Dashboard temps réel
- Graphiques interactifs
- Comparaisons lots

### Intelligence Artificielle
- Prédictions (poids, production, marge)
- Détection anomalies
- Recommandations automatiques

### Finances
- Compte de résultat par lot
- Coût de revient
- Gestion clients/fournisseurs

## Licence

Proprietary - BravoPoultry
