using Microsoft.Extensions.Options;
using Synapse.Agent.Config;
using Synapse.Agent.Logging;
using Synapse.Agent.Models;

namespace Synapse.Agent.Security;

public sealed class PolicyValidationService(IOptions<AgentOptions> options, StructuredLog structuredLog)
{
    private static readonly string[] BlockedFragments =
    [
        "remove-item -recurse c:\\",
        "format-volume",
        "clear-disk",
        "disable-localuser",
        "new-localuser",
        "add-localgroupmember administrators",
        "set-executionpolicy unrestricted",
        "stop-service windefend",
        "disable-netadapter",
        "remove-computer",
        "restart-computer -force",
        "stop-computer",
        "bcdedit",
        "cipher /w",
        "reg delete"
    ];

    public PolicyDecision Validate(CommandJob job)
    {
        if (!options.Value.EnableCommandExecution)
        {
            return Deny(job, "command_execution_disabled");
        }

        if (job.ExpiresAt is not null && job.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            return Deny(job, "command_expired");
        }

        if (job.RunAsAdmin && !options.Value.RunCommandsAsAdmin)
        {
            return Deny(job, "run_as_admin_not_allowed");
        }

        if (job.ShellType.Equals("powershell", StringComparison.OrdinalIgnoreCase) && !options.Value.AllowPowerShell)
        {
            return Deny(job, "powershell_not_allowed");
        }

        var normalized = job.Command.Trim().ToLowerInvariant();
        if (BlockedFragments.Any(normalized.Contains))
        {
            return Deny(job, "blocked_command_fragment", "critical");
        }

        return new PolicyDecision(true, "allowed", job.RiskLevel);
    }

    private PolicyDecision Deny(CommandJob job, string reason, string riskLevel = "high")
    {
        structuredLog.Security("command.blocked", new { job.Id, reason, job.RiskLevel });
        return new PolicyDecision(false, reason, riskLevel);
    }
}
