/**
 * GBVAwarenessHub — SpeakUp GC
 * Know Your Rights & GBV Awareness Hub
 * Route: /know-your-rights
 */

import React, { useState, useEffect } from "react";
import {
  Scale, ShieldCheck, BookOpen, Phone, Heart, AlertCircle,
  ChevronDown, FileText, MessageCircle, HelpCircle,
  CheckCircle2, Info, ArrowRight, Gavel, Users, Lock, Eye,
  Ban, Handshake, PhoneCall, X,
} from "lucide-react";
import { useNavigate } from "../compat/router";
import { useSearchParams } from "next/navigation";
import { cn } from "../lib/utils";
import GBVChatbot from "../components/GBVChatbot";

type TabId = "laws" | "reporting" | "faq" | "wellness" | "policy";

interface LegalAct { acronym:string; raNumber:string; title:string; color:string; icon:React.ElementType; summary:string; keyProvisions:string[]; penalties:string; whoItProtects:string; }
interface FAQItem { question:string; answer:string; }
interface Hotline { name:string; number:string; dialable:string|null; available:string; description:string; type:"emergency"|"support"|"legal"|"school"; }
interface ReportingStep { step:number; title:string; description:string; tips:string[]; }

const LEGAL_ACTS: LegalAct[] = [
  { acronym:"Safe Spaces Act", raNumber:"RA 11313", title:"Republic Act No. 11313", color:"green", icon:ShieldCheck,
    summary:"Enacted in 2019, the Safe Spaces Act expands the definition of sexual harassment to cover gender-based harassment in streets, public spaces, online, workplaces, and educational institutions. It covers all genders including women, men, and LGBTQIA+ persons.",
    keyProvisions:["Prohibits gender-based sexual harassment in streets, public spaces, online, workplaces, and schools.","Covers catcalling, wolf-whistling, unwanted sexual remarks, unsolicited sexual invitations, misogynistic and homophobic slurs.","Schools must adopt a Code of Conduct and create mechanisms to receive, investigate, and act on complaints.","Mandates at least one (1) anti-sexual harassment focal person per institution.","Prohibits retaliation against complainants and witnesses.","Online sexual harassment includes offensive communications, uploading content without consent, and cyberstalking."],
    penalties:"1–6 months imprisonment and/or fines of ₱10,000–₱500,000 depending on the offense. Institutions face suspension or closure for non-compliance.",
    whoItProtects:"All persons regardless of sex, gender, or sexual orientation — including students, faculty, staff, and visitors in educational settings." },
  { acronym:"Anti-Sexual Harassment Act", raNumber:"RA 7877", title:"Republic Act No. 7877", color:"green", icon:Ban,
    summary:"The Anti-Sexual Harassment Act of 1995 was the first Philippine law addressing sexual harassment in work and educational environments. It holds employers and educators directly liable for failing to prevent or address harassment.",
    keyProvisions:["Defines sexual harassment as an act committed by a person in a position of authority, influence, or moral ascendancy.","Covers workplaces, educational institutions, and training environments.","Requires all institutions to create a written anti-sexual harassment policy.","Mandates the creation of a Committee on Decorum and Investigation (CODI).","Expressly holds superior officers liable if they fail to act on known incidents.","Complainant may file both criminal and administrative cases simultaneously."],
    penalties:"Imprisonment of 1–6 months and/or fine of ₱10,000–₱20,000. Administrative sanctions include dismissal, suspension, or demotion.",
    whoItProtects:"Employees, students, and trainees subjected to sexual harassment by a person with authority, influence, or moral ascendancy over them." },
  { acronym:"Data Privacy Act", raNumber:"RA 10173", title:"Republic Act No. 10173", color:"green", icon:Lock,
    summary:"The Data Privacy Act protects the privacy and security of personal information. In GBV complaints, it ensures your identity and case details remain strictly confidential.",
    keyProvisions:["Personal data must be processed lawfully and only for its stated purpose.","Data collected must be proportionate — only what is necessary for the complaint.","Complainants have the right to access, correct, and request erasure of their data.","Data must be protected from unauthorized access through adequate security measures.","Unauthorized disclosure of a complainant's identity is a criminal offense.","The National Privacy Commission (NPC) oversees compliance and receives complaints."],
    penalties:"Imprisonment of 1–6 years and fines of ₱500,000–₱4,000,000 for unauthorized processing, access, or disclosure of personal information.",
    whoItProtects:"All persons whose personal data is collected, including complainants, respondents, and witnesses in any complaint proceeding." },
];

