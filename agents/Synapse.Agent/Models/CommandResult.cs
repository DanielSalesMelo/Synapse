namespace Synapse.Agent.Models;

public sealed class CommandResult
{
    public string JobId { get; set; } = "";
    public string Status { get; set; } = "completed";
    public string Output { get; set; } = "";
    public string ErrorOutput { get; set; } = "";
    public int ExitCode { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset FinishedAt { get; set; }
}
