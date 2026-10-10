import { createFileRoute, Link } from "@tanstack/react-router";
import { NuruMark } from "@/components/nuru/Logo";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Nuru Faith" },
      {
        name: "description",
        content: "How Nuru Faith handles account, profile, community and media information.",
      },
    ],
    links: [{ rel: "canonical", href: "https://app.nurufaith.co.ke/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-background px-5 py-10 text-foreground">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <NuruMark className="h-11 w-11" />
          <div>
            <p className="font-display text-xl font-semibold">Nuru Faith</p>
            <p className="text-sm text-muted-foreground">Privacy Policy</p>
          </div>
        </div>

        <article className="space-y-6 rounded-[28px] border border-border bg-card p-6 shadow-sm sm:p-8">
          <div>
            <p className="text-sm text-muted-foreground">Effective: 7 October 2026</p>
            <h1 className="mt-2 font-display text-3xl font-semibold">Your privacy matters.</h1>
            <p className="mt-3 leading-7 text-ink-2">
              Nuru Faith is a faith and community platform operated by Vortiqora Technologies.
              This policy explains the information we use to provide accounts, community
              features, learning, media, messaging and related services.
            </p>
          </div>

          <section>
            <h2 className="font-display text-xl font-semibold">Information we collect</h2>
            <p className="mt-2 leading-7 text-ink-2">
              We may process account details such as your name, email address, profile picture,
              username and authentication information. When you use community features, we may
              also process posts, comments, messages, group activity, saved media, progress,
              preferences and other content you choose to share.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">Google sign-in and Google user data</h2>
            <p className="mt-2 leading-7 text-ink-2">
              If you choose Google sign-in, Nuru Faith receives the basic Google account
              information needed to authenticate you, such as your name, email address and profile
              picture when provided by Google. We use this information to create or sign in to
              your Nuru account and to display your profile.
            </p>
            <p className="mt-3 leading-7 text-ink-2">
              If you separately choose to connect your YouTube account for an action such as
              rating or commenting on a video, Nuru may request the YouTube permission required
              for that action. We use that permission only to perform the user-requested action.
              We do not use Google user data for advertising, sell it, or use it to train
              generalized AI or machine-learning models.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">How we use information</h2>
            <p className="mt-2 leading-7 text-ink-2">
              We use information to authenticate accounts, personalize your experience, provide
              requested features, protect users, prevent abuse, improve reliability, and maintain
              the security of Nuru Faith.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">Sharing</h2>
            <p className="mt-2 leading-7 text-ink-2">
              We do not sell your personal information. We may use trusted service providers
              necessary to operate Nuru Faith, including hosting, authentication, database,
              analytics and media infrastructure. Public content you choose to post may be visible
              to other users according to the audience or group settings you select.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">Data choices</h2>
            <p className="mt-2 leading-7 text-ink-2">
              You can update profile information and account settings inside Nuru Faith. You can
              delete your Nuru account from Settings where that control is available, which starts
              removal of account data subject to legitimate security and legal retention needs.
              You may also revoke Google access from your Google Account permissions at any time.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">Security and retention</h2>
            <p className="mt-2 leading-7 text-ink-2">
              We use reasonable technical and organizational safeguards to protect information.
              We retain information only as needed to operate the service, meet legitimate
              security needs, and comply with applicable obligations.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">Updates</h2>
            <p className="mt-2 leading-7 text-ink-2">
              We may update this policy as Nuru Faith changes. The effective date above will be
              updated when material changes are published.
            </p>
          </section>

          <div className="flex flex-wrap gap-3 border-t border-border pt-5">
            <Link to="/about" className="min-h-11 rounded-full border border-border px-5 py-3 text-sm font-semibold">
              About Nuru Faith
            </Link>
            <Link to="/auth" className="min-h-11 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
              Back to sign in
            </Link>
            <Link to="/terms" className="min-h-11 rounded-full border border-border px-5 py-3 text-sm font-semibold">
              Terms of Service
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