const REPORTING_STEPS: ReportingStep[] = [
  { step:1, title:"Recognize the Incident", description:"Identify what happened. You do not need to be certain about the law — the DEIU will help classify the incident. Trust your instincts.", tips:["Trust your instincts — if something felt wrong, it likely was.","You are not required to have physical evidence to file a complaint.","An incident can be reported even if it happened some time ago.","Anonymous reporting is available if you're unsure about disclosing your identity."] },
  { step:2, title:"Secure Your Safety", description:"Your immediate safety is the priority. If you are in danger, contact emergency services first. Then document the incident privately — date, time, location, description, and witnesses.", tips:["Take screenshots of digital evidence (messages, posts, emails) and store them securely.","Write down what happened in your own words while it is fresh.","Identify any witnesses who may support your account.","Do not confront the respondent directly if you feel unsafe."] },
  { step:3, title:"File a Complaint on SpeakUp GC", description:'Use "File a Complaint" to submit a formal or anonymous complaint. A written sworn statement (sinumpaang salaysay) is required for formal complaints.', tips:["You may choose to remain anonymous — your identity will not be shared without your consent.","Upload all available evidence: photos, screenshots, documents, recordings.","A sworn statement strengthens your complaint and is required for formal cases.","You will receive a Case ID immediately upon submission — keep it for tracking."] },
  { step:4, title:"DEIU Review & Investigation", description:"The DEIU will review your complaint, assign a case handler, and conduct a formal investigation in accordance with the Gordon College CODI and applicable Republic Acts.", tips:["You will be notified when your case is assigned to a handler.","You may be asked to provide additional evidence or a formal statement.","The DEIU will contact the respondent separately — your identity is protected.","Both parties have the right to be heard. Retaliation is strictly prohibited."] },
  { step:5, title:"Formal Hearing (if applicable)", description:"For formal complaints, a hearing may be scheduled where both parties can present their case. You will be notified of the date, time, and venue.", tips:["You will receive written notice at least 5 days before the hearing.","You have the right to bring a support person, advocate, or representative.","You may submit written statements if you cannot attend in person.","The hearing is conducted in a safe, confidential environment."] },
  { step:6, title:"Decision & Next Steps", description:"The DEIU will issue a written decision. Both parties will be notified of the outcome. You may file a motion for reconsideration within the prescribed period.", tips:["The written decision includes findings, conclusions, and any sanction imposed.","You have the right to appeal or file a motion for reconsideration.","Regardless of the outcome, you are entitled to wellness and support resources.","You may also pursue civil or criminal remedies independently through the courts."] },
];

const FAQ_ITEMS: FAQItem[] = [
  { question:"Can I file a complaint anonymously?", answer:"Yes. SpeakUp GC supports anonymous filing. However, anonymous complaints may limit the scope of the investigation since the DEIU cannot directly communicate with you for clarification. Anonymous complaints are still reviewed and acted upon, and can lead to systemic interventions even without identifying a specific respondent." },
  { question:"Will the respondent know who filed the complaint?", answer:"Your identity is strictly confidential and will NOT be disclosed to the respondent without your explicit written consent. The DEIU is bound by the Data Privacy Act (RA 10173) and institutional policy to protect complainant identities at all times." },
  { question:"What counts as sexual harassment under Philippine law?", answer:"Under RA 11313 and RA 7877, sexual harassment includes: unwanted physical contact, sexual remarks or jokes, catcalling, wolf-whistling, displaying sexual materials, unsolicited sexual invitations, sending explicit messages or images, cyberstalking, misogynistic or homophobic slurs, and any act that demeans, intimidates, or endangers a person based on their sex or gender." },
  { question:"What if the harasser is a professor or person of authority?", answer:"This is explicitly covered by RA 7877. Persons in authority — including professors, supervisors, trainers, and administrators — are held to a higher standard. Filing a complaint against a superior is protected, and retaliation (such as failing grades or hostility) is itself a punishable offense." },
  { question:"Is there a deadline for filing a complaint?", answer:"For administrative complaints within Gordon College, the CODI prescribes specific prescription periods. Under RA 11313, a criminal complaint must be filed within the prescriptive period (generally 1–10 years depending on severity). File as soon as possible while evidence and memories are fresh, but late filing does not automatically disqualify a complaint." },
  { question:"Can I file a complaint if the harassment happened online?", answer:"Yes. RA 11313 explicitly covers online and digital spaces. Gender-based online sexual harassment includes sending unwanted explicit content, cyberstalking, creating demeaning content, and posting intimate images without consent. Screenshot and preserve all digital evidence before filing." },
  { question:"What is a 'sinumpaang salaysay' and do I need one?", answer:"A sinumpaang salaysay is a written account of events sworn under oath before a notary public or authorized official. It is required for formal complaints as it establishes the factual basis of your case and carries legal weight. Write it in your own words — the DEIU can guide you through the process." },
  { question:"Can the respondent retaliate against me for filing a complaint?", answer:"Retaliation is strictly prohibited and is itself a punishable offense under RA 11313 and the Gordon College CODI. If you experience any form of retaliation — threats, harassment, discrimination, or changes in academic standing — report it immediately to the DEIU." },
  { question:"What support is available while my case is ongoing?", answer:"Gordon College DEIU offers counseling, academic accommodations, safety planning, and referral services throughout the complaint process. You are not alone, and you do not need to wait for a case resolution to access support." },
  { question:"Can I pursue both an institutional and a criminal complaint at the same time?", answer:"Yes. Filing an institutional complaint with the DEIU does not prevent you from simultaneously filing a criminal complaint with the PNP or a civil case in court. Both processes are independent of each other, and the DEIU can assist in documenting evidence that may support a legal case." },
];

