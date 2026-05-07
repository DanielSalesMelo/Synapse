namespace Synapse.Agent.Logging;

public sealed class StructuredLog(ILogger<StructuredLog> logger)
{
    public void Event(string eventName, object? metadata = null)
    {
        logger.LogInformation("agent_event {EventName} {@Metadata}", eventName, metadata);
    }

    public void Security(string eventName, object? metadata = null)
    {
        logger.LogWarning("agent_security_event {EventName} {@Metadata}", eventName, metadata);
    }
}
