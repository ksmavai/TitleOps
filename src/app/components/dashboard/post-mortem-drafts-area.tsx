import { Link } from "react-router";
import { Loader2 } from "lucide-react";
import { usePipeline } from "../../contexts/pipeline-context";

export function PostMortemDraftsArea() {
  const { stage, postMortem, isLoading } = usePipeline();

  // Generating state
  if (stage === "generating_postmortem" && isLoading) {
    return (
      <div className="skeu-card p-6">
        <div className="flex items-center justify-between mb-4 relative z-[1]">
          <h2 className="text-[0.875rem] font-semibold text-foreground">Post-Mortem Drafts</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-3 relative z-[1]">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-[0.8125rem] text-muted-foreground">Generating post-mortem report...</p>
        </div>
      </div>
    );
  }

  // No post-mortem yet
  if (!postMortem) {
    return (
      <div className="skeu-card p-6">
        <div className="flex items-center justify-between mb-4 relative z-[1]">
          <h2 className="text-[0.875rem] font-semibold text-foreground">Post-Mortem Drafts</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-2 relative z-[1]">
          <p className="text-[0.8125rem] text-muted-foreground">No drafts yet</p>
          <p className="text-[0.6875rem] text-muted-foreground/60">Post-mortems are auto-generated after fix execution</p>
        </div>
      </div>
    );
  }

  // Render markdown content (simple conversion)
  const renderMarkdown = (md: string) => {
    const lines = md.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];

    lines.forEach((line, i) => {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <div key={`code-${i}`} className="skeu-gauge p-3 font-mono text-[0.75rem] text-success bg-code-bg my-2 overflow-x-auto">
              <pre>{codeBuffer.join('\n')}</pre>
            </div>
          );
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      if (line.startsWith('# ')) {
        elements.push(<h3 key={i} className="font-semibold text-foreground mb-2 mt-3">{line.slice(2)}</h3>);
      } else if (line.startsWith('## ')) {
        elements.push(<h4 key={i} className="font-semibold text-muted-foreground mb-2 mt-3">{line.slice(3)}</h4>);
      } else if (line.startsWith('### ')) {
        elements.push(<h4 key={i} className="font-medium text-muted-foreground mb-1 mt-2 text-[0.8125rem]">{line.slice(4)}</h4>);
      } else if (line.startsWith('- **') || line.startsWith('- ')) {
        const content = line.startsWith('- **')
          ? line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          : line.slice(2);
        elements.push(
          <li key={i} className="text-muted-foreground ml-4" dangerouslySetInnerHTML={{ __html: content }} />
        );
      } else if (line.trim() === '') {
        // Skip empty lines
      } else {
        const htmlContent = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code class="bg-background/50 px-1 rounded text-[0.75rem]">$1</code>');
        elements.push(
          <p key={i} className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: htmlContent }} />
        );
      }
    });

    return elements;
  };

  return (
    <div className="skeu-card p-6">
      <div className="flex items-center justify-between mb-4 relative z-[1]">
        <h2 className="text-[0.875rem] font-semibold text-foreground">Post-Mortem Drafts</h2>
        <div className="flex gap-2">
          <Link
            to="/post-mortem"
            className="skeu-btn px-3 py-1.5 text-[0.75rem] font-medium text-foreground bg-secondary"
          >
            Edit
          </Link>
          <button
            className="skeu-btn px-3 py-1.5 text-[0.75rem] font-medium text-white bg-success"
          >
            Publish to Slack
          </button>
        </div>
      </div>

      <div className="space-y-1 text-[0.8125rem] text-foreground relative z-[1] max-h-80 overflow-y-auto">
        {renderMarkdown(postMortem.markdown_content)}
      </div>
    </div>
  );
}
