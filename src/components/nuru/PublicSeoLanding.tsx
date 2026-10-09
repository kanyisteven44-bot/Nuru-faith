import { NuruMark } from "@/components/nuru/Logo";
import { Link } from "@tanstack/react-router";
import { PwaInstallGuide } from "@/components/nuru/PwaInstallGuide";

type SeoFeature = {
  title: string;
  text: string;
};

type SeoSection = {
  title: string;
  text: string;
};

type SeoFaq = {
  question: string;
  answer: string;
};

type SeoRelatedLink = {
  href: string;
  label: string;
};

type PublicSeoLandingProps = {
  eyebrow: string;
  title: string;
  intro: string;
  canonical: string;
  description: string;
  features: SeoFeature[];
  sections: SeoSection[];
  faq: SeoFaq[];
  related: SeoRelatedLink[];
};

export function PublicSeoLanding({
  eyebrow,
  title,
  intro,
  canonical,
  description,
  features,
  sections,
  faq,
  related,
}: PublicSeoLandingProps) {
  const isHome = canonical === "https://nurufaith.co.ke/";
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: title,
        description,
        isPartOf: { "@id": "https://nurufaith.co.ke/#website" },
        about: {
          "@type": "SoftwareApplication",
          name: "Nuru Faith",
          applicationCategory: "LifestyleApplication",
          operatingSystem: "Web",
          url: "https://nurufaith.co.ke/about",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Nuru Faith",
            item: "https://nurufaith.co.ke/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: title,
            item: canonical,
          },
        ],
      },
    ],
  };

  return (
    <main className={isHome ? "min-h-dvh bg-[#06152a] text-white" : "min-h-dvh bg-background text-foreground"}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className={isHome ? "mx-auto max-w-6xl px-5 pt-6 pb-10 sm:px-8 sm:pt-9" : "mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12"}>
        <header className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3" aria-label="Nuru Faith home">
            <NuruMark className="h-11 w-11" />
            <span>
              <span className="block font-display text-xl font-bold">
                Nuru <span className="text-leaf">Faith</span>
              </span>
              <span className={isHome ? "block text-xs text-blue-200/75" : "block text-xs text-muted-foreground"}>by Vortiqora Technologies</span>
            </span>
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className={isHome ? "rounded-full border border-cyan-300/30 bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(48,132,255,.24)] transition hover:bg-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300" : "rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"}
          >
            Join Nuru
          </Link>
        </header>

        {isHome ? (
          <section className="relative isolate mt-7 flex min-h-[min(740px,85svh)] flex-col justify-center overflow-hidden rounded-[30px] border border-white/10 bg-[#092341] px-6 py-16 shadow-[0_22px_90px_rgba(0,0,0,.3)] sm:mt-10 sm:rounded-[40px] sm:px-14 sm:py-24 lg:px-20">
            <img
              src="/photos/friends-outdoors.jpg"
              alt="Young friends spending time together outdoors"
              className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
              width="1200"
              height="800"
              fetchPriority="high"
            />
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(3,14,35,.97)_0%,rgba(4,21,49,.91)_43%,rgba(4,20,47,.40)_100%),linear-gradient(0deg,rgba(2,12,31,.65),transparent_55%)]" />
            <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-1/3 -z-10 h-72 w-72 rounded-full bg-cyan-400/20 blur-[90px]" />
            <div className="max-w-[690px]">
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-200/10 px-4 py-2 text-xs font-semibold tracking-[.13em] text-cyan-100 sm:text-sm">
                <span className="h-2 w-2 rounded-full bg-cyan-300" aria-hidden="true" />
                FAITH · LEARNING · COMMUNITY
              </p>
              <h1 className="mt-8 font-display text-[clamp(2.7rem,7vw,5.8rem)] font-bold leading-[1.07] tracking-[-.045em] text-white">
                Your faith.<br />
                Your community.<br />
                <span className="text-[#8edaff]">Your journey.</span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-8 text-blue-100/85 sm:text-lg">
                A brighter way to grow closer to God and each other. Explore Scripture, discover worship, learn together and find your people.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/auth" search={{ mode: "signup" }} className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#3b82f6] px-8 py-3 text-sm font-bold text-white shadow-[0_10px_36px_rgba(59,130,246,.32)] transition hover:bg-[#60a5fa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
                  Join Nuru Faith <span className="ml-3" aria-hidden="true">→</span>
                </Link>
                <Link to="/welcome" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 bg-white/10 px-8 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
                  I already have an account
                </Link>
              </div>
              <p className="mt-8 text-xs tracking-wide text-blue-100/65">Made in Kenya · Built for a generation of faith</p>
            </div>
            <span className="pointer-events-none absolute bottom-7 right-8 hidden text-[11px] font-semibold tracking-[.35em] text-white/65 sm:block">NURU FAITH</span>
          </section>
        ) : (
          <>
            <nav className="mt-8 text-xs text-muted-foreground" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-foreground hover:underline">Nuru Faith</Link>
              <span aria-hidden="true"> / </span>
              <span>{eyebrow}</span>
            </nav>
            <section className="py-12 sm:py-16">
              <span className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">{eyebrow}</span>
              <h1 className="mt-5 max-w-4xl font-display text-4xl font-bold tracking-tight sm:text-6xl">{title}</h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">{intro}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/auth" search={{ mode: "signup" }} className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Create a free account</Link>
                <Link to="/about" className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold">Explore Nuru Faith</Link>
              </div>
            </section>
          </>
        )}

        {!isHome && <PwaInstallGuide />}

        <section aria-labelledby="features-heading" className={isHome ? "mt-16" : undefined}>
          <h2 id="features-heading" className="font-display text-2xl font-semibold">
            What you can do with Nuru Faith
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className={isHome ? "rounded-[24px] border border-white/10 bg-white/[.065] p-5 shadow-sm transition hover:border-cyan-300/30 hover:bg-white/[.09]" : "rounded-[24px] border border-border bg-card p-5 shadow-sm"}>
                <h3 className="font-display text-lg font-semibold">{feature.title}</h3>
                <p className={isHome ? "mt-2 text-sm leading-6 text-blue-100/75" : "mt-2 text-sm leading-6 text-muted-foreground"}>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 space-y-4">
          {sections.map((section) => (
            <article key={section.title} className={isHome ? "rounded-[24px] border border-white/10 bg-white/[.055] p-6 sm:p-7" : "rounded-[24px] border border-border bg-card p-6 sm:p-7"}>
              <h2 className="font-display text-2xl font-semibold">{section.title}</h2>
              <p className={isHome ? "mt-3 max-w-3xl text-sm leading-7 text-blue-100/75 sm:text-base" : "mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base"}>
                {section.text}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-10" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="font-display text-2xl font-semibold">
            Frequently asked questions
          </h2>
          <div className="mt-4 space-y-3">
            {faq.map((item) => (
              <details key={item.question} className={isHome ? "rounded-[20px] border border-white/10 bg-white/[.055] p-5" : "rounded-[20px] border border-border bg-card p-5"}>
                <summary className="cursor-pointer font-semibold">{item.question}</summary>
                <p className={isHome ? "mt-3 text-sm leading-6 text-blue-100/75" : "mt-3 text-sm leading-6 text-muted-foreground"}>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={isHome ? "mt-10 rounded-[28px] border border-cyan-300/20 bg-blue-400/10 p-6 sm:p-8" : "mt-10 rounded-[28px] border border-primary/20 bg-primary/5 p-6 sm:p-8"}>
          <h2 className="font-display text-2xl font-semibold">Explore more from Nuru Faith</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {related.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={isHome ? "rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:border-cyan-300/40" : "rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:border-primary/40"}
              >
                {link.label}
              </a>
            ))}
          </div>
        </section>

        <footer className={isHome ? "mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 py-6 text-xs text-blue-100/65" : "mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border py-6 text-xs text-muted-foreground"}>
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
