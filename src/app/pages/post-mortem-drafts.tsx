import { useState, useRef, useEffect } from "react";
import { PageTransition } from "../components/page-transition";
import { motion, AnimatePresence } from "motion/react";
import { Save, X, Pencil } from "lucide-react";
import { usePipeline } from "../contexts/pipeline-context";

export function PostMortemDrafts() {
  const { postMortem } = usePipeline();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(postMortem?.markdown_content || "");
  const [draftContent, setDraftContent] = useState(content);
  const [saveFlash, setSaveFlash] = useState(false);

  useEffect(() => {
    if (postMortem?.markdown_content && !isEditing && content === "") {
      setContent(postMortem.markdown_content);
      setDraftContent(postMortem.markdown_content);
    }
  }, [postMortem, isEditing, content]);

  const handleEdit = () => {
    setDraftContent(content);
    setIsEditing(true);
  };

  const handleSave = () => {
    setContent(draftContent);
    setIsEditing(false);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  };

  const handleCancel = () => {
    setDraftContent(content);
    setIsEditing(false);
  };

  return (
    <PageTransition>
      <div className="h-full p-8 max-w-5xl mx-auto">
        <div className="skeu-card p-8">
          <div className="flex items-center justify-between mb-8 relative z-[1]">
            <div className="flex items-center gap-3">
              <h1 className="text-[1.375rem] font-bold text-foreground">Post-Mortem Editor</h1>
              <AnimatePresence>
                {saveFlash && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2 }}
                    className="text-[0.875rem] font-medium text-success"
                  >
                    Saved
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="flex gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="skeu-btn px-4 py-2 text-[0.8125rem] font-medium bg-secondary text-foreground flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Discard
                  </button>
                  <button
                    onClick={handleSave}
                    className="skeu-btn px-4 py-2 text-[0.8125rem] font-medium bg-primary text-white flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleEdit}
                    className="skeu-btn px-4 py-2 text-[0.8125rem] font-medium bg-secondary text-foreground flex items-center gap-2"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button className="skeu-btn px-4 py-2 text-[0.8125rem] font-medium bg-success text-white flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                    </svg>
                    Publish to Slack
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="relative z-[1]">
            {isEditing ? (
              <textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                className="w-full min-h-[600px] skeu-gauge bg-code-bg p-5 text-foreground text-[0.8125rem] font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary"
                spellCheck={false}
              />
            ) : (
              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-foreground space-y-6">
                  {content.split('\n\n').map((block, index) => {
                    if (block.startsWith('#')) {
                      const level = block.match(/^#+/)?.[0].length || 1;
                      const text = block.replace(/^#+\s*/, '');

                      if (level === 1) {
                        return <h1 key={index} className="text-xl font-bold text-foreground mb-4">{text}</h1>;
                      }
                      return <h2 key={index} className="text-base font-semibold text-foreground mt-5 mb-2">{text}</h2>;
                    }

                    if (block.startsWith('```')) {
                      const lines = block.split('\n');
                      const language = lines[0].replace('```', '');
                      const code = lines.slice(1, -1).join('\n');

                      return (
                        <div key={index} className="my-4">
                          <div className="skeu-gauge bg-code-bg p-4 overflow-x-auto">
                            <div className="text-[0.6875rem] text-muted-foreground mb-1.5">{language}</div>
                            <pre className="text-[0.8125rem] text-success" style={{ fontFamily: 'var(--font-family-mono)' }}>
                              {code}
                            </pre>
                          </div>
                        </div>
                      );
                    }

                    if (block.startsWith('**')) {
                      const text = block.replace(/\*\*/g, '');
                      return <h3 key={index} className="text-sm font-semibold text-foreground mt-5 mb-1.5">{text}</h3>;
                    }

                    if (block.startsWith('- ')) {
                      const items = block.split('\n').filter(line => line.startsWith('- '));
                      return (
                        <ul key={index} className="space-y-2 my-3">
                          {items.map((item, i) => {
                            const content = item.replace(/^-\s*/, '');
                            const hasCheckbox = content.startsWith('[ ]');
                            const text = hasCheckbox ? content.replace(/^\[\s*\]\s*/, '') : content;

                            return (
                              <li key={i} className="text-muted-foreground flex items-start gap-2 text-[0.8125rem]">
                                {hasCheckbox && (
                                  <input
                                    type="checkbox"
                                    className="skeu-checkbox mt-0.5"
                                  />
                                )}
                                <span>{text}</span>
                              </li>
                            );
                          })}
                        </ul>
                      );
                    }

                    return <p key={index} className="text-muted-foreground leading-relaxed my-2 text-[0.8125rem]">{block}</p>;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}