import { usePipeline } from "../../contexts/pipeline-context";

export function SystemHealthOverview() {
  const { health } = usePipeline();

  const metrics = health?.metrics;
  const incidentActive = health?.incident_active ?? false;

  const stats = [
    {
      label: 'Critical Incidents',
      value: (health?.active_scenarios?.length || 0).toString(),
      colorClass: incidentActive ? 'text-critical' : 'text-success',
    },
    {
      label: 'Latency (ms)',
      value: metrics?.latency_ms?.toString() ?? '32',
      colorClass: (metrics?.latency_ms ?? 0) > 200 ? 'text-critical' : 'text-success',
    },
    {
      label: 'Error Rate',
      value: ((metrics?.error_rate ?? 0) * 100).toFixed(1) + '%',
      colorClass: (metrics?.error_rate ?? 0) > 0.05 ? 'text-warning' : 'text-success',
    },
    {
      label: 'CPU Usage',
      value: (metrics?.cpu_percent ?? 24) + '%',
      colorClass: (metrics?.cpu_percent ?? 0) > 70 ? 'text-warning' : 'text-success',
    },
  ];

  return (
    <div className="skeu-card p-6">
      <div className="flex items-center justify-between mb-4 relative z-[1]">
        <h2 className="text-[0.875rem] font-semibold text-foreground">System Health Overview</h2>
      </div>
      <div className="grid grid-cols-4 gap-4 relative z-[1]">
        {stats.map((stat) => (
          <div key={stat.label} className="skeu-inset p-4 flex flex-col items-center gap-2">
            <span className={`text-2xl font-bold ${stat.colorClass}`}>{stat.value}</span>
            <p className="text-[0.75rem] text-muted-foreground text-center">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
