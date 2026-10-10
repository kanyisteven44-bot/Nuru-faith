import { createFileRoute } from "@tanstack/react-router";
import { PublicSeoLanding } from "@/components/nuru/PublicSeoLanding";

const canonical = "https://app.nurufaith.co.ke/christian-app";

export const Route = createFileRoute("/christian-app")({
  head: () => ({
    meta: [
      { title: "Christian App for Bible, Prayer & Community | Nuru Faith" },
      {
        name: "description",
        content:
          "Nuru Faith is a Christian app for Bible reading, devotions, prayer, faith courses, gospel media, mentorship and meaningful Christian community.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Christian App for Bible, Prayer & Community | Nuru Faith" },
      {
        property: "og:description",
        content: "Grow in Scripture, prayer, learning, worship and Christian community with Nuru Faith.",
      },
      { property: "og:url", content: canonical },
    ],
    links: [{ rel: "canonical", href: canonical }],
  }),
  component: ChristianAppPage,
});

function ChristianAppPage() {
  return (
    <PublicSeoLanding
      eyebrow="Christian app"
      title="One Christian app for Scripture, growth and real community."
      intro="Nuru Faith brings Bible reading, Christian learning, prayer, gospel media, mentorship and community into one faith-centered digital experience."
      canonical={canonical}
      description="A Christian app for Bible reading, devotions, prayer, courses, gospel media, mentorship and meaningful community."
      features={[
        { title: "Read Scripture", text: "Open the Bible, move through passages and keep Scripture close to your daily faith journey." },
        { title: "Learn and grow", text: "Explore Christian courses, devotions and series built around discipleship and everyday faith." },
        { title: "Pray and connect", text: "Use prayer and community features designed to encourage meaningful Christian connection." },
        { title: "Discover worship", text: "Find gospel artists, worship music and Christian media from approved sources." },
        { title: "Find mentorship", text: "Build faith-centered relationships and discover guidance within the wider Nuru community." },
        { title: "Stay connected", text: "Use groups, messages and community spaces to grow alongside other believers." },
      ]}
      sections={[
        {
          title: "Built for everyday Christian growth",
          text: "Faith is more than a single Sunday moment. Nuru Faith is designed to help people return to Scripture, learn consistently, pray, discover worship content and stay connected to Christian community throughout the week.",
        },
        {
          title: "A digital home without separating faith from community",
          text: "Instead of making Bible reading, learning, worship and community feel like unrelated activities, Nuru brings them together so people can move naturally from reading Scripture to learning, prayer, mentorship and conversation.",
        },
      ]}
      faq={[
        { question: "What is Nuru Faith?", answer: "Nuru Faith is a Christian faith and community app that combines Bible reading, learning, prayer, worship media, mentorship and social community features." },
        { question: "Who is Nuru Faith for?", answer: "Nuru is designed especially with young people and growing Christians in mind, while remaining useful to anyone looking for a faith-centered digital community." },
        { question: "Can I use Nuru Faith on the web?", answer: "Yes. Nuru Faith is available through its web experience at app.nurufaith.co.ke." },
      ]}
      related={[
        { href: "/bible-app-for-young-people", label: "Bible app for young people" },
        { href: "/christian-community-app", label: "Christian community app" },
        { href: "/gospel-music-app", label: "Gospel music & worship" },
        { href: "/christian-app-kenya", label: "Christian app in Kenya & Africa" },
      ]}
    />
  );
}
