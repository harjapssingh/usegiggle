import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LOCAL_CHANGE_EVENT, getMessages, sendMessage } from "@/lib/localApp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Message {
  id: string;
  job_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export function Chat({ jobId, otherName }: { jobId: string; otherName: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () => setMessages(getMessages(jobId) as Message[]);
    load();
    window.addEventListener(LOCAL_CHANGE_EVENT, load);
    return () => window.removeEventListener(LOCAL_CHANGE_EVENT, load);
  }, [jobId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = async () => {
    if (!draft.trim() || !user || sending) return;
    setSending(true);
    const body = draft.trim();
    setDraft("");
    sendMessage(jobId, user.id, body);
    toast.success("Message sent");
    setSending(false);
  };

  return (
    <div className="card-soft flex flex-col h-[480px]">
      <div className="px-4 py-3 border-b border-border">
        <p className="font-display text-lg leading-none">Chat with {otherName}</p>
        <p className="text-xs text-muted-foreground mt-1">Messages are private to you both.</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground mt-8">No messages yet — say hi 👋</p>
        ) : messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm leading-snug ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm"}`}>
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-3 border-t border-border flex gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 2000))} placeholder="Type a message…" className="rounded-xl bg-card" />
        <Button type="submit" disabled={!draft.trim() || sending} size="icon" className="rounded-xl shrink-0"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
