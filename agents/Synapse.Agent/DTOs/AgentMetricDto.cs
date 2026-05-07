using System.Text.Json.Serialization;

namespace Synapse.Agent.DTOs;

public sealed class AgentMetricDto
{
    [JsonPropertyName("hostname")]
    public string Hostname { get; set; } = "";

    [JsonPropertyName("timestamp")]
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;

    [JsonPropertyName("agent_version")]
    public string AgentVersion { get; set; } = "";

    [JsonPropertyName("logged_user")]
    public string LoggedUser { get; set; } = "";

    [JsonPropertyName("ip")]
    public string Ip { get; set; } = "";

    [JsonPropertyName("os")]
    public string OperatingSystem { get; set; } = "";

    [JsonPropertyName("memory_total_mb")]
    public long? MemoryTotalMb { get; set; }

    [JsonPropertyName("memory_used_mb")]
    public long? MemoryUsedMb { get; set; }

    [JsonPropertyName("memory_percent")]
    public double? MemoryPercent { get; set; }

    [JsonPropertyName("cpu_uso")]
    public double? CpuUsage { get; set; }

    [JsonPropertyName("disco_total_gb")]
    public double? DiskTotalGb { get; set; }

    [JsonPropertyName("disco_usado_gb")]
    public double? DiskUsedGb { get; set; }

    [JsonPropertyName("disco_uso_pct")]
    public double? DiskUsagePercent { get; set; }

    [JsonPropertyName("uptime")]
    public long? UptimeSeconds { get; set; }

    [JsonPropertyName("anydesk_id")]
    public string? AnyDeskId { get; set; }

    [JsonPropertyName("hardware")]
    public HardwareDto Hardware { get; set; } = new();

    [JsonPropertyName("gpus")]
    public IReadOnlyList<GpuDto> Gpus { get; set; } = [];

    [JsonPropertyName("disks")]
    public IReadOnlyList<DiskDto> Disks { get; set; } = [];

    [JsonPropertyName("network_interfaces")]
    public IReadOnlyList<NetworkAdapterDto> NetworkInterfaces { get; set; } = [];
}

public sealed class HardwareDto
{
    [JsonPropertyName("cpu_model")]
    public string? CpuModel { get; set; }

    [JsonPropertyName("cpu_socket")]
    public string? CpuSocket { get; set; }

    [JsonPropertyName("serial_number")]
    public string? SerialNumber { get; set; }

    [JsonPropertyName("asset_tag")]
    public string? AssetTag { get; set; }

    [JsonPropertyName("motherboard")]
    public MotherboardDto Motherboard { get; set; } = new();

    [JsonPropertyName("bios")]
    public BiosDto Bios { get; set; } = new();
}

public sealed class MotherboardDto
{
    [JsonPropertyName("vendor")]
    public string? Vendor { get; set; }

    [JsonPropertyName("model")]
    public string? Model { get; set; }

    [JsonPropertyName("serial")]
    public string? Serial { get; set; }
}

public sealed class BiosDto
{
    [JsonPropertyName("version")]
    public string? Version { get; set; }
}

public sealed record GpuDto([property: JsonPropertyName("name")] string Name);
public sealed record DiskDto(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("total_gb")] double TotalGb,
    [property: JsonPropertyName("used_gb")] double UsedGb,
    [property: JsonPropertyName("usage_percent")] double UsagePercent);
public sealed record NetworkAdapterDto(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("ip")] string? IpAddress,
    [property: JsonPropertyName("mac")] string? MacAddress,
    [property: JsonPropertyName("gateways")] string[] Gateways,
    [property: JsonPropertyName("dns_servers")] string[] DnsServers);
