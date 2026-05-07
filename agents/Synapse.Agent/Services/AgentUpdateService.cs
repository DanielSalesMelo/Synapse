namespace Synapse.Agent.Services;

public sealed class AgentUpdateService(ILogger<AgentUpdateService> logger)
{
    public async Task RunAsync(CancellationToken cancellationToken)
    {
        logger.LogInformation("Agent update service initialized. Auto-update is reserved for the next release gate.");
        while (!cancellationToken.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromHours(6), cancellationToken);
        }
    }
}
