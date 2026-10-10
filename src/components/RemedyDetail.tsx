import { useState } from "react";
import type { Remedy } from "@/data/remedies";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, ShieldQuestion } from "lucide-react";
import { SafetyGate } from "@/components/SafetyGate";
import { PharmacyFinder } from "@/components/PharmacyFinder";

interface RemedyDetailProps {
  remedy: Remedy;
  onBack: () => void;
  onFindChemist?: () => void;
}

/**
 * Safety hold: the legacy remedy dataset contains unreviewed efficacy,
 * preparation, dose, and interaction claims. Do not expose actionable
 * instructions or dose reminders until a qualified clinical review.
 */
export function RemedyDetail({ remedy, onBack, onFindChemist }: RemedyDetailProps) {
  const [gateOpen, setGateOpen] = useState(false);
  const [pharmacyOpen, setPharmacyOpen] = useState(false);

  function findPharmacist() {
    if (onFindChemist) onFindChemist();
    else setPharmacyOpen(true);
  }

  return (
    <div className="space-y-5 pb-10 animate-fade-up">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to remedies
      </button>

      <section className="rounded-xl border-2 border-foreground bg-card p-5 shadow-brutal">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="text-4xl">{remedy.emoji}</span>
          <div>
            <p className="text-xs text-muted-foreground">{remedy.name}</p>
            <h2 className="font-display text-2xl">{remedy.localName}</h2>
          </div>
        </div>
        <div role="alert" className="mt-5 rounded-lg border-2 border-danger bg-danger/10 p-4">
          <h3 className="font-display text-lg">Clinical review required</h3>
          <p className="mt-2 text-sm">
            MedPAi has not verified this remedy's safety, effectiveness, preparation,
            dosage or interactions for your situation. We have temporarily disabled
            use instructions, dose reminders and consumption logging while the
            clinical evidence is reviewed. Do not use this page as treatment advice.
            A listed remedy must not replace medical assessment or prescribed treatment.
          </p>
          <p className="mt-2 text-sm">
            For severe or worsening symptoms, seek urgent medical care rather than
            relying on herbal remedies or this application.
          </p>
        </div>
      </section>

      <Button
        size="lg"
        variant="outline"
        className="w-full border-2 border-foreground"
        onClick={() => setGateOpen(true)}
      >
        <ShieldQuestion className="h-5 w-5" /> View reported interaction information
      </Button>
      <Button
        size="lg"
        className="w-full border-2 border-foreground"
        onClick={findPharmacist}
      >
        <MapPin className="h-5 w-5" /> Find a pharmacist for review
      </Button>

      <SafetyGate
        remedy={remedy}
        open={gateOpen}
        onOpenChange={setGateOpen}
        onFindChemist={findPharmacist}
      />
      <PharmacyFinder open={pharmacyOpen} onOpenChange={setPharmacyOpen} />
    </div>
  );
}
