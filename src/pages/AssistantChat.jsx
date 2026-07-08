import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import MessageBubble from '@/components/assistant/MessageBubble';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Plus, Loader2 } from 'lucide-react';

const AGENT_NAME = 'assistente_patrimonial';

export default function AssistantChat() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const startConversation = async () => {
    setLoading(true);
    const conv = await base44.agents.createConversation({
      agent_name: AGENT_NAME,
      metadata: { name: 'Assistente Patrimonial', description: 'Conversa com o squad de IA' },
    });
    setConversation(conv);
    setMessages(conv.messages || []);
    setLoading(false);
  };

  useEffect(() => {
    const load = async () => {
      const conversations = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      if (conversations?.length > 0) {
        const full = await base44.agents.getConversation(conversations[0].id);
        setConversation(full);
        setMessages(full.messages || []);
        setLoading(false);
      } else {
        await startConversation();
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !conversation || sending) return;
    setInput('');
    setSending(true);
    await base44.agents.addMessage(conversation, { role: 'user', content: text });
    // Registro assíncrono de consumo (fire-and-forget) — não atrasa a resposta.
    base44.functions.invoke('logCreditConsumption', {
      credits: 1, agent_name: AGENT_NAME, event_type: 'mensagem_app',
    }).catch(() => {});
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Assistente Patrimonial</h1>
            <p className="text-sm text-muted-foreground">Pesquisa, redige e revisa respostas sobre seus ativos</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={startConversation} className="gap-2">
          <Plus className="h-4 w-4" /> Nova conversa
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 bg-muted/30 border border-border rounded-xl p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">
            Pergunte algo como: "Qual o valor total dos meus veículos?" ou "Quais manutenções estão agendadas?"
          </p>
        )}
        {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 mt-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua pergunta..."
          disabled={sending}
        />
        <Button type="submit" disabled={sending || !input.trim()} className="gap-2">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Enviar
        </Button>
      </form>
    </div>
  );
}