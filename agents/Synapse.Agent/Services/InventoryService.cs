using System.Net.NetworkInformation;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Synapse.Agent.Config;
using Synapse.Agent.Models;
using Synapse.Agent.Utils;

namespace Synapse.Agent.Services;

public sealed class InventoryService(IOptions<AgentOptions> options, ILogger<InventoryService> logger)
{
    private InventorySnapshot _current = new();

    public TimeSpan InventoryInterval => TimeSpan.FromMinutes(Math.Max(5, options.Value.InventoryIntervalMinutes));
    public InventorySnapshot Current => _current;

    public Task<InventorySnapshot> RefreshAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var snapshot = Collect();
        _current = snapshot;
        logger.LogInformation("Inventory refreshed for {Hostname}.", snapshot.Hostname);
        return Task.FromResult(snapshot);
    }

    public DeviceIdentity BuildIdentity()
    {
        var snapshot = _current.CollectedAt == default ? Collect() : _current;
        var os = string.Join(" ", new[] { snapshot.OsName, snapshot.OsVersion }.Where(v => !string.IsNullOrWhiteSpace(v)));
        return new DeviceIdentity(
            snapshot.Hostname,
            snapshot.IpAddress,
            snapshot.MacAddress,
            os,
            snapshot.Architecture,
            CreateFingerprint(snapshot),
            snapshot.AnyDeskId,
            options.Value.AgentVersion);
    }

    private InventorySnapshot Collect()
    {
        var computer = WmiReader.First("SELECT Manufacturer,Model,UserName,Domain,Workgroup,TotalPhysicalMemory FROM Win32_ComputerSystem");
        var os = WmiReader.First("SELECT Caption,Version,OSArchitecture,LastBootUpTime FROM Win32_OperatingSystem");
        var cpu = WmiReader.First("SELECT Name,SocketDesignation,NumberOfCores FROM Win32_Processor");
        var board = WmiReader.First("SELECT Manufacturer,Product,SerialNumber FROM Win32_BaseBoard");
        var bios = WmiReader.First("SELECT SMBIOSBIOSVersion,SerialNumber FROM Win32_BIOS");

        var adapters = CollectNetworkAdapters();
        var primaryAdapter = adapters.FirstOrDefault(a => !string.IsNullOrWhiteSpace(a.IpAddress));
        var disks = CollectDisks();
        var gpus = WmiReader.All("SELECT Name FROM Win32_VideoController")
            .Select(g => g.StringValue("Name"))
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Select(name => new GpuInfo(name!))
            .ToArray();

        var totalMemoryBytes = computer.LongValue("TotalPhysicalMemory");
        long? totalMemoryMb = totalMemoryBytes.HasValue ? totalMemoryBytes.Value / 1024 / 1024 : null;
        var serial = bios.StringValue("SerialNumber") ?? board.StringValue("SerialNumber");

        return new InventorySnapshot
        {
            Hostname = Environment.MachineName,
            LoggedUser = computer.StringValue("UserName") ?? Environment.UserName,
            IpAddress = primaryAdapter?.IpAddress ?? "",
            MacAddress = primaryAdapter?.MacAddress ?? "",
            OsName = os.StringValue("Caption") ?? Environment.OSVersion.VersionString,
            OsVersion = os.StringValue("Version") ?? "",
            Architecture = os.StringValue("OSArchitecture") ?? RuntimeInformation.ProcessArchitecture.ToString(),
            Domain = computer.StringValue("Domain"),
            Workgroup = computer.StringValue("Workgroup"),
            CpuModel = cpu.StringValue("Name"),
            CpuSocket = cpu.StringValue("SocketDesignation"),
            CpuCores = cpu.IntValue("NumberOfCores"),
            RamTotalMb = totalMemoryMb,
            MotherboardManufacturer = board.StringValue("Manufacturer"),
            MotherboardModel = board.StringValue("Product"),
            MotherboardSerial = board.StringValue("SerialNumber"),
            BiosVersion = bios.StringValue("SMBIOSBIOSVersion"),
            SerialNumber = serial,
            AssetTag = serial,
            AnyDeskId = AnyDeskDetector.Detect(),
            Gpus = gpus,
            Disks = disks,
            NetworkAdapters = adapters,
            CollectedAt = DateTimeOffset.UtcNow
        };
    }

    private static IReadOnlyList<NetworkAdapterInfo> CollectNetworkAdapters()
    {
        var wmiAdapters = WmiReader.All("SELECT Description,IPAddress,MACAddress,DefaultIPGateway,DNSServerSearchOrder FROM Win32_NetworkAdapterConfiguration WHERE IPEnabled=True");
        var adapters = new List<NetworkAdapterInfo>();
        foreach (var adapter in wmiAdapters)
        {
            var ip = adapter.StringArrayValue("IPAddress").FirstOrDefault(value => value.Contains('.') && !value.StartsWith("127."));
            adapters.Add(new NetworkAdapterInfo(
                adapter.StringValue("Description") ?? "Network Adapter",
                ip,
                adapter.StringValue("MACAddress"),
                adapter.StringArrayValue("DefaultIPGateway"),
                adapter.StringArrayValue("DNSServerSearchOrder")));
        }

        if (adapters.Count > 0) return adapters;

        return NetworkInterface.GetAllNetworkInterfaces()
            .Where(n => n.OperationalStatus == OperationalStatus.Up)
            .Select(n =>
            {
                var props = n.GetIPProperties();
                var ip = props.UnicastAddresses.Select(a => a.Address.ToString()).FirstOrDefault(v => v.Contains('.') && !v.StartsWith("127."));
                return new NetworkAdapterInfo(
                    n.Name,
                    ip,
                    n.GetPhysicalAddress().ToString(),
                    props.GatewayAddresses.Select(g => g.Address.ToString()).ToArray(),
                    props.DnsAddresses.Select(d => d.ToString()).ToArray());
            })
            .Where(n => !string.IsNullOrWhiteSpace(n.IpAddress))
            .ToArray();
    }

    private static IReadOnlyList<DiskInfo> CollectDisks()
    {
        return WmiReader.All("SELECT DeviceID,Size,FreeSpace FROM Win32_LogicalDisk WHERE DriveType=3")
            .Select(d =>
            {
                var size = d.LongValue("Size") ?? 0;
                var free = d.LongValue("FreeSpace") ?? 0;
                var used = Math.Max(0, size - free);
                var totalGb = Math.Round(size / 1024d / 1024d / 1024d, 2);
                var usedGb = Math.Round(used / 1024d / 1024d / 1024d, 2);
                var percent = size > 0 ? Math.Round(used * 100d / size, 2) : 0;
                return new DiskInfo(d.StringValue("DeviceID") ?? "Disk", totalGb, usedGb, percent);
            })
            .Where(d => d.TotalGb > 0)
            .ToArray();
    }

    private static string CreateFingerprint(InventorySnapshot snapshot)
    {
        var raw = string.Join("|", snapshot.Hostname, snapshot.MacAddress, snapshot.MotherboardSerial, snapshot.SerialNumber);
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw))).ToLowerInvariant()[..32];
    }
}
