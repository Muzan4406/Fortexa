---
name: Push VAPID rotation
description: Browser push subscriptions can remain tied to an older VAPID application server key after deployment.
---

When VAPID keys may have changed, resynchronize by recreating the browser subscription instead of reusing the existing one; remove subscriptions rejected with 401/403/404/410.

**Why:** Browsers preserve an existing PushSubscription, so a server key rotation can otherwise produce delivery failures while the UI still appears enabled.

**How to apply:** Whenever push keys are added, restored, or rotated on a deployment, revisit the profile notification control and confirm a new subscription is stored before sending a test announcement.