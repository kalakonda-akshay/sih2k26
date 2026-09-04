"use client";

import { Download, FileText, Map as MapIcon } from "lucide-react";
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

/**
 * Project documents, downloadable from the running application.
 *
 * Both files are static assets under `public/docs`, so the browser saves them
 * directly — no server round trip and no generation step. They are plain HTML
 * rather than PDF because HTML opens anywhere, stays searchable, and prints
 * to PDF from the browser when someone actually needs one.
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
  return (
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

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Project documents</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

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
  );
}
