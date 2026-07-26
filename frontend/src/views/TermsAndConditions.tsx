import InfoPageLayout from "../components/layout/InfoPageLayout";

const TermsAndConditions = () => (
  <InfoPageLayout
    title="Terms & Conditions"
    description="By using SpeakUp GC, you agree to these terms and conditions. Please read them carefully to understand your rights and responsibilities."
    lastUpdated="March 17, 2026"
    sections={[
      {
        title: "Acceptable Use",
        content:
          "SpeakUp GC is a platform for reporting gender-based violence and harassment incidents in accordance with Philippine law. You agree to use this platform only for legitimate reporting purposes and not for false, malicious, or defamatory complaints.",
      },
      {
        title: "Eligibility",
        content:
          "This platform is available to students, faculty, staff, and authorized personnel of Gordon College. By using SpeakUp GC, you confirm that you are eligible to file complaints under the Gordon College Committee on Decorum and Investigation (CODI).",
      },
      {
        title: "Prohibited Actions",
        content: [
          "Submit false or fabricated reports",
          "Harass, threaten, or defame any individual",
          "Violate any applicable laws or regulations",
          "Interfere with the proper functioning of the platform",
        ],
      },
      {
        title: "Governing Law",
        content:
          "This platform operates under Republic Act No. 11313 (Safe Spaces Act), Republic Act No. 7877 (Anti-Sexual Harassment Act), and the Gordon College Committee on Decorum and Investigation (GC-CODI) procedures. All complaints are subject to investigation and resolution in accordance with these legal frameworks.",
      },
      {
        title: "Modifications",
        content:
          "Gordon College reserves the right to modify these terms at any time. Continued use of the platform constitutes acceptance of any changes.",
      },
    ]}
    links={[
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Mission", href: "/mission" },
    ]}
  />
);

export default TermsAndConditions;
