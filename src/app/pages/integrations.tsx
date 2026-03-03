import { PageTransition } from "../components/page-transition";

export function Integrations() {
  const integrations = [
    { name: 'Datadog', status: 'Connected', icon: '📊', description: 'Application monitoring and analytics' },
    { name: 'PagerDuty', status: 'Connected', icon: '🔔', description: 'Incident management and alerting' },
    { name: 'Slack', status: 'Connected', icon: '💬', description: 'Team communication and notifications' },
    { name: 'GitHub', status: 'Not Connected', icon: '🐙', description: 'Source control and deployments' },
    { name: 'Jira', status: 'Not Connected', icon: '📋', description: 'Issue tracking and project management' },
  ];

  return (
    <PageTransition>
      <div className="h-full p-8 max-w-5xl mx-auto">
        <div className="skeu-card p-8">
          <h1 className="text-[1.375rem] font-bold text-foreground mb-2 relative z-[1]">Integrations</h1>
          <p className="text-[0.8125rem] text-muted-foreground mb-6 relative z-[1]">Configure your integrations with monitoring and incident management tools.</p>

          <div className="space-y-4 relative z-[1]">
            {integrations.map((integration) => (
              <div key={integration.name} className="flex items-center justify-between p-4 skeu-gauge">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{integration.icon}</span>
                  <div>
                    <h3 className="text-[0.875rem] font-semibold text-foreground">{integration.name}</h3>
                    <p className="text-[0.75rem] text-muted-foreground">{integration.description}</p>
                  </div>
                </div>
                <span className={`px-3 py-1.5 text-[0.75rem] font-medium skeu-badge ${integration.status === 'Connected'
                    ? 'bg-success/10 text-success'
                    : 'bg-secondary text-muted-foreground'
                  }`}>
                  {integration.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}