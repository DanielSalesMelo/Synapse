using Synapse.Agent.Logging;

namespace Synapse.Agent.Services;

public sealed class SessionManagerService(StructuredLog structuredLog)
{
    public Task StartAsync(CancellationToken cancellationToken)
    {
        structuredLog.Event("agent.session.started", new { machine = Environment.MachineName, startedAt = DateTimeOffset.UtcNow });
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        structuredLog.Event("agent.session.ended", new { machine = Environment.MachineName, stoppedAt = DateTimeOffset.UtcNow });
        return Task.CompletedTask;
    }
}