const HOTLINES: Hotline[] = [
  { name:"National Emergency Hotline", number:"911", dialable:"911", available:"24/7", description:"For immediate emergencies requiring police, fire, or medical response.", type:"emergency" },
  { name:"PNP – Women & Children Protection Center", number:"0917-866-7222", dialable:"09178667222", available:"24/7", description:"Handles violence against women and children, sexual offenses, and GBV-related crimes.", type:"emergency" },
  { name:"DSWD Crisis Intervention Unit", number:"(02) 8931-8101", dialable:"0289318101", available:"24/7", description:"Crisis intervention, temporary shelter, psychosocial support, and referral services for GBV survivors.", type:"support" },
  { name:"Gabriela Women's Hotline", number:"1-800-10-966-3677", dialable:"180010966367", available:"Mon–Fri, 8AM–5PM", description:"Advocacy and support for women's rights, referral to legal aid and shelters.", type:"support" },
  { name:"Commission on Human Rights (CHR)", number:"(02) 8294-8704", dialable:"0282948704", available:"Mon–Fri, 8AM–5PM", description:"Receives complaints involving human rights violations including gender-based discrimination and abuse.", type:"legal" },
  { name:"IBP – Free Legal Aid", number:"(02) 8526-8392", dialable:"0285268392", available:"Mon–Fri, 8AM–5PM", description:"Free legal assistance for qualified individuals, including GBV survivors seeking legal remedies.", type:"legal" },
  { name:"National Privacy Commission (NPC)", number:"(02) 8234-2228", dialable:"0282342228", available:"Mon–Fri, 8AM–5PM", description:"For complaints involving unauthorized disclosure of personal information or complainant identities.", type:"legal" },
  { name:"Gordon College DEIU Office", number:"Via SpeakUp GC", dialable:null, available:"Mon–Fri, 8AM–5PM", description:"Primary contact for all GBV and harassment-related complaints within Gordon College.", type:"school" },
  { name:"GC Guidance & Counseling Office", number:"Via campus directory", dialable:null, available:"Mon–Fri, 8AM–5PM", description:"Provides counseling, psychological first aid, and academic support for students affected by GBV.", type:"school" },
];

const WELLNESS_RESOURCES = [
  { icon:Heart, title:"Psychological First Aid", color:"green", description:"If you just experienced an incident, grounding yourself is important. Focus on your breathing. You are safe right now. The DEIU and Guidance Office can provide immediate psychological support." },
  { icon:Users, title:"Peer Support & Community", color:"green", description:"You are not alone. Many survivors find strength in connecting with others. Gordon College's wellness programs offer peer support circles and group sessions for students affected by GBV." },
  { icon:BookOpen, title:"Self-Care & Coping Resources", color:"green", description:"Healing is non-linear. Journaling, physical activity, creative expression, and mindfulness can help manage stress and trauma responses. The Guidance Office can recommend programs tailored to your needs." },
  { icon:Eye, title:"Safety Planning", color:"green", description:"If you are concerned about your ongoing safety — especially involving someone on campus — the DEIU and Guidance Office can work with you to create a confidential safety plan." },
  { icon:Handshake, title:"Academic Accommodations", color:"green", description:"If a GBV incident is affecting your studies, you may request academic accommodations including deadline extensions, section transfers, or modified attendance. Contact the DEIU with your request." },
  { icon:Lock, title:"Your Rights During Recovery", color:"green", description:"You have the right to recover at your own pace. You are not obligated to disclose your experience publicly. You may withdraw from the formal complaint process without affecting your access to support." },
];

