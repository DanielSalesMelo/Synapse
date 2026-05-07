namespace Synapse.Agent.Models;

public sealed class TelemetrySnapshot
{
    public double? CpuUsagePercent { get; set; }
    public double? MemoryUsagePercent { get; set; }
    public long? MemoryTotalMb { get; set; }
    public long? MemoryUsedMb { get; set; }
    public double? DiskUsagePercent { get; set; }
    public double? DiskTotalGb { get; set; }
    public double? DiskUsedGb { get; set; }
    public long? UptimeSeconds { get; set; }
    public DateTimeOffset CollectedAt { get; set; } = DateTimeOffset.UtcNow;
}
