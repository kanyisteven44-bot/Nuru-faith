import { createFileRoute, Link } from "@tanstack/react-router";
import { NuruMark } from "@/components/nuru/Logo";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Nuru Faith" },
      {
        name: "description",
        content: "Terms governing use of Nuru Faith accounts, community and media features.",
      },
    ],
    links: [{ rel: "canonical", href: "https://nurufaith.co.ke/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="min-h-dvh bg-background px-5 py-10 text-foreground">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <NuruMark className="h-11 w-11" />
          <div>
            <p className="font-display text-xl font-semibold">Nuru Faith</p>
            <p className="text-sm text-muted-foreground">Terms of Service</p>
          </div>
        </div>

        <article className="space-y-6 rounded-[28px] border border-border bg-card p-6 shadow-sm sm:p-8">
          <div>
            <p className="text-sm text-muted-foreground">Effective: 7 October 2026</p>
            <h1 className="mt-2 font-display text-3xl font-semibold">Use Nuru Faith responsibly.</h1>
            <p className="mt-3 leading-7 text-ink-2">
              These terms apply when you create an account or use Nuru Faith, a faith and
              community platform operated by Vortiqora Technologies.
            </p>
          </div>

          <section>
            <h2 className="font-display text-xl font-semibold">Your account</h2>
            <p className="mt-2 leading-7 text-ink-2">
              Keep your sign-in details secure and provide accurate account information. You are
              responsible for activity performed through your account unless you report
              unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">Community standards</h2>
            <p className="mt-2 leading-7 text-ink-2">
              Do not use Nuru Faith to harass, exploit, impersonate, threaten or unlawfully target
              others. Do not upload illegal material, malicious code, spam, or content that
              violates another person's rights.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">Your content</h2>
            <p className="mt-2 leading-7 text-ink-2">
              You keep ownership of content you create. By posting content to Nuru Faith, you give
              us the limited permission needed to host, display and process that content so the
              feature you selected can work.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">External services</h2>
            <p className="mt-2 leading-7 text-ink-2">
              Some features use or link to third-party services such as Google and YouTube. Those
              services are governed by their own terms, and availability may depend on their
              systems, permissions and policies.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">Availability</h2>
            <p className="mt-2 leading-7 text-ink-2">
              We work to keep Nuru Faith reliable, but features may occasionally be changed,
              interrupted or unavailable for maintenance, security, provider limitations or
              technical reasons.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">Account action</h2>
            <p className="mt-2 leading-7 text-ink-2">
              We may restrict or suspend accounts when necessary to protect users, comply with law,
              investigate abuse, or enforce these terms. Where practical, we aim to apply these
              measures proportionately.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">Changes to these terms</h2>
            <p className="mt-2 leading-7 text-ink-2">
              We may update these terms as Nuru Faith evolves. Continued use after updated terms
              are published means the revised terms apply from their stated effective date.
            </p>
          </section>

          <div className="flex flex-wrap gap-3 border-t border-border pt-5">
            <Link to="/auth" className="min-h-11 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
              Back to sign in
            </Link>
            <Link to="/privacy" className="min-h-11 rounded-full border border-border px-5 py-3 text-sm font-semibold">
              Privacy Policy
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
