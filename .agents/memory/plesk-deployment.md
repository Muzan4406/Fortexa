---
name: Plesk deployment
description: Production build and runtime requirements for deploying Fortexa through a Git pull on Plesk.
---

Plesk deployment requires a static frontend document root, a separate Node API process, and `APP_URL` set to the public HTTPS domain so payment webhooks are generated correctly. When sharing a hostname with another app, Fortexa uses `/fortexa` and `/fortexa/api`.

**Why:** Replit-specific `PORT` and domain variables are not guaranteed to exist on external hosting, while the frontend API client expects relative `/api` routes.

**How to apply:** Run `deploy-plesk.sh`, build with `BASE_PATH=/fortexa/`, publish `artifacts/fortexa/dist` at `/fortexa`, start `app.js`, proxy `/fortexa/api` to Node, and set Fortexa's own database and payment variables.