const POLICY_ITEMS = [
  { icon:Gavel, title:"Gordon College Committee on Decorum and Investigation (GC-CODI)", subtitle:"Established under RA 7877 & RA 11313", description:"The GC-CODI is mandated to investigate complaints of sexual harassment and gender-based sexual harassment, ensuring a safe and respectful environment for all members of the Gordon College community.", details:["Chaired by VP for IPDEA with representatives from faculty, students, HRMU, and DEI Unit.","Receives and investigates all sexual and gender-based sexual harassment complaints.","Submits investigation report within 10 days to the Disciplining Authority for decision.","Protects complainants from retaliation and ensures confidentiality throughout the process.","Conducts educational programs to prevent incidents of harassment.","Follows due process — both parties have the right to be heard and present evidence."] },
  { icon:Ban, title:"Sanctions and Disciplinary Actions", subtitle:"Three-tier offense classification system", description:"GC-CODI implements a graduated disciplinary system based on the gravity of the offense. All sanctions comply with RA 7877, RA 11313, and CHED/CSC memoranda.", details:["GRAVE OFFENSES: Unwanted touching of private parts, sexual assault, requesting sexual favors in exchange for benefits. Penalty: Dismissal (subject to Board of Trustees resolution).","LESS GRAVE OFFENSES: Unwanted touching/brushing, derogatory remarks, verbal abuse with sexual overtones. Penalty: 1 month to 6 months suspension (1st offense), dismissal (2nd offense).","LIGHT OFFENSES: Sexist statements, malicious leering, unwelcome sexual comments, offensive gestures. Penalty: Reprimand (1st), suspension 1-30 days (2nd), dismissal (3rd).","Online sexual harassment includes unwanted messages, cyberstalking, uploading content without consent, and impersonation.","Street harassment includes catcalling, wolf-whistling, unwanted invitations, and public indecency."] },
  { icon:Users, title:"Complaint Filing & Investigation Process", subtitle:"Clear procedures and timelines", description:"The GC-CODI follows strict procedural guidelines to ensure transparency, fairness, and efficiency in handling all complaints.", details:["Pre-filing assistance: Counseling, referral to professional help, and guidance on filing options.","Written, signed, and sworn complaint required with: complainant details, respondent information, statement of facts, evidence, and certification of non-forum shopping.","Preliminary investigation commences within 5 days and concludes within 15 working days.","Respondent has 3 days to submit Counter-Affidavit after receiving notice.","Formal charge issued within 3 days if prima facie case is established.","Anonymous complaints are accepted but may limit investigation scope — still reviewed and can lead to systemic interventions."] },
  { icon:ShieldCheck, title:"Protection Orders & Anti-Retaliation", subtitle:"Safeguarding complainants and witnesses", description:"GC-CODI prioritizes the safety and well-being of complainants, witnesses, and all parties involved in the investigation process.", details:["Protection orders may be issued to prevent further harm or threats from perpetrators.","Retaliation against complainants or witnesses is strictly prohibited and independently actionable.","Academic accommodations available: deadline extensions, section transfers, modified attendance.","Confidentiality maintained at all stages — identities protected under Data Privacy Act (RA 10173).","Complainants may withdraw from formal complaint process without affecting access to support services.","DEIU and Guidance Office provide psychological support, safety planning, and referral services."] },
  { icon:Lock, title:"Data Privacy & Confidentiality Policy", subtitle:"In compliance with RA 10173 — Data Privacy Act", description:"Gordon College handles all complaint data in compliance with the Data Privacy Act (RA 10173). This policy governs how your personal information is collected, stored, accessed, and protected throughout the complaint process.", details:["Only authorized GC-CODI and DEIU personnel have access to complaint records and personal data.","Complainant identity will NOT be disclosed to the respondent or any third party without explicit written consent.","Complaint records stored securely and retained for minimum of 10 years as required by law.","Unauthorized disclosure of personal information violates RA 10173 and institutional policy.","You have the right to access, correct, and request erasure of your personal data upon written request.","All proceedings, documents, and identities kept strictly confidential to protect rights and dignity of all individuals."] },
];

// ─── Color maps ──────────────────────────────────────────────────────────────

