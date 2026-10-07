import { createFileRoute } from "@tanstack/react-router";
import { PublicSeoLanding } from "@/components/nuru/PublicSeoLanding";

const canonical = "https://nurufaith.website/bible-app-for-young-people";

export const Route = createFileRoute("/bible-app-for-young-people")({
  head: () => ({
    meta: [
      { title: "Bible App for Young People | Scripture & Faith Growth | Nuru Faith" },
      {
        name: "description",
        content:
          "A Bible app for young people with Scripture reading, Christian courses, devotions, prayer, mentorship and a faith-centered community.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Bible App for Young People | Nuru Faith" },
      {
        property: "og:description",
        content: "Read Scripture and grow through Christian courses, devotions, prayer and community.",
      },
      { property: "og:url", content: canonical },
    ],
    links: [{ rel: "canonical", href: canonical }],
  }),
  component: BibleYouthPage,
});

function BibleYouthPage() {
  return (
    <PublicSeoLanding
      eyebrow="Bible app for young people"
      title="Read the Bible. Understand your faith. Grow with others."
      intro="Nuru Faith gives young people a place to read Scripture and keep growing through Christian courses, devotions, prayer, mentorship and community."
      canonical={canonical}
      description="A Bible app for young people with Scripture reading, Christian courses, devotions, prayer, mentorship and community."
      features={[
        { title: "Bible reading", text: "Move through Scripture and return to the passages that matter in your current season." },
        { title: "Faith courses", text: "Go deeper into topics such as prayer, discipleship, relationships, baptism and everyday Christian life." },
        { title: "Devotions and series", text: "Use shorter faith content when you want a focused way to reflect and keep growing." },
        { title: "Prayer", text: "Make prayer part of the same space where you read, learn and connect." },
        { title: "Mentorship", text: "Discover faith-centered guidance and relationships that support spiritual growth." },
        { title: "Community", text: "Grow alongside people who are also asking questions, learning and living out their faith." },
      ]}
      sections={[
        {
          title: "More than a Bible reader",
          text: "Young people often need help connecting what they read in Scripture with relationships, purpose, decisions and everyday life. Nuru combines Bible access with structured Christian learning and community so the next step after reading is easier to find.",
        },
        {
          title: "Designed for questions as well as answers",
          text: "Christian growth includes learning, reflection and conversation. Nuru creates room for Scripture, study and faith-focused support rather than treating Bible reading as an isolated activity.",
        },
      ]}
      faq={[
        { question: "Is Nuru Faith a Bible app?", answer: "Bible reading is a central part of Nuru Faith, alongside courses, devotions, prayer, worship media, mentorship and Christian community." },
        { question: "Is it made for young Christians?", answer: "Nuru is designed especially with young people and growing Christians in mind, including people exploring how Scripture connects with everyday life." },
        { question: "Does Nuru include Christian learning?", answer: "Yes. Nuru includes faith courses, devotions and series covering Scripture and practical Christian growth." },
      ]}
      related={[
        { href: "/faith-courses/", label: "Explore faith courses" },
        { href: "/books/", label: "Christian books" },
        { href: "/christian-app", label: "Christian app" },
        { href: "/christian-community-app", label: "Christian community" },
      ]}
    />
  );
}
