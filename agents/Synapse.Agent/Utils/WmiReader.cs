using System.Management;

namespace Synapse.Agent.Utils;

public static class WmiReader
{
    public static IReadOnlyDictionary<string, object?> First(string query)
    {
        if (!OperatingSystem.IsWindows()) return new Dictionary<string, object?>();

        try
        {
            using var searcher = new ManagementObjectSearcher(query);
            foreach (ManagementObject item in searcher.Get())
            {
                using (item)
                {
                    return item.Properties
                        .Cast<PropertyData>()
                        .ToDictionary<PropertyData, string, object?>(p => p.Name, p => p.Value);
                }
            }
        }
        catch
        {
            // WMI can be unavailable on damaged Windows installations; callers use fallbacks.
        }

        return new Dictionary<string, object?>();
    }

    public static IReadOnlyList<IReadOnlyDictionary<string, object?>> All(string query)
    {
        var results = new List<IReadOnlyDictionary<string, object?>>();
        if (!OperatingSystem.IsWindows()) return results;

        try
        {
            using var searcher = new ManagementObjectSearcher(query);
            foreach (ManagementObject item in searcher.Get())
            {
                using (item)
                {
                    results.Add(item.Properties.Cast<PropertyData>().ToDictionary<PropertyData, string, object?>(p => p.Name, p => p.Value));
                }
            }
        }
        catch
        {
            // WMI can be unavailable on damaged Windows installations; callers use fallbacks.
        }

        return results;
    }

    public static string? StringValue(this IReadOnlyDictionary<string, object?> values, string key)
    {
        return values.TryGetValue(key, out var value) ? Convert.ToString(value)?.Trim() : null;
    }

    public static long? LongValue(this IReadOnlyDictionary<string, object?> values, string key)
    {
        if (!values.TryGetValue(key, out var value) || value is null) return null;
        return long.TryParse(Convert.ToString(value), out var parsed) ? parsed : null;
    }

    public static int? IntValue(this IReadOnlyDictionary<string, object?> values, string key)
    {
        if (!values.TryGetValue(key, out var value) || value is null) return null;
        return int.TryParse(Convert.ToString(value), out var parsed) ? parsed : null;
    }

    public static string[] StringArrayValue(this IReadOnlyDictionary<string, object?> values, string key)
    {
        if (!values.TryGetValue(key, out var value) || value is null) return [];
        if (value is string[] array) return array;
        if (value is IEnumerable<string> enumerable) return enumerable.ToArray();
        return [Convert.ToString(value) ?? ""];
    }
}
