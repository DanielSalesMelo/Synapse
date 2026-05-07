using Synapse.Agent.Config;
using Synapse.Agent.Infrastructure;

namespace Synapse.Agent.Services;

public sealed class DeviceRegistrationService(
    ConfigStore configStore,
    InventoryService inventory,
    SynapseApiClient api,
    ILogger<DeviceRegistrationService> logger)
{
    public async Task EnsureRegisteredAsync(CancellationToken cancellationToken)
    {
        var options = configStore.Load();
        if (!string.IsNullOrWhiteSpace(options.DeviceToken))
        {
            logger.LogInformation("Device already has a Synapse token. DeviceId={DeviceId}", options.DeviceId);
            return;
        }

        if (string.IsNullOrWhiteSpace(options.PairingCode))
        {
            logger.LogWarning("Device is not paired. Set PairingCode in config or run the install script with -PairingCode.");
            return;
        }

        await inventory.RefreshAsync(cancellationToken);
        var identity = inventory.BuildIdentity();
        var result = await api.PairAsync(identity, options.PairingCode, cancellationToken);
        if (result is null || string.IsNullOrWhiteSpace(result.Token))
        {
            logger.LogWarning("Device pairing did not return a token.");
            return;
        }

        options.DeviceToken = result.Token;
        options.DeviceId = result.DeviceId;
        options.CompanyId = result.EmpresaId;
        options.PairingCode = "";
        configStore.Save(options);
        logger.LogInformation("Device paired successfully. DeviceId={DeviceId} CompanyId={CompanyId}", result.DeviceId, result.EmpresaId);
    }
}
