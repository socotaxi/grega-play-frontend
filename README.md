# 🎬 Grega Play

Grega Play est une application collaborative de création de vidéos courtes pour célébrer des événements (anniversaires, mariages, etc.) de manière simple, sociale et mémorable.

---

## 🚀 Fonctionnalités principales

- 📦 Création d'événements privés
- 📨 Envoi d'invitations par email
- 🎥 Soumission de vidéos courtes par les invités
- 🛠️ Génération automatique d'une vidéo finale (montage)
- 🔐 Authentification avec Supabase (Google ou email)
- ☁️ Stockage sur Supabase Storage (Firebase possible)
- 🖼️ Interface responsive (mobile et desktop)

---

## 🧰 Stack technique

- **Frontend** : React + Vite + Tailwind CSS  
- **Backend** : Node.js + Express (montage vidéo avec FFmpeg)  
- **Base de données & Auth** : Supabase  
- **Stockage** : Supabase Buckets  
- **Emailing** : SendGrid  
- **Déploiement** : Railway / Vercel

---

## 📂 Structure du projet

```
gregaplay/
│
├── frontend/               → Application React
│   ├── src/pages           → Pages (Login, Register, Dashboard, etc.)
│   ├── src/components      → Composants réutilisables
│   ├── src/services        → Services (event, video, invitation, etc.)
│   └── .env.local          → Clés API Supabase
│
├── backend/                → Serveur Node pour montage vidéo
│   └── server/index.js     → Point d'entrée du backend
│
├── supabase/               → Fonctions SQL et RLS
│   ├── schema.sql
│   └── send-email.ts       → Fonction Edge d'envoi d'email
│
└── README.md
```

---

## 🔧 Lancer le projet en local

### 1. Frontend

```bash
cd frontend
pnpm install
pnpm run dev
```

### 2. Backend

```bash
cd backend
pnpm install
pnpm run start
```

---

## ✨ Auteur

👤 **Edhem Rombhot** – [LinkedIn](https://www.linkedin.com/in/edhem-rombhot)  
📫 contact@socotaxi.com  
🌍 Projet basé à Pointe-Noire, Congo 🇨🇬

---

## 📄 Licence

Ce projet est sous licence MIT – libre d'utilisation et de modification.
