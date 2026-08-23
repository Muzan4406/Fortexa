# Déploiement Fortexa sur Plesk

Fortexa peut cohabiter avec une autre application sur le même domaine en
utilisant le préfixe `/fortexa`. L'ancienne application garde ses routes
existantes à la racine et Fortexa utilise uniquement `/fortexa` et
`/fortexa/api`.

## 1. Déploiement Git

Dans le déploiement Git de Plesk, utilisez `deploy-plesk.sh` comme script après
le pull. Il installe les dépendances et compile l'API ainsi que le frontend.

Le script utilise pnpm directement lorsqu'il est disponible. Si Plesk affiche
seulement `npm`, il télécharge temporairement la version compatible de pnpm via
`npx`.

## 2. Frontend

Configurez le document root du domaine vers :

```text
artifacts/fortexa/dist
```

Ce dossier est créé automatiquement par le build. Le script de déploiement
compile le frontend avec la base `/fortexa/`. Configurez donc la publication
du dossier vers le chemin public :

```text
/fortexa
```

Activez une réécriture SPA de `/fortexa/*` vers
`artifacts/fortexa/dist/index.html` afin que les routes comme
`/fortexa/dashboard`, `/fortexa/deposit` et `/fortexa/profile` fonctionnent
après un rafraîchissement.

## 3. API Node.js

Créez une application Node.js Plesk avec la racine du projet et le fichier de
démarrage :

```text
app.js
```

Plesk doit fournir un port à l'application via `PORT`. L'API écoute déjà cette
variable. Le fichier démarre le bundle déjà compilé, sans dépendre de pnpm au
moment de l'exécution. `start-plesk.mjs` reste disponible comme ancien point
d'entrée.

Le proxy du domaine doit envoyer uniquement `/fortexa/api` vers ce processus
Node.js. Le frontend utilise les URLs `/fortexa/api/...`, ce qui évite toute
collision avec l'ancienne application et ses routes `/api/...`.

## 4. Variables d'environnement API

À configurer dans Plesk, sans les mettre dans Git :

```text
DATABASE_URL=connexion PostgreSQL Supabase
SESSION_SECRET=valeur longue et aléatoire
APP_URL=https://votre-domaine.com
FORTEXA_WEB_PREFIX=/fortexa
FORTEXA_API_PREFIX=/fortexa/api
SENDAVAPAY_SDK_KEY=clé SDK Sendavapay
SENDAVAPAY_WEBHOOK_SECRET=secret du webhook Sendavapay
```

`APP_URL` est indispensable pour que Sendavapay puisse appeler :

```text
https://votre-domaine.com/fortexa/api/webhooks/sendavapay
```

## 5. Base Supabase

Après avoir configuré `DATABASE_URL`, exécutez une fois depuis la racine du
projet :

```bash
pnpm --filter @workspace/db run push
```

Cette commande applique le schéma Drizzle à la base Supabase existante. Elle ne
doit pas être lancée avec une autre base par erreur.

## 6. Redémarrage

Après chaque pull :

1. cliquer sur **Pull + Deploy Now** ;
2. attendre la fin de `deploy-plesk.sh` ;
3. redémarrer l'application Node.js ;
4. vérifier `https://votre-domaine.com/fortexa/api/healthz` ;
5. vérifier l'installation PWA sur HTTPS.