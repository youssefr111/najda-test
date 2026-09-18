"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { useIncidentChat } from "@/hooks/chat/useIncidentChat";
import { useSendChatMessage } from "@/hooks/chat/useSendChatMessage";
import useAuth from "@/hooks/auth/useAuth";

export default function IncidentChatPanel({ incidentId, readOnly }: { incidentId: number; readOnly?: boolean }) {
  const t = useTranslations("chat");
  const { user } = useAuth();
  const { data: messages, isLoading } = useIncidentChat(incidentId);
  const sendMessage = useSendChatMessage(incidentId);
  const [draft, setDraft] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    sendMessage.mutate(draft, { onSuccess: () => setDraft("") });
  }

  return (
    <div className="flex flex-col h-64 border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 bg-slate-50 dark:bg-slate-900">
        {isLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("loading")}</p>
        ) : messages && messages.length > 0 ? (
          messages.map((m) => {
            const isMe = m.senderId === user?.id;
            const timestamp = new Date(m.sentAt).toLocaleString(undefined, {
              month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
            });
            return (
              <div key={m.id} className={`max-w-[80%] ${isMe ? "self-end text-end" : "self-start"}`}>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {m.senderName}
                  {m.senderRole && (
                    <span className={`mx-1 px-1 py-0.5 rounded text-[10px] font-medium ${m.senderRole === "CITIZEN" ? "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                      {m.senderRole === "CITIZEN" ? t("caller") : m.senderRole.replace("_", " ")}
                    </span>
                  )}
                  {" · "}{timestamp}
                </p>
                <p className={`px-3 py-1.5 rounded-lg text-sm inline-block ${isMe ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"}`}>
                  {m.content}
                </p>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("noMessages")}</p>
        )}
      </div>

      {readOnly ? (
        <p className="p-2 text-xs text-slate-400 dark:text-slate-500 text-center border-t border-slate-200 dark:border-slate-700">{t("readOnly")}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2 p-2 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("placeholder")}
            className="flex-1 px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" disabled={sendMessage.isPending || !draft.trim()} className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
}