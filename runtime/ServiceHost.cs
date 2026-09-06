using System;
using System.Diagnostics;
using System.IO;
using System.Threading;

// Windows-subsystem host: no console to inherit a terminal close/Ctrl-C event.
internal static class ServiceHost {
  static readonly string Root=AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
  static readonly string StopFile=Path.Combine(Root,"stop.request");
  static readonly object LogLock=new object();
  static void Log(string message){try{lock(LogLock){var p=Path.Combine(Root,"logs","host.log");if(File.Exists(p)&&new FileInfo(p).Length>2000000){var previous=p+".1";if(File.Exists(previous))File.Delete(previous);File.Move(p,previous);}File.AppendAllText(p,DateTime.UtcNow.ToString("o")+" "+message+Environment.NewLine);}}catch{}}
  [STAThread]
  static int Main(){
    bool created;
    using(var single=new Mutex(true,"Local\\BilibiliCreatorInsightsLocal25758",out created)){
      if(!created)return 0;
      try{
        Directory.CreateDirectory(Path.Combine(Root,"logs"));
        if(File.Exists(StopFile))File.Delete(StopFile);
        File.WriteAllText(Path.Combine(Root,"host.pid"),Process.GetCurrentProcess().Id.ToString());
        Log("host_started pid="+Process.GetCurrentProcess().Id);
        int failures=0;
        while(!File.Exists(StopFile)){
          var launched=DateTime.UtcNow;
          try{
            var start=new ProcessStartInfo(Path.Combine(Root,"bin","node.exe"));
            start.Arguments="--use-env-proxy \""+Path.Combine(Root,"server.mjs")+"\" \""+Root+"\"";
            start.WorkingDirectory=Root;start.UseShellExecute=false;start.CreateNoWindow=true;start.WindowStyle=ProcessWindowStyle.Hidden;
            start.RedirectStandardError=true;start.RedirectStandardOutput=true;
            foreach(var key in new[]{"HTTP_PROXY","HTTPS_PROXY","ALL_PROXY","NO_PROXY"}){
              var value=Environment.GetEnvironmentVariable(key,EnvironmentVariableTarget.User);
              if(String.IsNullOrEmpty(value))value=Environment.GetEnvironmentVariable(key,EnvironmentVariableTarget.Machine);
              if(String.IsNullOrEmpty(value))start.EnvironmentVariables.Remove(key);else start.EnvironmentVariables[key]=value;
            }
            start.EnvironmentVariables["BILIBILI_SUPERVISOR_PID"]=Process.GetCurrentProcess().Id.ToString();
            using(var child=new Process()){
              child.StartInfo=start;
              child.ErrorDataReceived+=(sender,e)=>{if(e.Data!=null)Log("node: "+e.Data);};
              child.OutputDataReceived+=(sender,e)=>{if(e.Data!=null)Log("node: "+e.Data);};
              child.Start();child.BeginErrorReadLine();child.BeginOutputReadLine();
              Log("service_started pid="+child.Id);
              child.WaitForExit();Log("service_exited code="+child.ExitCode);
            }
          }catch(Exception e){Log("start_error "+e.GetType().Name+": "+e.Message);}
          if(File.Exists(StopFile))break;
          if((DateTime.UtcNow-launched).TotalMinutes>10)failures=0;
          failures=Math.Min(5,failures+1);var delay=Math.Min(60,(int)Math.Pow(2,failures)*2);
          Log("retry_in_seconds="+delay);
          for(int i=0;i<delay*2&&!File.Exists(StopFile);i++)Thread.Sleep(500);
        }
        Log("host_stopped");return 0;
      }finally{single.ReleaseMutex();}
    }
  }
}
