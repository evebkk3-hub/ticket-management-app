const AGENT_ACCESS_STATUS = Object.freeze({
  NORMAL: "NORMAL",
  RED: "RED",
  BLACK: "BLACK",
  RED_BLACK: "RED_BLACK",
});

function normalizeAgentBlacklistResponse(response) {
  if (!response || response.ok === false) {
    return {
      status: AGENT_ACCESS_STATUS.NORMAL,
      redLevel: false,
      blacklisted: false,
      degraded: true,
      salesBlocked: false,
      source: "FALLBACK",
      reason: "AGENT_STATUS_UNAVAILABLE",
    };
  }

  const redLevel = Boolean(response.redLevel);
  const blacklisted = Boolean(response.blacklisted);
  const status = redLevel && blacklisted
    ? AGENT_ACCESS_STATUS.RED_BLACK
    : redLevel
      ? AGENT_ACCESS_STATUS.RED
      : blacklisted
        ? AGENT_ACCESS_STATUS.BLACK
        : AGENT_ACCESS_STATUS.NORMAL;

  return {
    status,
    redLevel,
    blacklisted,
    degraded: false,
    // Authentication BRD says Agent Status service failure must not block sales.
    // Any transaction restriction remains owned by UAM/feature permission.
    salesBlocked: false,
    source: "AGENT_STATUS_API",
    reason: response.reason || "",
  };
}

function needsBlacklistWarning(result) {
  return Boolean(result && (result.redLevel || result.blacklisted));
}

function shouldRecheckAgentStatus(event) {
  return event === "LOGIN" || event === "COMMISSION_CALCULATOR";
}

module.exports = {
  AGENT_ACCESS_STATUS,
  needsBlacklistWarning,
  normalizeAgentBlacklistResponse,
  shouldRecheckAgentStatus,
};
