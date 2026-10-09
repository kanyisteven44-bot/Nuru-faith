import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SplashScreen } from "@/components/nuru/SplashScreen";
import { PublicSeoLanding } from "@/components/nuru/PublicSeoLanding";

const PUBLIC_SITE = "https://nurufaith.co.ke/";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nuru Faith | Christian Community, Bible & Learning App" },
      {
        name: "description",
        content:
          "Nuru Faith connects young Christians through Bible reading, prayer, faith courses, gospel music and meaningful community. Developed by Stephen Kanyi through Vortiqora Technologies.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Nuru Faith — Connect. Grow. Live Your Faith." },
      {
        property: "og:description",
        content: "Discover Nuru Faith: Bible reading, Christian learning, worship and community, created by Stephen Kanyi through Vortiqora Technologies.",
      },
      { property: "og:url", content: PUBLIC_SITE },
      { property: "og:type", content: "website" },
    ],
    // The public SEO landing never displays the Welcome landscape. Do not
    // prefetch its large image here and compete with first-render CSS/fonts.
    links: [{ rel: "canonical", href: PUBLIC_SITE }],
  }),
  component: EntryPage,
});


const features = [
  {
    title: "Read the Bible",
    text: "Find Scripture, explore verses, and build a consistent Bible-reading habit.",
  },
  {
    title: "Courses and devotions",
    text: "Grow through Christian courses, devotionals and guided learning series.",
  },
  {
    title: "Prayer and mentorship",
    text: "Build a prayer rhythm and find support through faith-centered relationships.",
  },
  {
    title: "Worship and gospel music",
    text: "Explore Christian music, artists and worship content within the Nuru experience.",
  },
  {
    title: "Community and messaging",
    text: "Connect with people and groups around shared Christian values.",
  },
  {
    title: "Nuru AI",
    text: "Explore faith-related questions alongside Bible reading and structured learning.",
  },
];

function EntryPage() {
  const navigate = useNavigate();
  const [destination, setDestination] = useState<"/home" | "/welcome" | null>(null);
  const [introComplete, setIntroComplete] = useState(false);

  // Keep meaningful SSR content for visitors and search crawlers. On the
  // client, the original Gen Z opening plays once per tab session and then
  // enters the existing Connect / Grow / Serve welcome screen.
  useEffect(() => {
    let active = true;
    void supabase.auth.getSession()
      .then(({ data }) => {
        if (active) setDestination(data.session ? "/home" : "/welcome");
      })
      .catch(() => {
        if (active) setDestination("/welcome");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (introComplete && destination) {
      void navigate({ to: destination, replace: true });
    }
  }, [destination, introComplete, navigate]);

  return (
    <>
      <PublicSeoLanding
        eyebrow="Faith • Learning • Community"
        title="Nuru Faith — Connect. Grow. Live Your Faith."
        intro="A Christian community and learning platform for the next generation. Read Scripture, pray, explore courses and devotions, discover worship, and connect with others through Nuru Faith."
        canonical={PUBLIC_SITE}
        description="Nuru Faith is a Christian community and learning app, developed by Stephen Kanyi through Vortiqora Technologies in Kenya."
        features={features}
        sections={[
          {
            title: "Built for a generation growing in faith",
            text: "Nuru Faith brings Bible reading, guided learning, prayer, worship and community together. Its goal is to help young people build meaningful habits and relationships, rather than simply scroll through more content.",
          },
          {
            title: "Meet Stephen Kanyi, the founder",
            text: "Stephen Kanyi began developing Nuru Faith at age 18 through Vortiqora Technologies. Inspired by the needs of young people and the possibilities of technology, he is building Nuru Faith with a vision for stronger Christian learning and community in Kenya, across Africa and beyond.",
          },
        ]}
        faq={[
          {
            question: "What is Nuru Faith?",
            answer: "Nuru Faith is a faith-centered platform for Bible reading, Christian courses, devotions, worship, prayer, mentorship and community.",
          },
          {
            question: "Who founded Nuru Faith?",
            answer: "Stephen Kanyi began developing Nuru Faith at age 18 through Vortiqora Technologies in Kenya.",
          },
          {
            question: "How can I try Nuru Faith?",
            answer: "Choose Join Nuru to create an account. Existing members can sign in from the Nuru Faith welcome page.",
          },
        ]}
        related={[
          { href: "/about#founder", label: "Our founder" },
          { href: "/bible-app-for-young-people", label: "Bible reading" },
          { href: "/christian-community-app", label: "Christian community" },
          { href: "/welcome", label: "Open Nuru Faith" },
        ]}
      />
      <SplashScreen initialOnly onComplete={() => setIntroComplete(true)} />
    </>
  );
}
