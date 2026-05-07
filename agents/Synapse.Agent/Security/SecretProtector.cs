using System.Security.Cryptography;
using System.Text;

namespace Synapse.Agent.Security;

public static class SecretProtector
{
    public static string? Protect(string value)
    {
        if (string.IsNullOrEmpty(value)) return null;

        if (!OperatingSystem.IsWindows())
        {
            return Convert.ToBase64String(Encoding.UTF8.GetBytes(value));
        }

        var bytes = ProtectedData.Protect(
            Encoding.UTF8.GetBytes(value),
            optionalEntropy: null,
            scope: DataProtectionScope.LocalMachine);
        return Convert.ToBase64String(bytes);
    }

    public static string? Unprotect(string value)
    {
        if (string.IsNullOrEmpty(value)) return null;

        try
        {
            var bytes = Convert.FromBase64String(value);
            if (!OperatingSystem.IsWindows())
            {
                return Encoding.UTF8.GetString(bytes);
            }

            var clear = ProtectedData.Unprotect(bytes, optionalEntropy: null, scope: DataProtectionScope.LocalMachine);
            return Encoding.UTF8.GetString(clear);
        }
        catch
        {
            return null;
        }
    }
}