const WELL_COLORS: Record<string, { bg:string; border:string; icon:string }> = {
  green:   { bg:"bg-green-50",   border:"border-green-200",   icon:"text-[#16A34A]"   },
  rose:    { bg:"bg-rose-50",    border:"border-rose-200",    icon:"text-rose-600"    },
  blue:    { bg:"bg-blue-50",    border:"border-blue-200",    icon:"text-blue-600"    },
  amber:   { bg:"bg-amber-50",   border:"border-amber-200",   icon:"text-amber-600"   },
  violet:  { bg:"bg-violet-50",  border:"border-violet-200",  icon:"text-violet-600"  },
  emerald: { bg:"bg-emerald-50", border:"border-emerald-200", icon:"text-emerald-600" },
  gray:    { bg:"bg-gray-50",    border:"border-gray-200",    icon:"text-gray-500"    },
};

const ACT_COLORS: Record<string, { card:string; badge:string; icon:string; toggle:string }> = {
  green:   { card:"bg-green-50 border-green-200",     badge:"bg-[#16A34A] text-white",   icon:"bg-green-100 text-[#16A34A]",     toggle:"text-[#16A34A] bg-green-100 hover:bg-green-200"      },
  emerald: { card:"bg-emerald-50 border-emerald-200", badge:"bg-emerald-600 text-white", icon:"bg-emerald-100 text-emerald-700", toggle:"text-emerald-700 bg-emerald-100 hover:bg-emerald-200" },
  blue:    { card:"bg-blue-50 border-blue-200",       badge:"bg-blue-600 text-white",    icon:"bg-blue-100 text-blue-700",       toggle:"text-blue-700 bg-blue-100 hover:bg-blue-200"         },
  rose:    { card:"bg-rose-50 border-rose-200",       badge:"bg-rose-600 text-white",    icon:"bg-rose-100 text-rose-700",       toggle:"text-rose-700 bg-rose-100 hover:bg-rose-200"         },
  violet:  { card:"bg-violet-50 border-violet-200",   badge:"bg-violet-600 text-white",  icon:"bg-violet-100 text-violet-700",   toggle:"text-violet-700 bg-violet-100 hover:bg-violet-200"   },
};

