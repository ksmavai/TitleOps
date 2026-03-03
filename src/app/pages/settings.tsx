import { useTheme } from "../contexts/theme-context";
import { PageTransition } from "../components/page-transition";

export function Settings() {
  const { theme, toggleTheme } = useTheme();

  return (
    <PageTransition>
      <div className="h-full p-8 max-w-5xl mx-auto">
        <div className="skeu-card p-8">
          <h1 className="text-[1.375rem] font-bold text-foreground mb-2 relative z-[1]">Settings</h1>
          <p className="text-[0.8125rem] text-muted-foreground mb-6 relative z-[1]">Manage your TitleOps preferences and configurations.</p>

          <div className="space-y-6 relative z-[1]">
            {/* Appearance */}
            <div className="p-4 skeu-gauge">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[0.875rem] font-semibold text-foreground">Appearance</h3>
                  <p className="text-[0.75rem] text-muted-foreground">Switch between light and dark mode</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="skeu-btn px-3 py-1.5 text-[0.75rem] font-medium bg-secondary text-foreground"
                >
                  {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div className="p-4 skeu-gauge">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[0.875rem] font-semibold text-foreground">Notifications</h3>
                  <p className="text-[0.75rem] text-muted-foreground">Configure alert notification preferences</p>
                </div>
                <span className="px-3 py-1.5 text-[0.75rem] font-medium skeu-badge bg-success/10 text-success">Enabled</span>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="p-4 skeu-gauge">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[0.875rem] font-semibold text-foreground">AI Analysis</h3>
                  <p className="text-[0.75rem] text-muted-foreground">Auto-analyze errors and suggest fixes</p>
                </div>
                <span className="px-3 py-1.5 text-[0.75rem] font-medium skeu-badge bg-success/10 text-success">Enabled</span>
              </div>
            </div>

            {/* Data Retention */}
            <div className="p-4 skeu-gauge">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[0.875rem] font-semibold text-foreground">Data Retention</h3>
                  <p className="text-[0.75rem] text-muted-foreground">How long to keep incident logs and post-mortems</p>
                </div>
                <span className="px-3 py-1.5 text-[0.75rem] font-medium skeu-badge bg-secondary text-foreground">90 days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}