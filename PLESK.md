# Déploiement Fortexa sur Plesk

Cette configuration déploie Fortexa directement sur le domaine principal
`pplaystation.online`. Le domaine doit être réservé à Fortexa : une autre
application Node.js ne peut pas utiliser la même racine ou le même domaine
principal en même temps.

Le frontend est servi même si les variables de base de données ou de paiement
ne sont pas encore configurées. Ces variables sont nécessaires pour la
connexion, les dépôts, les retraits et l'administration, mais pas pour afficher
la page d'accueil et la page de connexion.

## 1. Déploiement Git

Dans le déploiement Git de Plesk, utilisez `deploy-plesk.sh` comme script après
le pull. Il installe les dépendances et compile l'API ainsi que le frontend.

Le script utilise pnpm directement lorsqu'il est disponible. Si Plesk affiche
seulement `npm`, il télécharge temporairement la version compatible de pnpm via
`npx`.

Le dépôt doit être déployé à la racine de l'application :

```text
/pplaystation.online
```

## 2. Frontend

Le build crée automatiquement :

```text
/pplaystation.online/artifacts/fortexa/public
```

Configurez le Document Root vers :

```text
/pplaystation.online/artifacts/fortexa/public
```

Activez une réécriture SPA vers `index.html` afin que les routes comme
`/dashboard`, `/deposit` et `/profile` fonctionnent après un rafraîchissement.

## 3. API Node.js

Configurez l'application Node.js Plesk avec :

```text
Application Root     : /pplaystation.online
Application Startup  : app.js
Application Mode     : production
```

`app.js` démarre le bundle API déjà compilé :

```text
/pplaystation.online/artifacts/api-server/dist/index.mjs
```

Le frontend utilise les routes API Fortexa sous `/api/...`.

## 4. Variables d'environnement API

À configurer dans Plesk, sans les mettre dans Git :

```text
DATABASE_URL=connexion PostgreSQL Fortexa
SESSION_SECRET=valeur longue et aléatoire
APP_URL=https://pplaystation.online
FORTEXA_WEB_PREFIX=/
FORTEXA_API_PREFIX=/api
SENDAVAPAY_SDK_KEY=clé SDK Sendavapay
SENDAVAPAY_WEBHOOK_SECRET=secret du webhook Sendavapay
TELEGRAM_BOT_TOKEN=nouveau token Telegram généré après révocation de l'ancien
TELEGRAM_CHAT_ID=-1003997139884
TELEGRAM_COMMANDS_ENABLED=true
```

`TELEGRAM_BOT_TOKEN` est un secret : ne le mettez jamais dans Git ou dans un
message. Saisissez directement dans Plesk le nouveau token généré par BotFather.
Le `TELEGRAM_CHAT_ID` du groupe `Fortexa Alertes` n'est pas secret.
Pour activer les commandes, ajoutez le bot au groupe et donnez-lui le droit
de lire et d'envoyer des messages. Les commandes sont acceptées uniquement
dans ce groupe et par un créateur ou administrateur Telegram. Si un webhook
Telegram est déjà configuré pour ce bot, supprimez-le avant d'activer le
polling des commandes.

Le webhook Sendavapay sera :

```text
https://pplaystation.online/api/webhooks/sendavapay
```

## 5. Base Supabase

Après avoir configuré `DATABASE_URL`, appliquez une fois le schéma Drizzle à la
base Fortexa :

```bash
pnpm --filter @workspace/db run push
```

## 6. Redémarrage

Après chaque pull :

1. cliquer sur **Pull + Deploy Now** ;
2. attendre la fin de `deploy-plesk.sh` ;
3. vérifier que `artifacts/fortexa/public` existe ;
4. configurer le Document Root vers ce dossier ;
5. redémarrer l'application Node.js ;
6. vérifier `https://pplaystation.online/api/healthz`.