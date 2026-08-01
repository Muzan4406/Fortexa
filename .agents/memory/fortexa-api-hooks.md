---
name: Fortexa API client hook naming
description: Actual generated hook names for admin operations — differ from intuitive names
---

## Admin mutations (actual names)
- Approve/reject deposit: `useUpdateAdminDeposit({ id, data: { status: TransactionStatusUpdateStatus.approved } })`
- Approve/reject withdrawal: `useUpdateAdminWithdrawal({ id, data: { status: ... } })`
- Suspend user: `useSuspendUser({ id })` — dedicated hook, NOT via `useUpdateAdminUser`
- Ban user: `useBanUser({ id })` — dedicated hook
- Reactivate user: `useUpdateAdminUser({ id, data: {} })` — `AdminUserUpdate` has no `status` field
- Adjust funds: `useAdjustUserFunds({ id, data: { type: FundsAdjustmentType.add, walletType: FundsAdjustmentWalletType.investment, amount } })` — field is `walletType`, not `field`

## Admin announcements
- Create: `useCreateAnnouncement` (not `useCreateAdminAnnouncement`)
- Update: `useUpdateAnnouncement` — requires full `AnnouncementInput` (title + message + isActive)
- Delete: `useDeleteAnnouncement`
- List admin: `useGetAdminAnnouncements` returns `Announcement[]` directly (not `{ items: [] }`)

## List response shapes
- `useGetAdminUsers` returns `AdminUserList` = `{ items: AdminUserSummary[], total: number }` → use `.items`
- `useGetAdminDeposits` / `useGetAdminWithdrawals` return `AdminTransactionList` = `{ items: [], total }` → use `.items`
- `useGetAdminAnnouncements` returns `Announcement[]` directly (no wrapper)

## Query key for useGetMe
- `useGetMe({ query: { enabled: !!token, retry: false, queryKey: ['me', token] } })` — `queryKey` is required in the options

**Why:** These patterns burned multiple typecheck cycles; record them to avoid re-discovering.
