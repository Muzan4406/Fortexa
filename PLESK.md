# Déploiement Fortexa sur Plesk

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

Ce dossier est créé automatiquement par le build. Activez une réécriture SPA
vers `index.html` afin que les routes comme `/dashboard`, `/deposit` et
`/profile` fonctionnent après un rafraîchissement.

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

Le proxy du domaine doit envoyer `/api` vers ce processus Node.js. Le frontend
utilise volontairement des URLs relatives `/api/...`.

## 4. Variables d'environnement API

À configurer dans Plesk, sans les mettre dans Git :

```text
DATABASE_URL=connexion PostgreSQL Supabase
SESSION_SECRET=valeur longue et aléatoire
APP_URL=https://votre-domaine.com
SENDAVAPAY_SDK_KEY=clé SDK Sendavapay
SENDAVAPAY_WEBHOOK_SECRET=secret du webhook Sendavapay
```

`APP_URL` est indispensable pour que Sendavapay puisse appeler :

```text
https://votre-domaine.com/api/webhooks/sendavapay
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
4. vérifier `https://votre-domaine.com/api/healthz` ;
5. vérifier l'installation PWA sur HTTPS.