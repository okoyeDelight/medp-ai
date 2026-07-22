// Live doctor <-> patient chat pinned to a claimed triage_session.
// RLS restricts read/write to the accepted patient + assigned doctor while status='claimed'.
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface ConsultationMessage {
  id: string;
  triage_session_id: string;
  sender_id: string;
  sender_role: "doctor" | "patient";
  body: string;
  created_at: string;
}

interface Props {
  sessionId: string;
  role: "doctor" | "patient";
  meLabel?: string;
  themLabel?: string;
  heightClass?: string;
}

export function ConsultationChat({
  sessionId,
  role,
  meLabel = "You",
  themLabel = role === "doctor" ? "Patient" : "Doctor",
  heightClass = "h-72",
}: Props) {
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const meRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // load + subscribe
  useEffect(() => {
    let live = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      meRef.current = u.user?.id ?? null;
      const { data } = await supabase
        .from("consultation_messages" as any)
        .select("*")
        .eq("triage_session_id", sessionId)
        .order("created_at", { ascending: true });
      if (!live) return;
      setMessages((data as unknown as ConsultationMessage[]) ?? []);
      setLoading(false);
    })();

    const ch = supabase
      .channel(`consult-chat-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "consultation_messages",
          filter: `triage_session_id=eq.${sessionId}`,
        },
        (p: any) => {
          setMessages((prev) =>
            prev.some((m) => m.id === p.new.id) ? prev : [...prev, p.new as ConsultationMessage],
          );
        },
      )
      .subscribe();

    return () => {
      live = false;
      supabase.removeChannel(ch);
    };
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = body.trim();
    if (!text || !meRef.current) return;
    setSending(true);
    const { error } = await supabase.from("consultation_messages" as any).insert({
      triage_session_id: sessionId,
      sender_id: meRef.current,
      sender_role: role,
      body: text,
    } as any);
    setSending(false);
    if (error) {
      toast.error(error.message || "Message failed");
      return;
    }
    setBody("");
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-card">
      <div className="border-b bg-muted/40 px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Live consultation · {themLabel}
      </div>
      <div ref={scrollRef} className={`${heightClass} overflow-y-auto space-y-2 p-3`}>
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground">
            No messages yet — say hello to {themLabel.toLowerCase()}.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === meRef.current;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    mine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  }`}
                >
                  <div className="text-[10px] uppercase opacity-70">
                    {mine ? meLabel : themLabel}
                  </div>
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div className="mt-0.5 text-[10px] opacity-60">
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2 border-t bg-background p-2"
      >
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`Message ${themLabel.toLowerCase()}…`}
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={sending || !body.trim()}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
