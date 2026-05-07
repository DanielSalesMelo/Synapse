namespace Synapse.Agent.Models;

public sealed record DeviceRegistrationResult(
    string Token,
    int? DeviceId,
    int? EmpresaId,
    string? Hostname);
