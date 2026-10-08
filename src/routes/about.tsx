import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, HeartHandshake, MessageCircle, Music2, Play, Sparkles } from "lucide-react";
import { NuruMark } from "@/components/nuru/Logo";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Stephen Kanyi | Nuru Faith Founder at 18 | Kenya" },
      {
        name: "description",
        content:
          "Meet Stephen Kanyi, who began developing Nuru Faith at age 18 in Kenya through Vortiqora Technologies, combining faith, technology and community for young people.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "About Nuru Faith & Founder Stephen Kanyi | Christian App" },
      {
        property: "og:description",
        content:
          "Stephen Kanyi began developing Nuru Faith at age 18, with a vision to connect faith, learning, worship and community through technology.",
      },
      { property: "og:url", content: "https://nurufaith.co.ke/about" },
      { property: "og:image", content: "https://nurufaith.co.ke/photos/friends-outdoors.jpg" },
      { name: "twitter:title", content: "About Nuru Faith & Founder Stephen Kanyi | Christian App" },
      {
        name: "twitter:description",
        content: "Discover the journey of Stephen Kanyi, founder of Nuru Faith, developed at age 18 in Kenya.",
      },
    ],
    links: [{ rel: "canonical", href: "https://nurufaith.co.ke/about" }],
  }),
  component: AboutPage,
});

const SEO_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://nurufaith.co.ke/#organization",
      name: "Vortiqora Technologies",
      founder: { "@id": "https://nurufaith.co.ke/about#stephen-kanyi" },
      url: "https://nurufaith.co.ke/about",
      logo: {
        "@type": "ImageObject",
        url: "https://nurufaith.co.ke/icons/icon-512.png",
      },
    },
    {
      "@type": "Person",
      "@id": "https://nurufaith.co.ke/about#stephen-kanyi",
      name: "Stephen Kanyi",
      url: "https://nurufaith.co.ke/about#founder",
      jobTitle: "Founder",
      description:
        "Stephen Kanyi is a Kenyan technology founder who began developing Nuru Faith at age 18 through Vortiqora Technologies, bringing faith, technology and community together for young people.",
      worksFor: { "@id": "https://nurufaith.co.ke/#organization" },
    },
    {
      "@type": "WebSite",
      "@id": "https://nurufaith.co.ke/#website",
      url: "https://nurufaith.co.ke",
      name: "Nuru Faith",
      inLanguage: "en",
      publisher: { "@id": "https://nurufaith.co.ke/#organization" },
    },
    {
      "@type": "WebApplication",
      name: "Nuru Faith",
      url: "https://nurufaith.co.ke/about",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      description:
        "A Christian faith and community app for Bible reading, courses, devotions, prayer, gospel media, mentorship and meaningful community.",
      publisher: { "@id": "https://nurufaith.co.ke/#organization" },
    },
  ],
};

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SEO_STRUCTURED_DATA) }}
      />
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

        <section className="mt-10 rounded-[28px] border border-primary/20 bg-primary/5 p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold">Explore Nuru Faith</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Discover how Nuru supports Bible reading, Christian learning, worship and meaningful
            community for young people in Kenya, across Africa and beyond.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/christian-app" className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold">Christian app</a>
            <a href="/bible-app-for-young-people" className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold">Bible app for young people</a>
            <a href="/christian-community-app" className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold">Christian community app</a>
            <a href="/gospel-music-app" className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold">Gospel music &amp; worship</a>
            <a href="/christian-app-kenya" className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold">Nuru in Kenya &amp; Africa</a>
          </div>
        </section>


        <section
          id="founder"
          aria-labelledby="founder-heading"
          className="mt-10 rounded-[28px] border border-primary/20 bg-primary/5 p-6 sm:p-8"
        >
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Meet the founder</span>
          <h2 id="founder-heading" className="mt-3 font-display text-2xl font-semibold">
            Stephen Kanyi — Building Nuru Faith at 18
          </h2>
          <p className="mt-3 text-sm font-semibold text-primary">
            Kenyan founder · Faith-driven technology · Started building at age 18
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            Stephen Kanyi began developing Nuru Faith at the age of 18, driven by a belief that
            technology can help young people connect, learn and grow in their Christian faith.
            Through Vortiqora Technologies, he is working to bring Scripture, devotionals,
            courses, worship, mentorship and faith-centered conversations into one digital space.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            His journey began with a question: how can a new generation find genuine community
            and practical spiritual guidance in a world shaped by social media? Nuru Faith is
            his response — an ambitious project that connects software development with a
            desire to serve people and address meaningful challenges.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            Starting a project of this scale while young takes initiative, curiosity and
            persistence. Stephen is still building and learning, with a long-term vision to make
            faith-centered learning and connection more accessible in Kenya, across Africa and
            beyond. His story is about choosing to begin, continuing to improve, and building
            toward an impact that will be measured by the people Nuru Faith genuinely helps.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Business inquiries:{" "}
            <a href="mailto:vortiqoratech@gmail.com" className="font-semibold text-primary hover:underline">
              vortiqoratech@gmail.com
            </a>
          </p>
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
            <a href="/about#founder" className="hover:text-foreground">Founder</a>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
