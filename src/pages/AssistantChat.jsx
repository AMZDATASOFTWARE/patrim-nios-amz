import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import MessageBubble from '@/components/assistant/MessageBubble';
import ConversationList from '@/components/assistant/ConversationList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Loader2, History, MessageCircle } from 'lucide-react';

const AGENT_NAME = 'assistente_patrimonial';

export default function AssistantChat() {
  const [conversations, setConversations] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showList, setShowList] = useState(false); // histórico no mobile
  const hiddenIdsRef = useRef([]);
  const bottomRef = useRef(null);

  const openConversation = async (id) => {
    setShowList(false);
    const full = await base44.agents.getConversation(id);
    setConversation(full);
    setMessages(full.messages || []);
  };

  const startConversation = async () => {
    setShowList(false);
    const conv = await base44.agents.createConversation({
      agent_name: AGENT_NAME,
      metadata: { name: `Conversa de ${new Date().toLocaleDateString('pt-BR')}`, description: 'Conversa com o squad de IA' },
    });
    setConversations((prev) => [conv, ...prev]);
    setConversation(conv);
    setMessages(conv.messages || []);
  };

  useEffect(() => {
    const load = async () => {
      // "Apagar" = ocultar: os ids ficam salvos no perfil do usuário.
      const me = await base44.auth.me();
      hiddenIdsRef.current = me.hidden_conversation_ids || [];
      const all = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      const visible = (all || []).filter((c) => !hiddenIdsRef.current.includes(c.id));
      setConversations(visible);
      if (visible.length > 0) {
        await openConversation(visible[0].id);
      } else {
        await startConversation();
      }
      setLoading(false);
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

  const handleDelete = async (id) => {
    hiddenIdsRef.current = [...hiddenIdsRef.current, id];
    await base44.auth.updateMe({ hidden_conversation_ids: hiddenIdsRef.current });
    const remaining = conversations.filter((c) => c.id !== id);
    setConversations(remaining);
    if (conversation?.id === id) {
      if (remaining.length > 0) await openConversation(remaining[0].id);
      else await startConversation();
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !conversation || sending) return;
    setInput('');
    setSending(true);
    await base44.agents.addMessage(conversation, { role: 'user', content: text });
    // Registro assíncrono de consumo (fire-and-forget) — não atrasa a resposta.
    base44.functions.invoke('logCreditConsumption', {
      credits: 1, credit_type: 'message', agent_name: AGENT_NAME, event_type: 'mensagem_app',
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
    <div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Assistente Patrimonial</h1>
            <p className="text-sm text-muted-foreground">Pesquisa, redige e revisa respostas sobre seus ativos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={base44.agents.getWhatsAppConnectURL(AGENT_NAME)} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <MessageCircle className="h-4 w-4 text-green-500" /> Conversar no WhatsApp
            </Button>
          </a>
          <Button variant="outline" size="sm" onClick={() => setShowList(!showList)} className="gap-2 md:hidden">
            <History className="h-4 w-4" /> Histórico
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Histórico — sempre visível no desktop; alternável no mobile */}
        <div className={`${showList ? 'flex' : 'hidden'} md:flex w-full md:w-64 shrink-0 bg-card border border-border rounded-xl p-3`}>
          <ConversationList
            conversations={conversations}
            activeId={conversation?.id}
            onSelect={openConversation}
            onDelete={handleDelete}
            onNew={startConversation}
          />
        </div>

        {/* Área de chat */}
        <div className={`${showList ? 'hidden' : 'flex'} md:flex flex-col flex-1 min-w-0`}>
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
      </div>
    </div>
  );
}