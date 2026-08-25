---
name: Telegram operations
description: Durable deployment and security constraints for Fortexa Telegram notifications and admin commands
---

Telegram notifications and commands depend on both the bot token and the configured group chat ID; a missing chat ID must be diagnosed explicitly rather than silently ignored.

**Why:** The application can create transactions successfully even when Telegram is misconfigured, so the failure otherwise looks like a missing business event.

**How to apply:** On Plesk configure the bot token, group chat ID, and enable command polling only after the bot is in the group. Keep financial commands restricted to that group and Telegram administrators, and require confirmation.