const HOTLINE_CONFIG = {
  emergency: { label:"Emergency", bg:"bg-red-600",    light:"bg-red-50 border-red-200",       text:"text-red-900",    sub:"text-red-600"     },
  support:   { label:"Support",   bg:"bg-orange-500", light:"bg-orange-50 border-orange-200", text:"text-orange-900", sub:"text-orange-600"  },
  legal:     { label:"Legal Aid", bg:"bg-blue-600",   light:"bg-blue-50 border-blue-200",     text:"text-blue-900",   sub:"text-blue-600"    },
  school:    { label:"GC Office", bg:"bg-[#16A34A]",  light:"bg-emerald-50 border-emerald-200", text:"text-emerald-900", sub:"text-emerald-700" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function LegalActsGrid({ acts }: { acts: LegalAct[] }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {acts.map((act, i) => {
        const isExpanded = expandedIndex === i;
        const isFullWidth = isExpanded;

        return (
          <div key={i} className={isFullWidth ? "w-full" : ""}>
            {isFullWidth ? (
              <LegalActCard 
                act={act} 
                expanded={isExpanded}
                onToggle={() => setExpandedIndex(isExpanded ? null : i)}
              />
            ) : null}
          </div>
        );
      })}
      
      {/* Grid for collapsed cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {acts.map((act, i) => {
          const isExpanded = expandedIndex === i;
          if (isExpanded) return null;
          
          return (
            <LegalActCard 
              key={i}
              act={act} 
              expanded={false}
              onToggle={() => setExpandedIndex(i)}
            />
          );
        })}
      </div>
    </div>
  );
}

function LegalActCard({ act, expanded, onToggle }: { act: LegalAct; expanded: boolean; onToggle: () => void }) {
  const Icon = act.icon;
  const c = ACT_COLORS[act.color];
  return (
    <div className={cn("rounded-2xl border-2 overflow-hidden transition-all flex flex-col", c.card)}>
      <div className="p-5 flex flex-col">
        <div className="flex items-start gap-4">
          <div className={cn("w-13 h-13 w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0", c.icon)}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={cn("text-xs font-bold px-3 py-1 rounded-full", c.badge)}>{act.raNumber}</span>
              <span className="text-xs font-medium text-gray-400">{act.acronym}</span>
            </div>
            {/* Larger, bolder title for clear hierarchy */}
            <h3 className="text-lg font-extrabold text-gray-900 leading-tight">{act.title}</h3>
          </div>
        </div>
        {/* Lighter description text */}
        <div className="flex-1">
          <p className="text-sm text-gray-600 leading-loose mt-3">{act.summary}</p>
        </div>
        {/* Friendlier CTA button */}
        <button
          onClick={onToggle}
          className={cn("mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold w-full transition-colors", c.toggle)}
        >
          {expanded
            ? <><ChevronDown className="h-4 w-4" />Show less</>
            : <><ArrowRight className="h-4 w-4" />Read more — provisions &amp; penalties</>}
        </button>
      </div>
      {expanded && (
        <div className="border-t-2 border-white/50 px-5 py-5 space-y-4 bg-white/60">
          <div className="flex items-start gap-3 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <Users className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Who It Protects</p>
              <p className="text-sm text-gray-700 leading-relaxed">{act.whoItProtects}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Key Provisions</p>
            <div className="space-y-2">
              {act.keyProvisions.map((p, i) => (
                <div key={i} className="flex items-start gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-[#16A34A] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700 leading-relaxed">{p}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <Gavel className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">Penalties</p>
              <p className="text-sm text-amber-900 leading-relaxed">{act.penalties}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className={cn("bg-white border-2 rounded-2xl overflow-hidden transition-all", openIndex === i ? "border-[#16A34A]/40 shadow-sm" : "border-gray-100 hover:border-gray-200")}>
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left"
          >
            <div className="flex items-start gap-3 flex-1">
              <span className={cn("flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 transition-colors", openIndex === i ? "bg-[#16A34A] text-white" : "bg-gray-100 text-gray-500")}>
                {i + 1}
              </span>
              <span className="text-sm font-semibold text-gray-800 leading-snug">{item.question}</span>
            </div>
            <ChevronDown className={cn("h-5 w-5 flex-shrink-0 mt-0.5 transition-transform", openIndex === i ? "text-[#16A34A] rotate-180" : "text-gray-400")} />
          </button>
          {openIndex === i && (
            <div className="px-5 pb-5">
              <div className="ml-10">
                <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function HotlineCard({ hotline }: { hotline: Hotline }) {
  const cfg = HOTLINE_CONFIG[hotline.type];
  return (
    <div className={cn("rounded-2xl border-2 p-5 space-y-3", cfg.light)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={cn("text-[11px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full text-white", cfg.bg)}>{cfg.label}</span>
            <span className={cn("text-xs font-medium", cfg.sub)}>{hotline.available}</span>
          </div>
          <p className={cn("text-sm font-bold leading-snug", cfg.text)}>{hotline.name}</p>
        </div>
        {hotline.dialable && (
          <a href={`tel:${hotline.dialable}`} className={cn("flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-opacity hover:opacity-80 shadow-sm", cfg.bg)} aria-label={`Call ${hotline.name}`}>
            <PhoneCall className="h-5 w-5 text-white" />
          </a>
        )}
      </div>
      {hotline.dialable ? (
        <a href={`tel:${hotline.dialable}`} className="flex items-center gap-2 group">
          <Phone className={cn("h-4 w-4 flex-shrink-0", cfg.sub)} />
          <span className={cn("text-xl font-extrabold tracking-wide group-hover:underline underline-offset-2", cfg.text)}>{hotline.number}</span>
        </a>
      ) : (
        <div className="flex items-center gap-2">
          <Phone className={cn("h-4 w-4 flex-shrink-0", cfg.sub)} />
          <span className={cn("text-base font-bold", cfg.text)}>{hotline.number}</span>
        </div>
      )}
      <p className={cn("text-sm leading-relaxed opacity-80", cfg.text)}>{hotline.description}</p>
    </div>
  );
}

function PolicyCard({ item }: { item: typeof POLICY_ITEMS[0] }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = item.icon;
  return (
    <div className={cn("bg-white border-2 rounded-2xl overflow-hidden transition-all", expanded ? "border-[#16A34A]/40 shadow-sm" : "border-gray-100")}>
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F0FDF4] border border-[#16A34A]/20 flex items-center justify-center flex-shrink-0">
            <Icon className="h-6 w-6 text-[#16A34A]" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-[#16A34A] uppercase tracking-wide mb-0.5">{item.subtitle}</p>
            <h3 className="text-base font-bold text-gray-900 mb-2">{item.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-[#16A34A] bg-[#F0FDF4] hover:bg-green-100 transition-colors px-4 py-2.5 rounded-xl w-full"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          {expanded ? "Show less" : "View details"}
        </button>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-2">
          {item.details.map((d, i) => (
            <div key={i} className="flex items-start gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100">
              <CheckCircle2 className="h-4 w-4 text-[#16A34A] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function GBVAwarenessHub() {
  const [activeTab, setActiveTab] = useState<TabId>("laws");
  const navigate = useNavigate();
  const searchParams = useSearchParams();

  // Sync tab from ?tab= query param (used by sidebar sub-nav)
  useEffect(() => {
    const tab = searchParams?.get("tab") as TabId | null;
    if (tab && ["laws","reporting","faq","wellness","policy"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id:"laws",      label:"Legal Rights",  icon:Scale      },
    { id:"reporting", label:"How to Report", icon:FileText   },
    { id:"faq",       label:"FAQs",          icon:HelpCircle },
    { id:"wellness",  label:"Wellness",      icon:Heart      },
    { id:"policy",    label:"GC Policies",   icon:Gavel      },
  ];

  return (
    <div className="min-h-full w-full">

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0f2d1a] via-[#163d25] to-[#1e5c38] px-6 py-8 relative overflow-hidden rounded-2xl mb-6 w-full">
        <div className="absolute inset-0 pointer-events-none opacity-[0.05]">
          <ShieldCheck className="absolute right-6 top-1/2 -translate-y-1/2 w-56 h-56 text-white" strokeWidth={1} />
        </div>
        <div className="max-w-5xl mx-auto w-full">
          {/* Top row: badge */}
          <div className="flex items-center mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-white/70" />
              <span className="text-white/70 text-xs font-bold uppercase tracking-widest">Know Your Rights</span>
            </div>
          </div>

          {/* Main hero row */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-2">
                GBV Awareness &amp; Rights Hub
              </h1>
              <p className="text-white/75 text-sm leading-relaxed max-w-lg">
                Philippine legal protections, reporting guidance, and victim support
                for the Gordon College community.
              </p>
            </div>
            <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0">
              <button
                onClick={() => navigate("/complaints/new")}
                className="flex items-center gap-2 bg-white text-[#15803D] text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-green-50 transition-colors shadow-sm whitespace-nowrap"
              >
                <FileText className="h-4 w-4" />File a Complaint
              </button>

            </div>
          </div>
        </div>
      </div>

      {/* Tab bar — visible on mobile only; desktop uses sidebar sub-nav */}
      <div className="md:hidden sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex overflow-x-auto scrollbar-none">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all whitespace-nowrap border-b-2 flex-shrink-0",
                    active
                      ? "border-[#16A34A] text-[#16A34A]"
                      : "border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="space-y-6">

        {/* LEGAL RIGHTS */}
        {activeTab === "laws" && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 bg-green-50 border-2 border-green-200 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <Info className="h-5 w-5 text-[#16A34A]" />
              </div>
              <div>
                <p className="text-base font-bold text-green-900 mb-1">Understanding Your Legal Protections</p>
                <p className="text-sm text-green-700 leading-relaxed">
                  Philippine law provides multiple layers of protection for GBV and sexual harassment survivors.
                  These laws apply to all members of the Gordon College community.
                </p>
              </div>
            </div>
            <LegalActsGrid acts={LEGAL_ACTS} />
          </div>
        )}

        {/* HOW TO REPORT */}
        {activeTab === "reporting" && (
          <div className="space-y-6">
            <div className="bg-[#F0FDF4] border-2 border-[#16A34A]/25 rounded-2xl p-5">
              <p className="text-base font-bold text-[#15803D] mb-2">Step-by-Step Reporting Guide</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Reporting can feel overwhelming. This guide walks you through each stage so you know what to expect. You are supported at every step.
              </p>
            </div>
            <div className="relative">
              {/* Vertical connector */}
              <div className="absolute left-[23px] top-10 bottom-10 w-0.5 bg-gradient-to-b from-[#16A34A] to-[#16A34A]/10 pointer-events-none" />
              <div className="space-y-4">
                {REPORTING_STEPS.map(s => (
                  <div key={s.step} className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#16A34A] text-white flex items-center justify-center flex-shrink-0 font-extrabold text-base shadow-md ring-4 ring-white z-10">
                      {s.step}
                    </div>
                    <div className="flex-1 bg-white border-2 border-gray-100 rounded-2xl p-5 hover:border-[#16A34A]/20 transition-colors mb-1">
                      <h3 className="text-base font-bold text-gray-900 mb-2">{s.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed mb-4">{s.description}</p>
                      <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">What to do</p>
                        {s.tips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <CheckCircle2 className="h-4 w-4 text-[#16A34A] mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-700 leading-relaxed">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => navigate("/complaints/new")}
              className="w-full flex items-center justify-center gap-3 bg-[#16A34A] hover:bg-[#15803D] text-white text-base font-bold py-4 rounded-2xl transition-colors shadow-md"
            >
              <FileText className="h-5 w-5" />File a Formal Complaint Now<ArrowRight className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* FAQs */}
        {activeTab === "faq" && (
          <div className="space-y-6">
            <div className="bg-[#F0FDF4] border-2 border-[#16A34A]/25 rounded-2xl p-5">
              <p className="text-base font-bold text-[#15803D] mb-2">Frequently Asked Questions</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Common questions about GBV, harassment, the complaint process, and your rights under Philippine law and Gordon College policy.
              </p>
            </div>
            <FAQAccordion items={FAQ_ITEMS} />
            <div className="bg-white border-2 border-gray-100 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-5 w-5 text-[#16A34A]" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-800 mb-1">Still have questions?</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Contact the DEIU office directly through SpeakUp GC or use the AI Assistant (Laya) for guided support.
                  The Guidance & Counseling Office is also available for personal assistance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* WELLNESS */}
        {activeTab === "wellness" && (
          <div className="space-y-6">
            <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                <Heart className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <p className="text-base font-bold text-rose-800 mb-1">You Are Not Alone</p>
                <p className="text-sm text-rose-700 leading-relaxed">
                  Healing from GBV or harassment takes time. Gordon College is committed to providing holistic support —
                  regardless of whether you choose to file a formal complaint.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {WELLNESS_RESOURCES.map((r, i) => {
                const Icon = r.icon;
                const c = WELL_COLORS[r.color];
                return (
                  <div key={i} className={cn("rounded-2xl border-2 p-5 space-y-3", c.bg, c.border)}>
                    <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center border-2", c.bg, c.border)}>
                      <Icon className={cn("h-5 w-5", c.icon)} />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">{r.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{r.description}</p>
                  </div>
                );
              })}
            </div>
            <div className="bg-[#F0FDF4] border-2 border-[#16A34A]/30 rounded-2xl p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#16A34A]/10 flex items-center justify-center mx-auto">
                <ShieldCheck className="h-7 w-7 text-[#16A34A]" />
              </div>
              <p className="text-base font-extrabold text-[#15803D]">Anti-Retaliation Guarantee</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Under <strong>RA 11313</strong> and Gordon College policy, any form of retaliation against you
                for reporting, assisting in a complaint, or accessing support is strictly prohibited and independently actionable.
              </p>
              <button
                onClick={() => navigate("/complaints/new")}
                className="inline-flex items-center gap-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                Report Retaliation <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* GC POLICIES */}
        {activeTab === "policy" && (
          <div className="space-y-6">
            <div className="bg-[#F0FDF4] border-2 border-[#16A34A]/25 rounded-2xl p-5">
              <p className="text-base font-bold text-[#15803D] mb-2">Gordon College Institutional Policies</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                These policies govern how Gordon College handles GBV and harassment cases, protects complainants,
                and ensures due process for all parties — aligned with applicable Philippine laws.
              </p>
            </div>
            {POLICY_ITEMS.map((item, i) => <PolicyCard key={i} item={item} />)}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Info className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-800 mb-1">Get the Full Policy Documents</p>
                <p className="text-sm text-amber-700 leading-relaxed">
                  For the full text of the GC CODI, Anti-Sexual Harassment Policy, or Data Privacy Policy,
                  contact the DEIU office or the Office of the Registrar. Printed copies are available upon request.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Footer CTA */}
      <div className="px-5 py-10 mt-8">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/90 border-2 border-[#16A34A]/30 flex items-center justify-center mx-auto shadow-sm">
            <ShieldCheck className="h-8 w-8 text-[#16A34A]" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">Ready to Speak Up?</h2>
          <p className="text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
            You have the right to a safe, respectful environment. The DEIU is here to listen, support, and act —
            with full confidentiality and care.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button onClick={() => navigate("/complaints/new")} className="flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-bold px-7 py-3.5 rounded-xl transition-colors shadow-md">
              <FileText className="h-4 w-4" />File a Complaint
            </button>
            <button onClick={() => navigate("/complaints")} className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold px-7 py-3.5 rounded-xl border-2 border-gray-200 transition-colors shadow-sm">
              Track My Cases
            </button>
          </div>
          <p className="text-xs text-gray-500 pt-2">
            All information is for educational and guidance purposes only. Aligned with Philippine law as of May 2026.
          </p>
        </div>
      </div>

      {/* Floating AI Chatbot */}
      <GBVChatbot />

    </div>
  );
}
