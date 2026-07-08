import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, XCircle } from 'lucide-react';

const parseResults = (r) => {
  if (typeof r !== 'string') return r;
  try { return JSON.parse(r); } catch { return r; }
};

function ToolCallDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const status = toolCall.status;
  const running = ['pending', 'running', 'in_progress'].includes(status);
  const parsed = parseResults(toolCall.results);
  const failed = ['failed', 'error'].includes(status) ||
    (typeof toolCall.results === 'string' && /error|failed/i.test(toolCall.results)) ||
    parsed?.success === false;
  const proj = toolCall.display_projection;

  if (proj?.hide_details && proj?.details_redacted) {
    const label = running ? proj.active_label : failed ? proj.error_label : proj.label;
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        {running ? <Loader2 className="h-3 w-3 animate-spin" /> : failed ? <XCircle className="h-3 w-3 text-destructive" /> : <CheckCircle2 className="h-3 w-3 text-green-600" />}
        <span>{label}</span>
      </div>
    );
  }

  return (
    <div className="mt-2 text-xs border border-border rounded-lg p-2 bg-muted/40">
      <button type="button" onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 w-full text-left text-muted-foreground">
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {running ? <Loader2 className="h-3 w-3 animate-spin" /> : failed ? <XCircle className="h-3 w-3 text-destructive" /> : <CheckCircle2 className="h-3 w-3 text-green-600" />}
        <span className="font-medium">{toolCall.name}</span>
        <span>{running ? 'executando...' : failed ? 'falhou' : 'concluído'}</span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          {toolCall.arguments_string && (
            <pre className="bg-background rounded p-2 overflow-x-auto max-h-40">{(() => { try { return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2); } catch { return toolCall.arguments_string; } })()}</pre>
          )}
          {toolCall.results != null && (
            <pre className="bg-background rounded p-2 overflow-x-auto max-h-40">{typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${isUser ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-card-foreground'}`}>
        {message.content && (
          isUser
            ? <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            : <ReactMarkdown className="text-sm prose prose-sm dark:prose-invert max-w-none">{message.content}</ReactMarkdown>
        )}
        {message.tool_calls?.map((tc, i) => <ToolCallDisplay key={i} toolCall={tc} />)}
      </div>
    </div>
  );
}