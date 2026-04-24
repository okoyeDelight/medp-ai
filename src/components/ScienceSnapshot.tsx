import type { Remedy } from "@/data/remedies";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Microscope, FlaskConical, BookOpen, AlertTriangle, ExternalLink, Beaker } from "lucide-react";

interface ScienceSnapshotProps {
  remedy: Remedy;
}

export function ScienceSnapshot({ remedy }: ScienceSnapshotProps) {
  const science = remedy.science;
  if (!science) return null;

  return (
    <section className="rounded-xl border-2 border-foreground bg-card shadow-brutal overflow-hidden">
      <Accordion type="single" collapsible>
        <AccordionItem value="science" className="border-b-0">
          <AccordionTrigger className="px-5 py-4 hover:no-underline [&[data-state=open]]:bg-secondary">
            <div className="flex items-center gap-3 text-left">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-foreground bg-accent text-accent-foreground shadow-brutal-sm">
                <Microscope className="h-5 w-5" />
              </div>
              <div>
                <p className="font-mono-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                  The Lab
                </p>
                <p className="font-display text-base leading-tight">Science & Research</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 pt-2">
            <div className="space-y-4">
              {/* Active Phytochemicals */}
              <div className="rounded-lg border-2 border-foreground bg-background p-3 shadow-brutal-sm">
                <div className="mb-2 flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  <p className="font-display text-xs uppercase tracking-wider">
                    Active Phytochemicals
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {science.phytochemicals.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border-2 border-foreground bg-secondary px-2.5 py-0.5 font-mono-tech text-[11px] font-semibold"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Clinical Evidence */}
              <div className="rounded-lg border-2 border-foreground bg-background p-3 shadow-brutal-sm">
                <div className="mb-1.5 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <p className="font-display text-xs uppercase tracking-wider">
                    Clinical Evidence
                  </p>
                </div>
                <p className="font-mono-tech text-[11px] font-bold uppercase text-muted-foreground">
                  {science.evidence.citation}
                </p>
                <p className="mt-1 text-sm leading-snug">{science.evidence.summary}</p>
              </div>

              {/* Toxicity */}
              <div className="rounded-lg border-2 border-danger bg-danger/10 p-3">
                <div className="mb-1.5 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-danger" />
                  <p className="font-display text-xs uppercase tracking-wider text-danger">
                    Toxicity / Danger Level
                  </p>
                </div>
                {science.toxicity.ld50 && (
                  <p className="font-mono-tech text-[11px] font-bold uppercase text-danger">
                    LD50: {science.toxicity.ld50}
                  </p>
                )}
                <p className="mt-1 text-sm leading-snug text-foreground">
                  {science.toxicity.notes}
                </p>
              </div>

              {/* CYP / Pharmacokinetics flag */}
              {science.cypInteraction && (
                <div className="rounded-lg border-2 border-foreground bg-accent p-3 text-accent-foreground shadow-brutal-sm">
                  <div className="mb-1 flex items-center gap-2">
                    <Beaker className="h-4 w-4" />
                    <p className="font-display text-xs uppercase tracking-wider">
                      Pharmacokinetic Flag
                    </p>
                  </div>
                  <p className="text-sm leading-snug">{science.cypInteraction}</p>
                </div>
              )}

              {/* Source */}
              <a
                href={science.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono-tech text-[11px] font-bold uppercase text-primary underline-offset-4 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {science.source.label}
              </a>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
