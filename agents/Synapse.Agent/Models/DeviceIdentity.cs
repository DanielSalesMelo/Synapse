namespace Synapse.Agent.Models;

public sealed record DeviceIdentity(
    string Hostname,
    string IpAddress,
    string MacAddress,
    string OperatingSystem,
    string Architecture,
    string Fingerprint,
    string? AnyDeskId,
    string AgentVersion);
