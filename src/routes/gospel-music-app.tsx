import { createFileRoute } from "@tanstack/react-router";
import { PublicSeoLanding } from "@/components/nuru/PublicSeoLanding";

const canonical = "https://nurufaith.co.ke/gospel-music-app";

export const Route = createFileRoute("/gospel-music-app")({
  head: () => ({
    meta: [
      { title: "Gospel Music & Worship App | Christian Media | Nuru Faith" },
      {
        name: "description",
        content:
          "Discover gospel artists, worship music and Christian media alongside Bible reading, prayer, courses and community with Nuru Faith.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Gospel Music & Worship App | Nuru Faith" },
      {
        property: "og:description",
        content: "Discover gospel and worship media while staying connected to Scripture, prayer and Christian community.",
      },
      { property: "og:url", content: canonical },
    ],
    links: [{ rel: "canonical", href: canonical }],
  }),
  component: GospelMusicPage,
});

function GospelMusicPage() {
  return (
    <PublicSeoLanding
      eyebrow="Gospel music & worship"
      title="Discover worship media without leaving your wider faith journey behind."
      intro="Nuru Faith brings gospel artists, worship music and Christian media into the same experience as Bible reading, prayer, courses and community."
      canonical={canonical}
      description="Discover gospel artists, worship music and Christian media alongside Bible reading, prayer, learning and community."
      features={[
        { title: "Gospel artists", text: "Explore approved gospel and worship artists from Nuru's growing media directory." },
        { title: "Worship music", text: "Discover music for praise, worship and faith-centered listening." },
        { title: "Christian video", text: "Explore Christian video and faith media alongside the rest of the Nuru experience." },
        { title: "Faith-filled Reels", text: "Discover short-form Christian content designed for a faith-focused feed." },
        { title: "Bible and prayer", text: "Move from listening back into Scripture, prayer and spiritual reflection." },
        { title: "Community", text: "Connect worship and media discovery with the people and conversations around your faith." },
      ]}
      sections={[
        {
          title: "Worship as part of a bigger faith experience",
          text: "Music can encourage faith, but Nuru does not treat worship media as the whole journey. It sits alongside Scripture, learning, prayer and community so users can move from listening to deeper spiritual growth.",
        },
        {
          title: "Discover Christian media from a faith-centered space",
          text: "Nuru's media experience is designed around gospel, worship and Christian content rather than a general entertainment feed.",
        },
      ]}
      faq={[
        { question: "Does Nuru Faith include gospel music?", answer: "Nuru includes gospel and worship media discovery from approved sources as part of its wider Christian experience." },
        { question: "Can I also read the Bible in Nuru?", answer: "Yes. Bible reading, Christian courses, devotions and prayer are part of the same Nuru Faith platform." },
        { question: "Is Nuru only a music app?", answer: "No. Worship media is one part of Nuru alongside Scripture, prayer, learning, mentorship, groups and community." },
      ]}
      related={[
        { href: "/christian-app", label: "Christian app" },
        { href: "/bible-app-for-young-people", label: "Bible app for young people" },
        { href: "/christian-community-app", label: "Christian community app" },
        { href: "/about", label: "About Nuru Faith" },
      ]}
    />
  );
}
