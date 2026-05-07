using System.Text.RegularExpressions;

namespace Synapse.Agent.Utils;

public static class AnyDeskDetector
{
    private static readonly Regex IdRegex = new(@"(?:ad\.anynet\.id|anydesk[_-]?id)\s*=\s*(?<id>[0-9]{6,})", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static string? Detect()
    {
        foreach (var path in CandidateFiles())
        {
            try
            {
                if (!File.Exists(path)) continue;
                var text = File.ReadAllText(path);
                var match = IdRegex.Match(text);
                if (match.Success) return match.Groups["id"].Value;
            }
            catch
            {
                // Detection must never break heartbeat.
            }
        }

        return null;
    }

    private static IEnumerable<string> CandidateFiles()
    {
        var programData = Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData);
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);

        yield return Path.Combine(programData, "AnyDesk", "system.conf");
        yield return Path.Combine(programData, "AnyDesk", "user.conf");
        yield return Path.Combine(appData, "AnyDesk", "system.conf");
        yield return Path.Combine(appData, "AnyDesk", "user.conf");
    }
}
