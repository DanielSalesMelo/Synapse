using Synapse.Agent.Infrastructure;
using Synapse.Agent.Services;

namespace Synapse.Agent;

public sealed class Worker(
    ILogger<Worker> logger,
    IHostApplicationLifetime lifetime,
    SingleInstanceLock singleInstanceLock,
    DeviceRegistrationService registration,
    HeartbeatService heartbeat,
    InventoryService inventory,
    WebSocketClientService webSocket,
    CommandExecutionService commandExecution,
    AgentUpdateService updates,
    SessionManagerService sessions) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!singleInstanceLock.TryAcquire())
        {
            logger.LogWarning("Another Synapse.Agent instance is already running. Exiting.");
            lifetime.StopApplication();
            return;
        }

        logger.LogInformation("Synapse.Agent v2 starting.");
        await sessions.StartAsync(stoppingToken);
        await registration.EnsureRegisteredAsync(stoppingToken);

        _ = webSocket.RunAsync(stoppingToken);
        _ = commandExecution.RunAsync(stoppingToken);
        _ = updates.RunAsync(stoppingToken);

        var nextInventory = DateTimeOffset.MinValue;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (DateTimeOffset.UtcNow >= nextInventory)
                {
                    await inventory.RefreshAsync(stoppingToken);
                    nextInventory = DateTimeOffset.UtcNow.Add(inventory.InventoryInterval);
                }

                await heartbeat.SendAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Agent loop failed. The agent will reconnect on the next cycle.");
            }

            await Task.Delay(heartbeat.HeartbeatInterval, stoppingToken);
        }

        await sessions.StopAsync(CancellationToken.None);
        logger.LogInformation("Synapse.Agent v2 stopped.");
    }
}
