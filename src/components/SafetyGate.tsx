import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, MapPin } from "lucide-react";
import type { Remedy } from "@/data/remedies";

interface SafetyGateProps {
  remedy: Remedy | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFindChemist: () => void;
}

/**
 * Legacy interaction entries are not clinically validated. In particular,
 * "green" entries must never be treated as proof that a combination is safe.
 * Keep the data out of patient-facing decision support until reviewed.
 */
export function SafetyGate({ remedy, open, onOpenChange, onFindChemist }: SafetyGateProps) {
  if (!remedy) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Interaction information under review</DialogTitle>
          <DialogDescription>
            We cannot currently confirm whether {remedy.localName} is safe to use
            with your medicines, conditions, pregnancy status, or other products.
          </DialogDescription>
        </DialogHeader>
        <div role="alert" className="flex gap-3 rounded-md border-2 border-caution bg-caution/10 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm">
            The available herb–drug interaction records have not completed
            clinical verification. Missing entries are not evidence of safety.
            Do not start, stop, replace or adjust prescribed treatment based on
            this application. Ask a qualified pharmacist or clinician for an
            individual assessment.
          </p>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={() => { onFindChemist(); onOpenChange(false); }}>
            <MapPin className="h-4 w-4" /> Find a pharmacist for review
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
