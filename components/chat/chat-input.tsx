"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUp, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Ask about your emails...",
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isBusy = disabled || sending;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 180) + "px";
    }
  }, [input]);

  // Reset sending state when parent disabled prop changes (loading started)
  useEffect(() => {
    if (disabled) setSending(false);
  }, [disabled]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isBusy) return;
    setSending(true);
    onSend(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isBusy) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-border bg-background px-6 py-4">
      <div className="max-w-2xl mx-auto">
        <div className="relative flex items-end rounded-2xl border border-border bg-card shadow-sm transition-shadow focus-within:shadow-md focus-within:border-foreground/20">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isBusy}
            rows={1}
            className="flex-1 resize-none bg-transparent px-4 py-3.5 text-[13.5px] placeholder:text-muted-foreground/50 focus:outline-none min-h-[48px] max-h-[180px] leading-relaxed"
          />
          <button
            onClick={handleSubmit}
            disabled={isBusy || !input.trim()}
            className="shrink-0 m-2 flex h-8 w-8 items-center justify-center rounded-xl bg-foreground text-background transition-all duration-150 hover:opacity-80 disabled:opacity-20 disabled:cursor-not-allowed"
          >
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground/50 mt-2.5">
          OpenMail searches your Gmail and may make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
