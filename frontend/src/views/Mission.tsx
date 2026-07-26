import InfoPageLayout from "../components/layout/InfoPageLayout";

const Mission = () => (
  <InfoPageLayout
    title="Our Mission"
    description="Empower individuals to speak up safely and get the help they need. We provide confidential reporting tools, connect you with trained professionals, and share knowledge to prevent misconduct and promote well-being."
    sections={[
      {
        title: "What We Do",
        content:
          "SpeakUp GC empowers Gordon College students with a safe, confidential channel to raise concerns under the Safe Spaces Act (RA 11313) and Anti-Sexual Harassment Act (RA 7877). We bridge the gap between students and DEIU — ensuring every complaint is heard, tracked, and resolved with care.",
      },
      {
        title: "Confidential Reporting",
        content:
          "Confidential, secure reporting with clear next steps. Students can file complaints anonymously or with identification, and track their case status in real time.",
      },
      {
        title: "Resources & Support",
        content:
          "Evidence-based resources for prevention and recovery, including policy guides, FAQs, and educational materials on student rights and the complaint process.",
      },
      {
        title: "Human-Centered Support",
        content:
          "Warm, human support available when you need it most. Trained DEIU administrators guide complainants through every stage of the process.",
      },
    ]}
    links={[
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
    ]}
  />
);

export default Mission;
