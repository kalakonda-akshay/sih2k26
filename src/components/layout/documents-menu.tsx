"use client";

import { useState } from "react";
import { Download, FileText, Map as MapIcon, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SitRepModal } from "@/components/reports/sitrep-modal";

/**
 * Project documents & situation reports, downloadable from the running application.
 */
const DOCUMENTS = [
  {
    href: "/docs/ner-vision-technical-report.html",
    filename: "ner-vision-technical-report.html",
    icon: FileText,
    title: "Technical Report",
    detail: "Stack, architecture, 17 algorithms, judge Q&A",
    size: "50 KB",
  },
  {
    href: "/docs/ner-vision-architecture-blueprint.html",
    filename: "ner-vision-architecture-blueprint.html",
    icon: MapIcon,
    title: "Architecture Blueprint",
    detail: "Phase-1 study: scope, schema, ML and GIS design",
    size: "101 KB",
  },
];

export function DocumentsMenu() {
  const [sitRepOpen, setSitRepOpen] = useState(false);

  return (
    <>
      <SitRepModal isOpen={sitRepOpen} onClose={() => setSitRepOpen(false)} />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label="Download project documents"
            />
          }
        >
          <Download className="size-5" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Official Reports & Briefings</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />

          {/* MDoNER SitRep Live Generator */}
          <DropdownMenuItem
            onClick={() => setSitRepOpen(true)}
            className="flex-col items-start gap-1 py-2.5 bg-primary/5 hover:bg-primary/10 cursor-pointer"
          >
            <span className="flex w-full items-center gap-2">
              <ShieldCheck className="size-4 shrink-0 text-primary" />
              <span className="text-xs font-semibold text-primary">
                Live Situation Report (SitRep)
              </span>
              <span className="ml-auto rounded bg-primary/20 px-1.5 py-0.2 font-mono text-[9px] font-bold text-primary">
                PDF
              </span>
            </span>
            <span className="pl-6 text-[11px] leading-snug text-muted-foreground">
              Official MDoNER disaster & logistics status with print-to-PDF
            </span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[10px] text-muted-foreground font-mono uppercase">
              Project Architecture
            </DropdownMenuLabel>
          </DropdownMenuGroup>

        {DOCUMENTS.map((doc) => {
          const Icon = doc.icon;
          return (
            <DropdownMenuItem
              key={doc.href}
              /*
               * A real anchor with `download`, so the browser saves the file
               * rather than navigating to it. `render` is Base UI's
               * composition prop — MenuItem defaults `nativeButton` to false,
               * so an <a> here is valid.
               */
              render={
                <a href={doc.href} download={doc.filename} target="_blank" rel="noopener" />
              }
              className="flex-col items-start gap-1 py-2.5"
            >
              <span className="flex w-full items-center gap-2">
                <Icon className="size-3.5 shrink-0 text-primary" />
                <span className="text-xs font-medium">{doc.title}</span>
                <span className="ml-auto font-mono text-[9px] text-muted-foreground">
                  {doc.size}
                </span>
              </span>
              <span className="pl-5.5 text-[11px] leading-snug text-muted-foreground">
                {doc.detail}
              </span>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-mono text-[9px] font-normal leading-relaxed text-muted-foreground">
            HTML — open in any browser, or print to PDF with Ctrl/Cmd + P.
          </DropdownMenuLabel>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
}
