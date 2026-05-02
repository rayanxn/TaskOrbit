import { MagneticButton } from "./magnetic-button";

export function CtaBanner() {
  return (
    <section className="px-6 pb-8 sm:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-8 rounded-3xl bg-primary px-6 py-10 text-center sm:flex-row sm:px-12 sm:py-12 sm:text-left">
          <div>
            <h3 className="text-xl font-bold text-white sm:text-2xl">
              Ready to move work forward?
            </h3>
            <p className="mt-2 text-sm text-white/50">
              Free to use. No credit card. Sign up and start tracking.
            </p>
          </div>
          <MagneticButton variant="inverted" href="/signup" size="lg">
            Start Free
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}
