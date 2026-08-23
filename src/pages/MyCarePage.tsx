import { AppHeader } from "@/components/AppHeader";
import { LegalFooter } from "@/components/LegalFooter";
import { MyCare } from "@/components/MyCare";

const MyCarePage = () => (
  <div className="min-h-screen bg-background">
    <AppHeader />
    <main className="container max-w-2xl space-y-6 py-6">
      <h1 className="font-display text-2xl leading-tight sm:text-3xl">Your care</h1>
      <p className="text-sm text-muted-foreground">
        Everything happening with your health, in one place.
      </p>
      <MyCare />
    </main>
    <LegalFooter />
  </div>
);

export default MyCarePage;
