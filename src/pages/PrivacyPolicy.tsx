import { AppHeader } from "@/components/AppHeader";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-3xl py-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 font-mono-tech text-xs uppercase text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>

        <article className="prose prose-slate max-w-none">
          <header className="mb-8 border-b-2 border-foreground pb-6">
            <p className="font-mono-tech text-xs uppercase tracking-wider text-muted-foreground">
              Legal · MedP-AI
            </p>
            <h1 className="mt-2 font-display text-4xl leading-tight">Privacy Policy</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Effective date: <em>To be set on publication</em>
            </p>
          </header>

          <section className="space-y-6 text-sm leading-relaxed text-foreground">
            <div className="rounded-xl border-2 border-dashed border-foreground/40 bg-muted p-5">
              <p className="font-display text-xs uppercase tracking-wider text-muted-foreground">
                Placeholder
              </p>
              <p className="mt-2">
                This page is reserved for the official MedP-AI Privacy Policy. The text you
                provide will be inserted here verbatim, preserving section structure (Information
                We Collect, How We Use It, Data Retention, Your Rights, Contact, etc.).
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Send the policy text in your next message and it will replace this notice.
              </p>
            </div>

            <h2 className="font-display text-2xl">Quick Summary (interim)</h2>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <strong>Account data:</strong> we store your email and display name to identify
                your account.
              </li>
              <li>
                <strong>Health diary:</strong> herbal-remedy doses you log are stored in our
                secure backend and only accessible to you.
              </li>
              <li>
                <strong>Location:</strong> only used at the moment you tap "Find pharmacies" and
                is never stored.
              </li>
              <li>
                <strong>AI inputs:</strong> symptom text and plant photos are processed by our AI
                provider for the duration of the request and are not retained beyond it.
              </li>
              <li>
                <strong>Your rights:</strong> you can request permanent deletion of all your
                account data at any time from the Profile page.
              </li>
            </ul>

            <h2 className="font-display text-2xl">Contact</h2>
            <p>
              For privacy questions, contact the MedP-AI team via the in-app feedback channel.
            </p>
          </section>
        </article>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
