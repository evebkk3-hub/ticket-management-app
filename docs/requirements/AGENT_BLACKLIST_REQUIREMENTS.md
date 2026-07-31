# AgentBlacklist / Red-Black Level

Source: `docs/Authen.png` — “UI & API Flow: Authentication (Check Red/Black Level)”.

## Confirmed rules

- Check agent permission/status on every login, regardless of OTP, PIN, or username/password.
- Agent profile, selling privilege, Red Level, and Blacklist status are separate concerns.
- A listed agent can enter the application. The landing page shows a warning and a link to status details.
- If the Agent Status API is unavailable, default the Red/Black result to `Normal`.
- Agent Status service failure must not block login or the sales process.
- Recheck permission when the user enters the commission-calculation feature.
- UAM is the source of truth for feature visibility and selling permissions.
- When the user logs out and logs in again on the same day, permissions must be checked again.

## MVP implementation

- Central domain model: `projects/tl-smart/src/domain/agentBlacklist.js`.
- Persistent warning banner with a status-detail dialog.
- Demonstration scenarios: Normal, Red Level, Blacklist, Red + Black, and API unavailable.
- Red/Black is informational in this MVP. Transaction blocking must come from a confirmed UAM permission response, not from this flag alone.

## Integration contract still required

- Final Agent Status endpoint, request/response schema, timeout, and error codes.
- Red-level labels and effective-date fields.
- Official status-detail document URL.
- UAM feature IDs and the exact selling restrictions for each permission.
