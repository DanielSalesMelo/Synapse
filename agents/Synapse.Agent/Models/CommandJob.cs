namespace Synapse.Agent.Models;

public sealed class CommandJob
{
    public string Id { get; set; } = "";
    public string Command { get; set; } = "";
    public string ShellType { get; set; } = "powershell";
    public bool RunAsAdmin { get; set; }
    public string RiskLevel { get; set; } = "low";
    public DateTimeOffset? ExpiresAt { get; set; }
    public string? RequestedByRole { get; set; }
}
