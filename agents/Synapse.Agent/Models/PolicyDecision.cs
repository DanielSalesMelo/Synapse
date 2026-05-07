namespace Synapse.Agent.Models;

public sealed record PolicyDecision(bool Allowed, string Reason, string RiskLevel = "low");
