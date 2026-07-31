const test = require("node:test");
const assert = require("node:assert/strict");
const {
  AGENT_ACCESS_STATUS,
  needsBlacklistWarning,
  normalizeAgentBlacklistResponse,
  shouldRecheckAgentStatus,
} = require("../src/domain/agentBlacklist");

test("maps red and blacklist flags without blocking authentication or sales", () => {
  const result = normalizeAgentBlacklistResponse({
    ok: true,
    redLevel: true,
    blacklisted: true,
  });

  assert.equal(result.status, AGENT_ACCESS_STATUS.RED_BLACK);
  assert.equal(result.salesBlocked, false);
  assert.equal(needsBlacklistWarning(result), true);
});

test("falls back to Normal when Agent Status API is unavailable", () => {
  const result = normalizeAgentBlacklistResponse({ ok: false });

  assert.equal(result.status, AGENT_ACCESS_STATUS.NORMAL);
  assert.equal(result.degraded, true);
  assert.equal(result.salesBlocked, false);
});

test("rechecks at login and commission calculator entry", () => {
  assert.equal(shouldRecheckAgentStatus("LOGIN"), true);
  assert.equal(shouldRecheckAgentStatus("COMMISSION_CALCULATOR"), true);
  assert.equal(shouldRecheckAgentStatus("OPEN_APPLICATION"), false);
});
