---
name: AshtechPay confirmation
description: Durable constraints for confirming AshtechPay Mobile Money payments
---
AshtechPay Mobile Money confirmation must retain the provider transaction ID returned by collect. The merchant reference is useful for webhook matching, but the provider status endpoint requires the transaction ID. Fortexa credits the gross deposit amount, not AshtechPay's fee-reduced credited_amount.

**Why:** Mobile Money can be confirmed on the customer's phone while the webhook is delayed or unavailable, leaving a local transaction pending indefinitely if the app only trusts webhooks. AshtechPay's credited_amount can also be lower than the amount the user deposited because it includes provider fees.

**How to apply:** Keep webhook processing idempotent, accept provider success/failure status variants, and poll the provider status from the authenticated deposit-status endpoint as a fallback.