namespace Synapse.Agent.Infrastructure;

public sealed record AgentPaths(string DataDirectory, string ConfigDirectory, string LogDirectory)
{
    public static AgentPaths Create()
    {
        var programData = Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData);
        if (string.IsNullOrWhiteSpace(programData))
        {
            programData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        }

        var root = Path.Combine(programData, "Synapse", "Agent");
        return new AgentPaths(
            root,
            Path.Combine(root, "Config"),
            Path.Combine(root, "Logs"));
    }
}
