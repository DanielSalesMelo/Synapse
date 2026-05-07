using System.Management.Automation;
using Synapse.Agent.Models;

namespace Synapse.Agent.Services;

public sealed class PowerShellService(ILogger<PowerShellService> logger)
{
    public async Task<CommandResult> ExecuteAsync(CommandJob job, TimeSpan timeout, CancellationToken cancellationToken)
    {
        var started = DateTimeOffset.UtcNow;
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutCts.CancelAfter(timeout);

        using var ps = PowerShell.Create();
        ps.AddScript(job.Command);

        using var registration = timeoutCts.Token.Register(() =>
        {
            try { ps.Stop(); } catch { /* best effort cancellation */ }
        });

        try
        {
            var output = await Task.Run(() => ps.Invoke(), timeoutCts.Token);
            var errors = ps.Streams.Error.Select(e => e.ToString()).Where(e => !string.IsNullOrWhiteSpace(e));
            var result = string.Join(Environment.NewLine, output.Select(o => o?.ToString()).Where(o => !string.IsNullOrWhiteSpace(o)));
            var errorText = string.Join(Environment.NewLine, errors);

            return new CommandResult
            {
                JobId = job.Id,
                Status = ps.HadErrors ? "failed" : "completed",
                Output = result,
                ErrorOutput = errorText,
                ExitCode = ps.HadErrors ? 1 : 0,
                StartedAt = started,
                FinishedAt = DateTimeOffset.UtcNow
            };
        }
        catch (OperationCanceledException)
        {
            logger.LogWarning("PowerShell job {JobId} cancelled by timeout.", job.Id);
            return new CommandResult
            {
                JobId = job.Id,
                Status = "cancelled",
                ErrorOutput = "Command cancelled by timeout.",
                ExitCode = 124,
                StartedAt = started,
                FinishedAt = DateTimeOffset.UtcNow
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "PowerShell job {JobId} failed.", job.Id);
            return new CommandResult
            {
                JobId = job.Id,
                Status = "failed",
                ErrorOutput = ex.Message,
                ExitCode = 1,
                StartedAt = started,
                FinishedAt = DateTimeOffset.UtcNow
            };
        }
    }
}
