namespace Synapse.Agent.Models;

public sealed class InventorySnapshot
{
    public string Hostname { get; set; } = Environment.MachineName;
    public string LoggedUser { get; set; } = Environment.UserName;
    public string IpAddress { get; set; } = "";
    public string MacAddress { get; set; } = "";
    public string OsName { get; set; } = "";
    public string OsVersion { get; set; } = "";
    public string Architecture { get; set; } = "";
    public string? Domain { get; set; }
    public string? Workgroup { get; set; }
    public string? CpuModel { get; set; }
    public string? CpuSocket { get; set; }
    public int? CpuCores { get; set; }
    public long? RamTotalMb { get; set; }
    public string? MotherboardManufacturer { get; set; }
    public string? MotherboardModel { get; set; }
    public string? MotherboardSerial { get; set; }
    public string? BiosVersion { get; set; }
    public string? SerialNumber { get; set; }
    public string? AssetTag { get; set; }
    public string? AnyDeskId { get; set; }
    public IReadOnlyList<GpuInfo> Gpus { get; set; } = [];
    public IReadOnlyList<DiskInfo> Disks { get; set; } = [];
    public IReadOnlyList<NetworkAdapterInfo> NetworkAdapters { get; set; } = [];
    public DateTimeOffset CollectedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed record GpuInfo(string Name);
public sealed record DiskInfo(string Name, double TotalGb, double UsedGb, double UsagePercent);
public sealed record NetworkAdapterInfo(string Name, string? IpAddress, string? MacAddress, string[] Gateways, string[] DnsServers);
