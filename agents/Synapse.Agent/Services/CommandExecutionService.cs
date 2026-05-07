using Microsoft.Extensions.Options;
using Synapse.Agent.Config;
using Synapse.Agent.Infrastructure;
using Synapse.Agent.Models;
using Synapse.Agent.Security;

namespace Synapse.Agent.Services;

public sealed class CommandExecutionService(
    IOptions<AgentOptions> options,
    SynapseApiClient api,
    PolicyValidationService policy,
    PowerShellService powerShell,
    ILogger<CommandExecutionService> logger)
{
    public async Task RunAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                if (options.Value.EnableCommandExecution)
                {
                    var jobs = await api.PollCommandJobsAsync(cancellationToken);
                    foreach (var job in jobs)
                    {
                        await ExecuteJobAsync(job, cancellationToken);
                    }
                }
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Command execution loop failed.");
            }

            await Task.Delay(TimeSpan.FromSeconds(Math.Max(5, options.Value.CommandPollIntervalSeconds)), cancellationToken);
        }
    }

    private async Task ExecuteJobAsync(CommandJob job, CancellationToken cancellationToken)
    {
        var decision = policy.Validate(job);
        if (!decision.Allowed)
        {
            await api.SendCommandResultAsync(new CommandResult
            {
                JobId = job.Id,
                Status = "blocked",
                ErrorOutput = decision.Reason,
                ExitCode = 126,
                StartedAt = DateTimeOffset.UtcNow,
                FinishedAt = DateTimeOffset.UtcNow
            }, cancellationToken);
            return;
        }

        CommandResult result;
        if (job.ShellType.Equals("powershell", StringComparison.OrdinalIgnoreCase))
        {
            result = await powerShell.ExecuteAsync(job, TimeSpan.FromSeconds(options.Value.MaxCommandSeconds), cancellationToken);
        }
        else
        {
            result = new CommandResult
            {
                JobId = job.Id,
                Status = "blocked",
                ErrorOutput = "Only PowerShell SDK execution is implemented in v2 alpha.",
                ExitCode = 126,
                StartedAt = DateTimeOffset.UtcNow,
                FinishedAt = DateTimeOffset.UtcNow
            };
        }

        await api.SendCommandResultAsync(result, cancellationToken);
    }
}
