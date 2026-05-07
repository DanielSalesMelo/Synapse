using System.Text.Json;
using Microsoft.Extensions.Options;
using Synapse.Agent.Infrastructure;
using Synapse.Agent.Security;

namespace Synapse.Agent.Config;

public sealed class ConfigStore(IOptions<AgentOptions> defaults, AgentPaths paths, ILogger<ConfigStore> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    public string ConfigPath => Path.Combine(paths.ConfigDirectory, "appsettings.local.json");

    public AgentOptions Load()
    {
        var options = Clone(defaults.Value);

        if (File.Exists(ConfigPath))
        {
            try
            {
                var saved = JsonSerializer.Deserialize<AgentOptions>(File.ReadAllText(ConfigPath), JsonOptions);
                if (saved is not null)
                {
                    options = Merge(options, saved);
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to read agent config. Defaults will be used.");
            }
        }

        if (string.IsNullOrWhiteSpace(options.DeviceToken) && !string.IsNullOrWhiteSpace(options.DeviceTokenProtected))
        {
            options.DeviceToken = SecretProtector.Unprotect(options.DeviceTokenProtected) ?? "";
        }

        return options;
    }

    public void Save(AgentOptions options)
    {
        Directory.CreateDirectory(paths.ConfigDirectory);
        var persisted = Clone(options);
        if (!string.IsNullOrWhiteSpace(persisted.DeviceToken))
        {
            persisted.DeviceTokenProtected = SecretProtector.Protect(persisted.DeviceToken) ?? "";
            persisted.DeviceToken = "";
        }

        File.WriteAllText(ConfigPath, JsonSerializer.Serialize(persisted, JsonOptions));
    }

    private static AgentOptions Clone(AgentOptions source) => Merge(new AgentOptions(), source);

    private static AgentOptions Merge(AgentOptions target, AgentOptions source)
    {
        target.ServerUrl = string.IsNullOrWhiteSpace(source.ServerUrl) ? target.ServerUrl : source.ServerUrl;
        target.AgentVersion = string.IsNullOrWhiteSpace(source.AgentVersion) ? target.AgentVersion : source.AgentVersion;
        target.PairingCode = source.PairingCode ?? "";
        target.DeviceToken = source.DeviceToken ?? "";
        target.DeviceTokenProtected = source.DeviceTokenProtected ?? "";
        target.DeviceId = source.DeviceId ?? target.DeviceId;
        target.CompanyId = source.CompanyId ?? target.CompanyId;
        target.HeartbeatIntervalSeconds = source.HeartbeatIntervalSeconds > 0 ? source.HeartbeatIntervalSeconds : target.HeartbeatIntervalSeconds;
        target.InventoryIntervalMinutes = source.InventoryIntervalMinutes > 0 ? source.InventoryIntervalMinutes : target.InventoryIntervalMinutes;
        target.CommandPollIntervalSeconds = source.CommandPollIntervalSeconds > 0 ? source.CommandPollIntervalSeconds : target.CommandPollIntervalSeconds;
        target.WebSocketPath = string.IsNullOrWhiteSpace(source.WebSocketPath) ? target.WebSocketPath : source.WebSocketPath;
        target.EnableWebSocket = source.EnableWebSocket;
        target.EnableCommandExecution = source.EnableCommandExecution;
        target.AllowPowerShell = source.AllowPowerShell;
        target.RunCommandsAsAdmin = source.RunCommandsAsAdmin;
        target.AllowLocalShell = source.AllowLocalShell;
        target.MaxCommandSeconds = source.MaxCommandSeconds > 0 ? source.MaxCommandSeconds : target.MaxCommandSeconds;
        target.LogRetentionDays = source.LogRetentionDays > 0 ? source.LogRetentionDays : target.LogRetentionDays;
        target.Environment = string.IsNullOrWhiteSpace(source.Environment) ? target.Environment : source.Environment;
        return target;
    }
}
