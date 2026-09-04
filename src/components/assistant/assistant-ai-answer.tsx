"use client";

import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { Loader2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { AnswerBody } from "./assistant-answer";

type Answer = Awaited<ReturnType<ReturnType<typeof useAction<typeof api.ai.ask>>>>;

/**
 * One exchange answered through the AI layer.
 *
 * Convex actions are not reactive — unlike the deterministic path, this
 * cannot re-run on its own when data changes, so the answer is a snapshot of
 * the moment it was asked. That is a real difference, and the footer says so
 * rather than letting a stale answer look live.
 *
 * The action is fired exactly once per question. A ref guards against React's
 * development double-invoke, which would otherwise bill two model calls for
 * every question asked.
 */
export function AssistantAiAnswer({ question }: { question: string }) {
  const ask = useAction(api.ai.ask);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    let cancelled = false;
    void ask({ question })
      .then((result) => {
        if (!cancelled) setAnswer(result);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "The intelligence layer could not be reached.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ask, question]);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg rounded-br-sm border border-border bg-muted/50 px-3.5 py-2.5">
          <p className="text-sm">{question}</p>
        </div>
      </div>

      <div className="flex justify-start">
        <div className="w-full max-w-[95%] overflow-hidden rounded-lg rounded-bl-sm border border-border bg-card">
          {!answer && !error && (
            <div className="flex items-center gap-2 p-4 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span className="font-mono text-xs uppercase tracking-wider">
                Analysing operational context
              </span>
            </div>
          )}

          {error && (
            <div className="p-4">
              <p className="text-sm text-[oklch(0.648_0.201_22)]">{error}</p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                Switch to Rule mode for an answer that does not depend on an
                external provider.
              </p>
            </div>
          )}

          {answer && <AnswerBody answer={answer} snapshot />}
        </div>
      </div>
    </div>
  );
}
