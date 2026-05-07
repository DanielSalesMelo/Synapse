using System.Threading;

namespace Synapse.Agent.Infrastructure;

public sealed class SingleInstanceLock : IDisposable
{
    private Mutex? _mutex;

    public bool TryAcquire()
    {
        _mutex = new Mutex(initiallyOwned: true, name: @"Global\Synapse.TIAgent.v2", out var createdNew);
        return createdNew;
    }

    public void Dispose()
    {
        try
        {
            _mutex?.ReleaseMutex();
        }
        catch (ApplicationException)
        {
            // The mutex was not acquired by this process.
        }

        _mutex?.Dispose();
    }
}
