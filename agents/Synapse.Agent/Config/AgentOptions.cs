namespace Synapse.Agent.Config;

public sealed class AgentOptions
{
    public const string SectionName = "SynapseAgent";

    public string ServerUrl { get; set; } = "https://synapse-backend-ds2026.azurewebsites.net";
    public string AgentVersion { get; set; } = "2.0.0-alpha.1";
    public string PairingCode { get; set; } = "";
    public string DeviceToken { get; set; } = "";
    public string DeviceTokenProtected { get; set; } = "";
    public int? DeviceId { get; set; }
    public int? CompanyId { get; set; }
    public int HeartbeatIntervalSeconds { get; set; } = 30;
    public int InventoryIntervalMinutes { get; set; } = 60;
    public int CommandPollIntervalSeconds { get; set; } = 15;
    public string WebSocketPath { get; set; } = "/api/agent/connect";
    public bool EnableWebSocket { get; set; }
    public bool EnableCommandExecution { get; set; }
    public bool AllowPowerShell { get; set; }
    public bool RunCommandsAsAdmin { get; set; }
    public bool AllowLocalShell { get; set; }
    public int MaxCommandSeconds { get; set; } = 120;
    public int LogRetentionDays { get; set; } = 14;
    public string Environment { get; set; } = "production";
}
