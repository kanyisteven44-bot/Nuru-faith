import { createFileRoute } from "@tanstack/react-router";
import { PublicSeoLanding } from "@/components/nuru/PublicSeoLanding";

const canonical = "https://nurufaith.website/christian-community-app";

export const Route = createFileRoute("/christian-community-app")({
  head: () => ({
    meta: [
      { title: "Christian Community App for Prayer, Groups & Growth | Nuru Faith" },
      {
        name: "description",
        content:
          "Connect through Christian groups, messages, prayer, mentorship, Scripture and faith learning in the Nuru Faith community app.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Christian Community App | Nuru Faith" },
      {
        property: "og:description",
        content: "A faith-centered space for Christian groups, messages, prayer, mentorship and spiritual growth.",
      },
      { property: "og:url", content: canonical },
    ],
    links: [{ rel: "canonical", href: canonical }],
  }),
  component: ChristianCommunityPage,
});

function ChristianCommunityPage() {
  return (
    <PublicSeoLanding
      eyebrow="Christian community app"
      title="Faith grows differently when you do not have to grow alone."
      intro="Nuru Faith combines Christian community with Scripture, prayer, mentorship, groups and learning so connection can lead to meaningful spiritual growth."
      canonical={canonical}
      description="A Christian community app for groups, messages, prayer, mentorship, Bible reading and faith growth."
      features={[
        { title: "Christian groups", text: "Join faith-centered spaces where people can connect around shared community and growth." },
        { title: "Messages", text: "Keep conversations inside the same Christian community where people learn, worship and pray." },
        { title: "Prayer", text: "Make prayer part of community life rather than a separate experience." },
        { title: "Mentorship", text: "Connect spiritual growth with guidance and relationships that can help people mature in faith." },
        { title: "Bible and learning", text: "Move from conversation back into Scripture, devotions, series and Christian courses." },
        { title: "Christian media", text: "Discover worship and faith media that can encourage both individual and shared growth." },
      ]}
      sections={[
        {
          title: "Community with a clear purpose",
          text: "Nuru is not designed around connection for connection's sake. Its community features sit beside Bible reading, prayer, learning and mentorship so conversations can support a deeper Christian life.",
        },
        {
          title: "A place to belong and keep growing",
          text: "Christian community can be especially important for young people navigating faith, identity, relationships and purpose. Nuru brings those connections into a digital environment built around faith.",
        },
      ]}
      faq={[
        { question: "Can people join groups on Nuru Faith?", answer: "Nuru includes group and community features designed to help users connect and participate in faith-centered spaces." },
        { question: "Does Nuru include messaging?", answer: "Yes. Messaging is part of the wider Nuru community experience." },
        { question: "Is Nuru only a social network?", answer: "No. Community is one part of Nuru alongside Bible reading, Christian learning, prayer, worship media and mentorship." },
      ]}
      related={[
        { href: "/christian-app", label: "Christian app" },
        { href: "/bible-app-for-young-people", label: "Bible app for young people" },
        { href: "/gospel-music-app", label: "Gospel music & worship" },
        { href: "/christian-app-kenya", label: "Nuru in Kenya & Africa" },
      ]}
    />
  );
}
