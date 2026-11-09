using System;
using System.Diagnostics;
using System.IO;

// Startet die Charlotte App: installiert bei Bedarf Abhängigkeiten und öffnet den Browser.
class Launcher
{
    static int Main()
    {
        string dir = AppDomain.CurrentDomain.BaseDirectory;
        string cmd = "cd /d \"" + dir + "\" && "
            + "pnpm install && "
            + "pnpm dev --open";

        var psi = new ProcessStartInfo("cmd.exe", "/c " + cmd + " || pause");
        psi.UseShellExecute = false;
        psi.WorkingDirectory = dir;
        var p = Process.Start(psi);
        p.WaitForExit();
        return p.ExitCode;
    }
}
