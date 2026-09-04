"use client";

import { AssistantChat } from "@/components/assistant/assistant-chat";
import { SituationBriefing } from "@/components/briefing/situation-briefing";

/**
 * Operations Assistant.
 *
 * The briefing sits alongside the chat so an operator has the current picture
 * in view while asking follow-up questions about it.
 */
export default function AssistantPage() {
  return (
    <div className="grid gap-4 p-4 md:p-6 xl:grid-cols-5">
      <div className="xl:col-span-3">
        <AssistantChat />
      </div>
      <div className="xl:col-span-2">
        <SituationBriefing />
      </div>
    </div>
  );
}
