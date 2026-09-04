"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "convex/react";
import { Bot, CornerDownLeft, RotateCcw, Sparkles, SquareFunction } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { AssistantAnswer } from "./assistant-answer";
import { AssistantAiAnswer } from "./assistant-ai-answer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Operations assistant console.
 *
 * History is a list of questions; each renders its own `AssistantAnswer`,
 * which holds its own Convex subscription. That means no effect is needed to
 * push results into state, and every answer on screen stays live rather than
 * freezing at the moment it was asked.
 */
type Mode = "rule" | "ai";

interface Exchange {
  question: string;
  /** Captured per question so switching modes never rewrites history. */
  mode: Mode;
}

export function AssistantChat() {
  const [history, setHistory] = useState<Exchange[]>([]);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<Mode>("rule");
  const suggestions = useQuery(api.assistant.getSuggestions);

  const submit = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    setHistory((h) => [...h, { question: trimmed, mode }]);
    setDraft("");
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(draft);
  };

  return (
    <section className="flex h-[calc(100vh-10rem)] flex-col overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Bot className="size-4 text-primary" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Operations Assistant</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Deterministic · grounded in live Convex data
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {(
            [
              ["rule", "Rule", SquareFunction],
              ["ai", "AI", Sparkles],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              title={
                value === "rule"
                  ? "Deterministic rule engine — always available, updates live"
                  : "Language model, grounded in the same data — falls back to the rule engine if unavailable"
              }
              className={cn(
                "flex items-center gap-1 rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                mode === value
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-muted/30 text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3" />
              {label}
            </button>
          ))}

          {history.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 text-xs text-muted-foreground"
              onClick={() => setHistory([])}
            >
              <RotateCcw className="size-3" />
              Clear
            </Button>
          )}
        </div>
      </header>

      {/* Transcript */}
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {history.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <Bot className="size-8 text-muted-foreground" />
            <h4 className="mt-3 text-sm font-medium">
              Ask about the current operational picture
            </h4>
            <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
              This assistant answers from live database records. It matches a
              fixed set of operational questions rather than interpreting free
              language, and it will say so plainly when a question falls
              outside what it handles.
            </p>
          </div>
        )}

        {history.map((exchange, index) =>
          exchange.mode === "ai" ? (
            <AssistantAiAnswer
              key={`${index}-ai-${exchange.question}`}
              question={exchange.question}
            />
          ) : (
            <AssistantAnswer
              key={`${index}-rule-${exchange.question}`}
              question={exchange.question}
            />
          ),
        )}
      </div>

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="border-t border-border px-4 py-2.5">
          <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            Supported questions
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => submit(suggestion)}
                className="rounded border border-border bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about incidents, roads, vehicles, deliveries or priorities…"
          aria-label="Ask the operations assistant"
          className="h-9 bg-background text-sm"
        />
        <Button
          type="submit"
          size="sm"
          className="h-9 gap-1.5 text-xs"
          disabled={draft.trim().length === 0}
        >
          Ask
          <CornerDownLeft className="size-3" />
        </Button>
      </form>
    </section>
  );
}
