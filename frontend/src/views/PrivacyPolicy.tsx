import InfoPageLayout from "../components/layout/InfoPageLayout";

const PrivacyPolicy = () => (
  <InfoPageLayout
    title="Privacy Policy"
    description="Your privacy is our priority. SpeakUp GC is committed to protecting your personal information and ensuring a safe, confidential environment for all users."
    lastUpdated="March 17, 2026"
    sections={[
      {
        title: "Data Collection & Use",
        content:
          "All complaints submitted through SpeakUp GC are handled with strict confidentiality by the Diversity, Equity, and Inclusion Unit (DEIU) of Gordon College. Your identity will never be disclosed to respondents or any other party without your explicit consent.",
      },
      {
        title: "Legal Compliance",
        content:
          "This system complies with Republic Act No. 10173 (Data Privacy Act of 2012), Republic Act No. 11313 (Safe Spaces Act), and the Gordon College Committee on Decorum and Investigation (CODI).",
      },
      {
        title: "Data Security",
        content:
          "You may file complaints as an identified complainant or anonymously. Your data is stored securely using industry-standard encryption and accessed only by authorized DEIU personnel for investigation purposes.",
      },
      {
        title: "Your Rights",
        content:
          "Under RA 10173, you have the right to access, correct, and request deletion of your personal data. You may also withdraw consent at any time, subject to legal and contractual restrictions.",
      },
    ]}
    links={[
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Mission", href: "/mission" },
    ]}
  />
);

export default PrivacyPolicy;
