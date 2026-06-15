import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  type ChatMessage,
  type InteractionReport,
  type PharmacyChatSession,
  endChatSession,
  fetchMessages,
  formatReportAsMessage,
  sendMessage,
} from "@/lib/telepharmacy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Send, ShieldCheck, X, Sparkles, ClipboardList } from "lucide-react";
import { toast } from "sonner";

interface Props {
  session: PharmacyChatSession;
  meId: string;
  role: "patient" | "pharmacist";
  counterpartyName: string;
  onClosed: () => void;
  quickReplies?: string[];
}

export function SecureChatPanel({ session, meId, role, counterpartyName, onClosed, quickReplies }: Props) {
  const [showContext, setShowContext] = useState(false);
  const report: InteractionReport | null = session.interaction_report;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [ending, setEnding] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Initial load + ensure the auto-injected report is the first message (patient side).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const msgs = await fetchMessages(session.id);
      if (cancelled) return;
      if (msgs.length === 0 && role === "patient" && session.interaction_report) {
        await sendMessage({
          sessionId: session.id,
          senderId: meId,
          role: "patient",
          body: formatReportAsMessage(session.interaction_report),
        });
        const fresh = await fetchMessages(session.id);
        if (!cancelled) setMessages(fresh);
      } else {
        setMessages(msgs);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.id, session.interaction_report, role, meId]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel(`chat-${session.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pharmacy_chat_messages", filter: `session_id=eq.${session.id}` },
        (payload) => setMessages((prev) => [...prev, payload.new as ChatMessage]),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pharmacy_chat_sessions", filter: `id=eq.${session.id}` },
        (payload) => {
          const s = payload.new as PharmacyChatSession;
          if (s.status === "ended" || s.status === "declined") onClosed();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [session.id, onClosed]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      await sendMessage({ sessionId: session.id, senderId: meId, role, body });
      setDraft("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  async function handleEnd() {
    setEnding(true);
    try {
      await endChatSession(session.id, messages);
      toast.success("Consultation ended and filed to medical record.");
      onClosed();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to end");
      setEnding(false);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <ShieldCheck className="h-3.5 w-3.5" /> Secure medical channel
          </div>
          <div className="font-display text-sm">{counterpartyName}</div>
        </div>
        <Button size="sm" variant="destructive" onClick={handleEnd} disabled={ending}>
          {ending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <X className="mr-1 h-3.5 w-3.5" />}
          End & File
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollerRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          const isReport = m.sender_role === "patient" && m.body.startsWith("📋 MEDP-AI CLINICAL CONTEXT");
          if (isReport) {
            return (
              <div key={m.id} className="rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 p-3">
                <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground">{m.body}</pre>
              </div>
            );
          }
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="flex gap-2 border-t p-3">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type your message…"
          autoComplete="off"
          disabled={ending}
        />
        <Button type="submit" disabled={busy || !draft.trim() || ending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
