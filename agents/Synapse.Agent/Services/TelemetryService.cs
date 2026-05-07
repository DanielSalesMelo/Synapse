using Synapse.Agent.Models;
using Synapse.Agent.Utils;

namespace Synapse.Agent.Services;

public sealed class TelemetryService(InventoryService inventory)
{
    public Task<TelemetrySnapshot> CollectAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var cpu = WmiReader.First("SELECT LoadPercentage FROM Win32_Processor").IntValue("LoadPercentage");
        var os = WmiReader.First("SELECT TotalVisibleMemorySize,FreePhysicalMemory FROM Win32_OperatingSystem");
        var currentInventory = inventory.Current;
        var totalKb = os.LongValue("TotalVisibleMemorySize");
        var freeKb = os.LongValue("FreePhysicalMemory");
        long? totalMb = totalKb.HasValue ? totalKb.Value / 1024 : currentInventory.RamTotalMb;
        long? usedMb = totalKb.HasValue && freeKb.HasValue ? (totalKb.Value - freeKb.Value) / 1024 : null;
        double? memoryPercent = totalKb > 0 && usedMb.HasValue ? Math.Round(usedMb.Value * 100d / (totalKb.Value / 1024d), 2) : null;
        var diskTotal = currentInventory.Disks.Sum(d => d.TotalGb);
        var diskUsed = currentInventory.Disks.Sum(d => d.UsedGb);

        return Task.FromResult(new TelemetrySnapshot
        {
            CpuUsagePercent = cpu,
            MemoryTotalMb = totalMb,
            MemoryUsedMb = usedMb,
            MemoryUsagePercent = memoryPercent,
            DiskTotalGb = diskTotal > 0 ? Math.Round(diskTotal, 2) : null,
            DiskUsedGb = diskUsed > 0 ? Math.Round(diskUsed, 2) : null,
            DiskUsagePercent = diskTotal > 0 ? Math.Round(diskUsed * 100d / diskTotal, 2) : null,
            UptimeSeconds = Environment.TickCount64 / 1000,
            CollectedAt = DateTimeOffset.UtcNow
        });
    }
}
