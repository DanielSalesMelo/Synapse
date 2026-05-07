using System.Net.WebSockets;
using System.Text;
using Microsoft.Extensions.Options;
using Synapse.Agent.Config;

namespace Synapse.Agent.Services;

public sealed class WebSocketClientService(IOptions<AgentOptions> options, ConfigStore configStore, ILogger<WebSocketClientService> logger)
{
    public async Task RunAsync(CancellationToken cancellationToken)
    {
        if (!options.Value.EnableWebSocket)
        {
            logger.LogInformation("Realtime WebSocket is disabled until the backend channel is enabled.");
            return;
        }

        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                await ConnectOnceAsync(cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "WebSocket connection failed. Reconnecting soon.");
            }

            await Task.Delay(TimeSpan.FromSeconds(10), cancellationToken);
        }
    }

    private async Task ConnectOnceAsync(CancellationToken cancellationToken)
    {
        var cfg = configStore.Load();
        if (string.IsNullOrWhiteSpace(cfg.DeviceToken)) return;

        var baseUri = new Uri(cfg.ServerUrl.TrimEnd('/') + "/");
        var builder = new UriBuilder(baseUri)
        {
            Scheme = baseUri.Scheme.Equals("https", StringComparison.OrdinalIgnoreCase) ? "wss" : "ws",
            Path = cfg.WebSocketPath.TrimStart('/')
        };

        using var socket = new ClientWebSocket();
        socket.Options.SetRequestHeader("Authorization", $"Bearer {cfg.DeviceToken}");
        await socket.ConnectAsync(builder.Uri, cancellationToken);
        logger.LogInformation("WebSocket connected to {Uri}.", builder.Uri);

        var hello = Encoding.UTF8.GetBytes("{\"type\":\"agent.hello\",\"runtime\":\"dotnet\",\"version\":\"" + cfg.AgentVersion + "\"}");
        await socket.SendAsync(hello, WebSocketMessageType.Text, true, cancellationToken);

        var buffer = new byte[8192];
        while (socket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
        {
            var result = await socket.ReceiveAsync(buffer, cancellationToken);
            if (result.MessageType == WebSocketMessageType.Close)
            {
                await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "server requested close", cancellationToken);
                return;
            }
        }
    }
}
