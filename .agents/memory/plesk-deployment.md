---
name: Plesk deployment
description: Production build and runtime requirements for deploying Fortexa through a Git pull on Plesk.
---

Plesk deployment requires a static frontend document root, a separate Node API process, and `APP_URL` set to the public HTTPS domain so payment webhooks are generated correctly. The primary deployment uses the domain root and `/api`; the frontend is published in the existing `public` folder.

**Why:** Replit-specific `PORT` and domain variables are not guaranteed to exist on external hosting, while the frontend API client expects relative `/api` routes.

**How to apply:** Run `deploy-plesk.sh`, publish `artifacts/fortexa/public`, start `app.js` from the repository root, proxy `/api` to Node, and set Fortexa's own database and payment variables. Upload proofs may exist in either the repository-root `uploads` directory or the API artifact's `uploads` directory after a Plesk restart. SendavaPay client payment tokens expire after 30 minutes and are validated without the SDK key.