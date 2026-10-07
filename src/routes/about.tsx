import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, HeartHandshake, MessageCircle, Music2, Play, Sparkles } from "lucide-react";
import { NuruMark } from "@/components/nuru/Logo";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Nuru Faith — Connect. Grow. Live Your Faith." },
      {
        name: "description",
        content:
          "Nuru Faith is a Christian faith and community platform for Bible reading, learning, worship media, Reels, prayer, mentorship and meaningful community.",
      },
    ],
  }),
  component: AboutPage,
});

const features = [
  {
    icon: BookOpen,
    title: "Bible & learning",
    text: "Read Scripture, continue courses and devotions, and grow through structured faith learning.",
  },
  {
    icon: Play,
    title: "Faith-filled Reels",
    text: "Discover short Christian videos and keep your watched history from endlessly repeating the same content.",
  },
  {
    icon: Music2,
    title: "Worship media",
    text: "Discover approved gospel artists, worship music and Christian media from trusted sources.",
  },
  {
    icon: MessageCircle,
    title: "Community",
    text: "Connect through conversations, groups and messages designed around healthy Christian community.",
  },
  {
    icon: HeartHandshake,
    title: "Prayer & mentorship",
    text: "Build meaningful faith connections, prayer habits and mentorship relationships.",
  },
  {
    icon: Sparkles,
    title: "Nuru AI",
    text: "Use faith-focused assistance alongside Scripture, learning and the wider Nuru experience.",
  },
];

function AboutPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <NuruMark className="h-12 w-12" />
            <div>
              <p className="font-display text-xl font-bold">
                Nuru <span className="text-leaf">Faith</span>
              </p>
              <p className="text-xs text-muted-foreground">by Vortiqora Technologies</p>
            </div>
          </div>
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Open Nuru
          </Link>
        </header>

        <section className="py-14 text-center sm:py-20">
          <div className="mx-auto max-w-3xl">
            <span className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              Connect • Grow • Live Your Faith
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-6xl">
              A digital home for faith, learning and community.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Nuru Faith helps people read the Bible, learn, pray, discover Christian media,
              connect with mentors and participate in meaningful faith community from one place.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
              >
                Create an account
              </Link>
              <Link
                to="/auth"
                search={{ mode: "login" }}
                className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>

        <section>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-[24px] border border-border bg-card p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 font-display text-lg font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[28px] border border-border bg-card p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold">Built with privacy in mind</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Google sign-in is used only to authenticate users and provide the Nuru features they
            choose to use. When a user explicitly connects an external media account for an action
            such as commenting or rating, Nuru requests the permissions needed for that action.
            We do not sell Google user data.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/privacy" className="text-sm font-semibold text-primary hover:underline">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-sm font-semibold text-primary hover:underline">
              Terms of Service
            </Link>
          </div>
        </section>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border py-6 text-xs text-muted-foreground">
          <span>© 2026 Vortiqora Technologies. Nuru Faith.</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
