import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePipeline } from "../../contexts/pipeline-context";

export function TelemetryPanel() {
  const { health, telemetry, telemetrySource } = usePipeline();
  const hasIncident = health?.incident_active ?? false;
  const isDatadog = telemetrySource === "datadog";

  // Use backend telemetry if available, otherwise healthy defaults
  const data = telemetry.length > 0 ? telemetry : [
    { time: '14:00', latency: 30 },
    { time: '14:04', latency: 32 },
    { time: '14:08', latency: 31 },
    { time: '14:12', latency: 28 },
    { time: '14:16', latency: 30 },
    { time: '14:20', latency: 32 },
  ];

  return (
    <div className={`
      skeu-card p-6 min-w-0
      ${hasIncident ? 'ring-1 ring-critical/30 shadow-[0_0_24px_rgba(239,68,68,0.08)]' : ''}
    `}>
      <div className="flex items-center justify-between mb-4 relative z-[1]">
        <h2 className="text-[0.875rem] font-semibold text-foreground">
          {isDatadog ? "Live Datadog Telemetry" : "Simulated Telemetry"}
        </h2>
        <div className="flex items-center gap-2">
          {isDatadog && (
            <span className="skeu-badge px-2 py-0.5 text-[0.625rem] font-bold bg-[#632ca6]/15 text-[#632ca6]">
              DATADOG
            </span>
          )}
          <div className={`skeu-btn flex items-center gap-2 px-3 py-1.5 ${hasIncident ? 'bg-critical/5' : 'bg-success/5'}`}>
            <div className={`w-2 h-2 rounded-full ${hasIncident ? 'bg-critical' : 'bg-success'} animate-pulse`} />
            <span className={`text-[0.75rem] font-medium ${hasIncident ? 'text-critical' : 'text-success'}`}>LIVE</span>
          </div>
        </div>
      </div>

      <div className="relative w-full z-[1]" style={{ height: 320, minWidth: 0 }}>
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
              <XAxis
                dataKey="time"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                stroke="var(--border)"
              />
              <YAxis
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                stroke="var(--border)"
                label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft', fill: 'var(--muted-foreground)', style: { fontSize: '11px' } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  color: 'var(--foreground)',
                  fontSize: '12px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                }}
                labelStyle={{ color: 'var(--foreground)' }}
                itemStyle={{ color: 'var(--foreground)' }}
              />
              <Line
                type="monotone"
                dataKey="latency"
                stroke={hasIncident ? "#EF4444" : "#22C55E"}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex items-center justify-between px-2 mt-1 relative z-[1]">
        <span className="text-[0.6875rem] text-muted-foreground/40">
          Refreshes every 10s
        </span>
        <span className="text-[0.75rem] text-muted-foreground opacity-45">
          {isDatadog ? "via Datadog API" : "Simulator"}
        </span>
      </div>
    </div>
  );
}