using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Synapse.Agent.Config;
using Synapse.Agent.DTOs;
using Synapse.Agent.Models;

namespace Synapse.Agent.Infrastructure;

public sealed class SynapseApiClient(HttpClient httpClient, ConfigStore configStore, ILogger<SynapseApiClient> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<DeviceRegistrationResult?> PairAsync(DeviceIdentity identity, string pairingCode, CancellationToken cancellationToken)
    {
        var payload = new
        {
            pairCode = pairingCode,
            codigo = pairingCode,
            hostname = identity.Hostname,
            ip = identity.IpAddress,
            platform = identity.OperatingSystem,
            mac = identity.MacAddress,
            fingerprint = identity.Fingerprint,
            anydeskId = identity.AnyDeskId,
            agentVersion = identity.AgentVersion,
            agentRuntime = "dotnet",
            agentMajorVersion = 2
        };

        using var response = await httpClient.PostAsJsonAsync("api/agent/pair", payload, JsonOptions, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Device pair failed with status {StatusCode}: {Body}", response.StatusCode, await response.Content.ReadAsStringAsync(cancellationToken));
            return null;
        }

        var result = await response.Content.ReadFromJsonAsync<DeviceRegistrationResult>(JsonOptions, cancellationToken);
        return result;
    }

    public async Task<bool> SendHeartbeatAsync(AgentMetricDto metric, CancellationToken cancellationToken)
    {
        var options = configStore.Load();
        if (string.IsNullOrWhiteSpace(options.DeviceToken))
        {
            logger.LogDebug("Skipping heartbeat because device token is missing.");
            return false;
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, "api/agent/heartbeat")
        {
            Content = JsonContent.Create(metric, options: JsonOptions)
        };
        request.Headers.Authorization = new("Bearer", options.DeviceToken);

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.MethodNotAllowed)
        {
            return await SendMetricsFallbackAsync(metric, options.DeviceToken, cancellationToken);
        }

        if (response.IsSuccessStatusCode) return true;

        logger.LogWarning("Heartbeat failed with status {StatusCode}: {Body}", response.StatusCode, await response.Content.ReadAsStringAsync(cancellationToken));
        return false;
    }

    public async Task<IReadOnlyList<CommandJob>> PollCommandJobsAsync(CancellationToken cancellationToken)
    {
        var options = configStore.Load();
        if (!options.EnableCommandExecution || string.IsNullOrWhiteSpace(options.DeviceToken))
        {
            return [];
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, "api/agent/commands");
        request.Headers.Authorization = new("Bearer", options.DeviceToken);

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.MethodNotAllowed)
        {
            return [];
        }

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Command polling failed with status {StatusCode}.", response.StatusCode);
            return [];
        }

        return await response.Content.ReadFromJsonAsync<IReadOnlyList<CommandJob>>(JsonOptions, cancellationToken) ?? [];
    }

    public async Task SendCommandResultAsync(CommandResult result, CancellationToken cancellationToken)
    {
        var options = configStore.Load();
        if (string.IsNullOrWhiteSpace(options.DeviceToken)) return;

        using var request = new HttpRequestMessage(HttpMethod.Post, "api/agent/command-result")
        {
            Content = JsonContent.Create(result, options: JsonOptions)
        };
        request.Headers.Authorization = new("Bearer", options.DeviceToken);
        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode && response.StatusCode != HttpStatusCode.NotFound)
        {
            logger.LogWarning("Command result upload failed with status {StatusCode}.", response.StatusCode);
        }
    }

    private async Task<bool> SendMetricsFallbackAsync(AgentMetricDto metric, string token, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "api/agent/metrics")
        {
            Content = JsonContent.Create(metric, options: JsonOptions)
        };
        request.Headers.Authorization = new("Bearer", token);

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (response.IsSuccessStatusCode) return true;

        logger.LogWarning("Metrics fallback failed with status {StatusCode}: {Body}", response.StatusCode, await response.Content.ReadAsStringAsync(cancellationToken));
        return false;
    }
}
