using Microsoft.Extensions.Hosting.WindowsServices;
using Serilog;
using Synapse.Agent;
using Synapse.Agent.Config;
using Synapse.Agent.Infrastructure;
using Synapse.Agent.Logging;
using Synapse.Agent.Security;
using Synapse.Agent.Services;

var builder = Host.CreateApplicationBuilder(args);

var paths = AgentPaths.Create();
Directory.CreateDirectory(paths.ConfigDirectory);
Directory.CreateDirectory(paths.LogDirectory);

builder.Services.Configure<AgentOptions>(builder.Configuration.GetSection(AgentOptions.SectionName));
builder.Services.AddSingleton(paths);
builder.Services.AddSingleton<ConfigStore>();
builder.Services.AddSingleton<SingleInstanceLock>();
builder.Services.AddSingleton<StructuredLog>();
builder.Services.AddHttpClient<SynapseApiClient>((serviceProvider, client) =>
{
    var store = serviceProvider.GetRequiredService<ConfigStore>();
    var options = store.Load();
    client.BaseAddress = new Uri(options.ServerUrl.TrimEnd('/') + "/");
    client.Timeout = TimeSpan.FromSeconds(30);
});

builder.Services.AddSingleton<DeviceRegistrationService>();
builder.Services.AddSingleton<InventoryService>();
builder.Services.AddSingleton<TelemetryService>();
builder.Services.AddSingleton<HeartbeatService>();
builder.Services.AddSingleton<PolicyValidationService>();
builder.Services.AddSingleton<PowerShellService>();
builder.Services.AddSingleton<CommandExecutionService>();
builder.Services.AddSingleton<WebSocketClientService>();
builder.Services.AddSingleton<AgentUpdateService>();
builder.Services.AddSingleton<SessionManagerService>();
builder.Services.AddHostedService<Worker>();

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .Enrich.WithProperty("component", "Synapse.Agent")
    .WriteTo.Console()
    .WriteTo.File(
        new Serilog.Formatting.Json.JsonFormatter(),
        Path.Combine(paths.LogDirectory, "synapse-agent-.jsonl"),
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 14)
    .CreateLogger();

builder.Logging.ClearProviders();
builder.Logging.AddSerilog(Log.Logger, dispose: true);

if (WindowsServiceHelpers.IsWindowsService())
{
    builder.Services.AddWindowsService(options =>
    {
        options.ServiceName = "Synapse TI Agent";
    });
}

await builder.Build().RunAsync();
