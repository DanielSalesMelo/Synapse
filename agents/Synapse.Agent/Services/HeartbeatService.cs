using Microsoft.Extensions.Options;
using Synapse.Agent.Config;
using Synapse.Agent.DTOs;
using Synapse.Agent.Infrastructure;

namespace Synapse.Agent.Services;

public sealed class HeartbeatService(
    IOptions<AgentOptions> options,
    InventoryService inventory,
    TelemetryService telemetry,
    SynapseApiClient api,
    ILogger<HeartbeatService> logger)
{
    public TimeSpan HeartbeatInterval => TimeSpan.FromSeconds(Math.Max(15, options.Value.HeartbeatIntervalSeconds));

    public async Task SendAsync(CancellationToken cancellationToken)
    {
        var inv = inventory.Current;
        var tel = await telemetry.CollectAsync(cancellationToken);

        var metric = new AgentMetricDto
        {
            Hostname = inv.Hostname,
            Timestamp = DateTimeOffset.UtcNow,
            AgentVersion = options.Value.AgentVersion,
            LoggedUser = inv.LoggedUser,
            Ip = inv.IpAddress,
            OperatingSystem = $"{inv.OsName} {inv.OsVersion}".Trim(),
            CpuUsage = tel.CpuUsagePercent,
            MemoryTotalMb = tel.MemoryTotalMb,
            MemoryUsedMb = tel.MemoryUsedMb,
            MemoryPercent = tel.MemoryUsagePercent,
            DiskTotalGb = tel.DiskTotalGb,
            DiskUsedGb = tel.DiskUsedGb,
            DiskUsagePercent = tel.DiskUsagePercent,
            UptimeSeconds = tel.UptimeSeconds,
            AnyDeskId = inv.AnyDeskId,
            Hardware = new HardwareDto
            {
                CpuModel = inv.CpuModel,
                CpuSocket = inv.CpuSocket,
                SerialNumber = inv.SerialNumber,
                AssetTag = inv.AssetTag,
                Motherboard = new MotherboardDto
                {
                    Vendor = inv.MotherboardManufacturer,
                    Model = inv.MotherboardModel,
                    Serial = inv.MotherboardSerial
                },
                Bios = new BiosDto { Version = inv.BiosVersion }
            },
            Gpus = inv.Gpus.Select(g => new GpuDto(g.Name)).ToArray(),
            Disks = inv.Disks.Select(d => new DiskDto(d.Name, d.TotalGb, d.UsedGb, d.UsagePercent)).ToArray(),
            NetworkInterfaces = inv.NetworkAdapters.Select(n => new NetworkAdapterDto(n.Name, n.IpAddress, n.MacAddress, n.Gateways, n.DnsServers)).ToArray()
        };

        var sent = await api.SendHeartbeatAsync(metric, cancellationToken);
        if (sent)
        {
            logger.LogInformation("Heartbeat sent for {Hostname}.", inv.Hostname);
        }
    }
}
