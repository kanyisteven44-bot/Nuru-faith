import { createFileRoute } from "@tanstack/react-router";
import { PublicSeoLanding } from "@/components/nuru/PublicSeoLanding";

const canonical = "https://app.nurufaith.co.ke/christian-app-kenya";

export const Route = createFileRoute("/christian-app-kenya")({
  head: () => ({
    meta: [
      { title: "Christian App in Kenya & Africa | Bible, Prayer & Community | Nuru Faith" },
      {
        name: "description",
        content:
          "Nuru Faith is a Christian app for Kenya, Africa and beyond, combining Bible reading, prayer, gospel media, learning, mentorship and community.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Christian App in Kenya & Africa | Nuru Faith" },
      {
        property: "og:description",
        content: "A Christian digital space for Bible reading, prayer, learning, worship and community in Kenya, Africa and beyond.",
      },
      { property: "og:url", content: canonical },
    ],
    links: [{ rel: "canonical", href: canonical }],
  }),
  component: ChristianKenyaPage,
});

function ChristianKenyaPage() {
  return (
    <PublicSeoLanding
      eyebrow="Christian app in Kenya & Africa"
      title="A Christian digital space built with Africa's next generation in view."
      intro="Nuru Faith is designed for Christians in Kenya, across Africa and beyond who want Scripture, learning, prayer, worship and meaningful community in one place."
      canonical={canonical}
      description="A Christian app for Kenya and Africa with Bible reading, prayer, gospel media, learning, mentorship and community."
      features={[
        { title: "Bible and discipleship", text: "Keep Scripture and structured Christian growth at the center of the experience." },
        { title: "African gospel discovery", text: "Discover gospel and worship media alongside artists and Christian content from Africa and the wider world." },
        { title: "Young people in focus", text: "Nuru is built especially with the questions, pressures and opportunities facing younger Christians in mind." },
        { title: "Prayer and mentorship", text: "Connect spiritual growth with prayer, guidance and meaningful relationships." },
        { title: "Groups and community", text: "Create space for faith communities to connect beyond a single gathering or Sunday service." },
        { title: "One connected experience", text: "Move between Bible reading, learning, worship and community without fragmenting your faith across unrelated apps." },
      ]}
      sections={[
        {
          title: "Christian technology for an African context",
          text: "Africa has a young, mobile-first population and deeply active Christian communities. Nuru Faith is being shaped as a digital space where Scripture, discipleship, worship and community can meet the way people already communicate and learn online.",
        },
        {
          title: "From Kenya to a wider Christian community",
          text: "Nuru's vision is not limited to one church or one location. The platform is designed to support faith growth and Christian connection for people in Kenya, across Africa and eventually wider global communities.",
        },
      ]}
      faq={[
        { question: "Is Nuru Faith available in Kenya?", answer: "Yes. Nuru Faith is available on the web and is designed for users in Kenya as well as a wider African and global Christian audience." },
        { question: "Does Nuru include African gospel content?", answer: "Nuru's media directory includes approved gospel and worship sources with African artists alongside Christian media from other regions." },
        { question: "Is Nuru tied to one church?", answer: "Nuru is designed as a wider Christian faith and community platform rather than a site for only one local congregation." },
      ]}
      related={[
        { href: "/christian-app", label: "Christian app" },
        { href: "/bible-app-for-young-people", label: "Bible app for young people" },
        { href: "/christian-community-app", label: "Christian community app" },
        { href: "/gospel-music-app", label: "Gospel music & worship" },
      ]}
    />
  );
}
