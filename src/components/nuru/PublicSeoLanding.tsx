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
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: title,
        description,
        isPartOf: { "@id": "https://app.nurufaith.co.ke/#website" },
        about: {
          "@type": "SoftwareApplication",
          name: "Nuru Faith",
          applicationCategory: "LifestyleApplication",
          operatingSystem: "Web",
          url: "https://app.nurufaith.co.ke/about",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Nuru Faith",
            item: "https://app.nurufaith.co.ke/",
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
    <main className="min-h-dvh bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3" aria-label="Nuru Faith home">
            <NuruMark className="h-11 w-11" />
            <span>
              <span className="block font-display text-xl font-bold">
                Nuru <span className="text-leaf">Faith</span>
              </span>
              <span className="block text-xs text-muted-foreground">by Vortiqora Technologies</span>
            </span>
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Join Nuru
          </Link>
        </header>

        <nav className="mt-8 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground hover:underline">Nuru Faith</Link>
          <span aria-hidden="true"> / </span>
          <span>{eyebrow}</span>
        </nav>

        <section className="py-12 sm:py-16">
          <span className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            {eyebrow}
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-bold tracking-tight sm:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
            {intro}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              Create a free account
            </Link>
            <Link
              to="/about"
              className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold"
            >
              Explore Nuru Faith
            </Link>
          </div>
        </section>

        <PwaInstallGuide />

        <section aria-labelledby="features-heading">
          <h2 id="features-heading" className="font-display text-2xl font-semibold">
            What you can do with Nuru Faith
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-[24px] border border-border bg-card p-5 shadow-sm">
                <h3 className="font-display text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 space-y-4">
          {sections.map((section) => (
            <article key={section.title} className="rounded-[24px] border border-border bg-card p-6 sm:p-7">
              <h2 className="font-display text-2xl font-semibold">{section.title}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
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
              <details key={item.question} className="rounded-[20px] border border-border bg-card p-5">
                <summary className="cursor-pointer font-semibold">{item.question}</summary>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[28px] border border-primary/20 bg-primary/5 p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold">Explore more from Nuru Faith</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {related.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:border-primary/40"
              >
                {link.label}
              </a>
            ))}
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
