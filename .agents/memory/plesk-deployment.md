---
name: Plesk deployment
description: Production build and runtime requirements for deploying Fortexa through a Git pull on Plesk.
---

Plesk deployment requires a static frontend document root, a separate Node API process, and `APP_URL` set to the public HTTPS domain so payment webhooks are generated correctly.

**Why:** Replit-specific `PORT` and domain variables are not guaranteed to exist on external hosting, while the frontend API client expects relative `/api` routes.

**How to apply:** Run `deploy-plesk.sh`, publish `artifacts/fortexa/dist`, start `app.js`, proxy `/api` to the Node process, and set `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`, and Sendavapay variables in Plesk.