import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  absolutePublicUrl,
  breadcrumbJsonLd,
  faqJsonLd,
  nsosEntityJsonLd,
  NSOS_PUBLIC_ORIGIN,
  serviceJsonLd,
  usePublicMetadata,
} from "@/lib/publicMetadata";
import { NSOSLogo } from "@/components/NSOSLogo";

const appUrl = "https://nsos-system-uhkdscaf.manus.space";

type Section = { title: string; body: string; bullets?: string[] };
type Faq = { question: string; answer: string };
type PublicPage = {
  path: string;
  navLabel: string;
  title: string;
  description: string;
  eyebrow: string;
  hero: string;
  intro: string;
  sections: Section[];
  related?: string[];
  serviceName?: string;
  faqs?: Faq[];
};

const commonRelated = ["/school-management-software", "/for-schools", "/faq"];

const pages: Record<string, PublicPage> = {
  "/": {
    path: "/",
    navLabel: "Overview",
    title: "NSOS — Nigerian School Operating System",
    description:
      "NSOS is a Nigeria-first school and learning-operations platform for administration, academics, communication, finance, student management and supervised AI workflows.",
    eyebrow: "Nigeria-first school technology",
    hero: "A clearer operating layer for running a modern school.",
    intro:
      "NSOS brings school administration, learning operations, family communication and supervised AI tools into one controlled, multi-tenant platform.",
    sections: [
      {
        title: "One platform for the work schools already do",
        body: "Keep admissions, student records, staff operations, academics, attendance, results, fees and communication connected instead of rebuilding the same information across disconnected tools.",
        bullets: [
          "Admissions and student records",
          "Academic structures, curriculum and results",
          "Attendance, fees and finance operations",
          "Staff, family communication and school websites",
        ],
      },
      {
        title: "Supervised AI, not unsupervised decisions",
        body: "NSOS uses AI where it can reduce administrative effort while keeping people responsible for approvals, records, messages, grading, credentials, payments and publication.",
        bullets: [
          "Review-first setup and course planning",
          "Tenant-scoped school and learning context",
          "Explicit approval gates for consequential actions",
          "Audit-friendly evidence and reversible drafts",
        ],
      },
    ],
    related: [
      "/school-management-software",
      "/school-management-system-nigeria",
      "/ai-for-schools",
      "/for-schools",
    ],
  },
  "/about": {
    path: "/about",
    navLabel: "About NSOS",
    title: "About NSOS — Nigerian School Operating System",
    description:
      "Learn what NSOS is, who it serves and how its Nigeria-first school and learning-operations model keeps important decisions under human control.",
    eyebrow: "About NSOS",
    hero: "The Nigerian School Operating System for connected, accountable operations.",
    intro:
      "NSOS is a Nigeria-first web platform for school administration and broader learning operations. Each institution gets a controlled workspace rather than a shared view of unrelated schools or learners.",
    sections: [
      {
        title: "Built around the institution’s operating reality",
        body: "Schools need a dependable path from admission to records, teaching, attendance, results, fees, communication and family trust. NSOS organises those paths around the roles that use them.",
        bullets: [
          "School owners and administrators",
          "Teachers and staff",
          "Students and learners",
          "Parents and guardians",
        ],
      },
      {
        title: "A platform, not a promise of automatic success",
        body: "NSOS does not claim customer counts, awards, accreditation, government approval or outcomes that are not independently documented. Schools remain responsible for their policies, data quality and decisions.",
        bullets: [
          "Clear permissions",
          "Tenant isolation",
          "Human review",
          "Operational audit trails",
        ],
      },
    ],
    related: ["/for-schools", "/school-administration", "/faq"],
  },
  "/school-management-software": {
    path: "/school-management-software",
    navLabel: "School management software",
    title: "School Management Software for Connected Operations | NSOS",
    description:
      "Understand how NSOS connects admissions, student records, academics, attendance, results, fees, staff operations and communication for school teams.",
    eyebrow: "School management software",
    hero: "Replace disconnected school administration tools with one accountable workspace.",
    intro:
      "School management software is useful when it reflects the whole operating cycle: capturing approved information once, giving the right role access, and keeping each action traceable.",
    sections: [
      {
        title: "What a complete school system should connect",
        body: "NSOS links the records and workflows that school teams routinely coordinate: admissions, enrolment, student history, classes, subjects, attendance, assessments, results, invoices and family communication.",
        bullets: [
          "Admissions to enrolled records",
          "Classes, curriculum and timetable",
          "Attendance to reports",
          "Fees to balances and receipts",
        ],
      },
      {
        title: "Designed for daily use, not just data storage",
        body: "The platform surfaces readiness, missing setup, review queues and next actions so owners and administrators can see what needs attention without exposing records outside their institution.",
        bullets: [
          "Role-aware navigation",
          "Tenant-scoped records",
          "Review-first imports",
          "Export and reporting paths",
        ],
      },
    ],
    related: [
      "/school-administration",
      "/student-management",
      "/academic-management",
      "/for-schools",
    ],
    serviceName: "School management software",
  },
  "/school-management-system-nigeria": {
    path: "/school-management-system-nigeria",
    navLabel: "For Nigerian schools",
    title: "School Management System in Nigeria | NSOS",
    description:
      "Explore a Nigeria-first school management system for admissions, academic operations, attendance, results, fees, communication and supervised digital workflows.",
    eyebrow: "Nigeria-first operations",
    hero: "School management software shaped around Nigerian school workflows.",
    intro:
      "NSOS uses Nigeria-first defaults such as Nigerian state and LGA options, Africa/Lagos time-zone conventions and NGN-ready finance presentation while leaving each school responsible for its own policies and configuration.",
    sections: [
      {
        title: "Where local context matters",
        body: "A useful Nigerian school system must make common local operations easier without claiming that every school follows the same calendar, curriculum or fee policy.",
        bullets: [
          "State and LGA biodata options",
          "Sessions, terms, classes and subjects",
          "NGN fee and payment records",
          "WAT-friendly timetable presentation",
        ],
      },
      {
        title: "Flexible enough for different operators",
        body: "The NSOS model also supports vocational institutes, coaching centres, online training providers and corporate academies through separate operating terminology and tenant boundaries.",
        bullets: [
          "School academics remain school-scoped",
          "Learning pathways for other operators",
          "Role-appropriate learner views",
          "No automatic public or financial action",
        ],
      },
    ],
    related: [
      "/for-schools",
      "/school-fees-management",
      "/parent-portal",
      "/faq",
    ],
    serviceName: "School management system in Nigeria",
  },
  "/for-schools": {
    path: "/for-schools",
    navLabel: "For schools",
    title: "NSOS for Schools — Administration, Learning and Family Trust",
    description:
      "See how NSOS supports school owners, administrators, teachers, finance teams, students and guardians through connected, permission-based workflows.",
    eyebrow: "For school owners and teams",
    hero: "A single operating layer for the institution.",
    intro:
      "NSOS is intended for schools that want a clearer operational path from admission to everyday learning and family communication, without giving an AI or an unapproved role control of consequential decisions.",
    sections: [
      {
        title: "For owners and administrators",
        body: "See readiness, configure academic and finance foundations, review admissions and imports, manage staff operations, and keep public website changes separate from private workspace records.",
        bullets: [
          "Setup and readiness visibility",
          "Protected configuration actions",
          "Review queues and audit evidence",
          "Website and admissions controls",
        ],
      },
      {
        title: "For teachers, families and learners",
        body: "Teachers work within assigned academic responsibilities. Families and learners see only the information their account and relationships permit, such as attendance, results, fees or learning progress.",
        bullets: [
          "Teacher-scoped classroom work",
          "Family-safe portal views",
          "Learner-owned progress context",
          "Clear unavailable and pending states",
        ],
      },
    ],
    related: [
      "/school-administration",
      "/parent-portal",
      "/school-communication",
      "/contact",
    ],
  },
  "/ai-for-schools": {
    path: "/ai-for-schools",
    navLabel: "AI for schools",
    title: "AI for Schools with Human Approval | NSOS",
    description:
      "Understand how NSOS applies supervised AI to school setup, learning design, course planning and operational guidance without autonomous grading, payments, messaging or publication.",
    eyebrow: "Supervised AI for schools",
    hero: "Useful AI assistance with school leaders still in control.",
    intro:
      "NSOS treats AI as a supervised assistant. It can help structure a plan, suggest a draft or explain an operational next step, but it does not silently create people, send messages, charge fees, publish content, grade learners or issue credentials.",
    sections: [
      {
        title: "Where AI can help",
        body: "Review-first AI workflows can help owners and administrators organise institution blueprints, course materials, curriculum ideas, website drafts, school-operator insights and learner-support explanations.",
        bullets: [
          "Drafts that remain editable",
          "Source-aware learning design",
          "Tenant-safe context boundaries",
          "Clear handoff to protected workspaces",
        ],
      },
      {
        title: "What remains human-controlled",
        body: "High-impact actions require the existing role and confirmation boundaries. AI recommendations are not evidence of completion, approval, accreditation or learner outcome.",
        bullets: [
          "No autonomous grading or pass/fail",
          "No automatic enrolment or credential",
          "No provider action or bulk message",
          "No fabricated people, claims or metrics",
        ],
      },
    ],
    related: ["/school-management-software", "/academic-management", "/faq"],
    serviceName: "Supervised AI for schools",
  },
};

const detailPages: Array<
  [string, string, string, string, string, string, string[], string[]]
> = [
  [
    "/school-administration",
    "School administration",
    "School Administration Software for Nigerian Schools | NSOS",
    "School administration",
    "Make the operational path visible from the first enquiry to the school day.",
    "Administration is the connective tissue of a school. NSOS gives owners and administrators a role-aware view of the setup and records required to operate without exposing unrelated tenant data.",
    [
      "Institution and academic setup",
      "Staff and role readiness",
      "Finance and fee structures",
      "Public website and admissions readiness",
    ],
    [
      "/school-management-software",
      "/school-fees-management",
      "/school-communication",
    ],
  ],
  [
    "/student-management",
    "Student management",
    "Student Management Software for Schools | NSOS",
    "Student management",
    "A dependable record of the learner, with access limited to the right people.",
    "Student management includes the approved admission path, class and academic context, guardian relationships, attendance, results, fees and safe portal access.",
    [
      "Admission review and decision states",
      "Tenant-scoped learner records",
      "Class and session context",
      "Guardian relationship controls",
    ],
    ["/school-administration", "/parent-portal", "/school-results-management"],
  ],
  [
    "/academic-management",
    "Academic management",
    "Academic Management Software for Schools | NSOS",
    "Academic management",
    "Connect the academic structure to the work teachers and learners actually do.",
    "NSOS keeps school academics grounded in the institution’s own sessions, terms, classes, subjects and approved curriculum choices.",
    [
      "Sessions and terms",
      "Classes, subjects and timetable",
      "NERDC-aware curriculum setup",
      "Review-first scheme-of-work import",
    ],
    [
      "/school-results-management",
      "/school-attendance-management",
      "/ai-for-schools",
    ],
  ],
  [
    "/school-fees-management",
    "Fees and finance",
    "School Fees Management Software in Nigeria | NSOS",
    "Fees and finance",
    "Give school finance a clear record without turning readiness into a payment claim.",
    "NSOS helps schools organise fee structures, individual invoices, payments, receipts and balances. Provider setup and payment collection remain explicit decisions.",
    [
      "Fee structures and categories",
      "Individual and school-wide charges",
      "Payment and receipt records",
      "Balance and finance reporting",
    ],
    [
      "/school-management-system-nigeria",
      "/school-administration",
      "/parent-portal",
    ],
  ],
  [
    "/school-attendance-management",
    "Attendance",
    "School Attendance Management Software | NSOS",
    "Attendance management",
    "Turn daily attendance into a dependable operational signal.",
    "Attendance data is useful when recorded against the right learner, staff member, class and date, then presented only to roles permitted to see it.",
    [
      "Student attendance capture",
      "Staff attendance workflows",
      "Absence alerts and summaries",
      "CSV-ready reporting paths",
    ],
    ["/student-management", "/school-results-management", "/parent-portal"],
  ],
  [
    "/school-results-management",
    "Results and report cards",
    "School Results Management and Report Cards | NSOS",
    "Results management",
    "Move from score entry to approved results with a clear human review path.",
    "NSOS connects assessment entry, grade computation, approval and report-card presentation without giving an AI or an unapproved role authority to certify a learner.",
    [
      "Assessment and score entry",
      "Grade computation",
      "Approval and publication",
      "Printable report cards",
    ],
    ["/academic-management", "/school-attendance-management", "/parent-portal"],
  ],
  [
    "/parent-portal",
    "Parent portal",
    "Parent and Guardian Portal for Schools | NSOS",
    "Parent and guardian portal",
    "Make the school’s important updates easier for families to follow.",
    "A parent portal is valuable when it shows useful information without turning family access into a back door to the school’s full administration system.",
    [
      "Ward attendance and results",
      "Fee and balance summaries",
      "School announcements",
      "Onboarding and safe access guidance",
    ],
    ["/student-management", "/school-fees-management", "/school-communication"],
  ],
  [
    "/school-communication",
    "School communication",
    "School Communication Software for Families and Staff | NSOS",
    "School communication",
    "Keep important school communication targeted, reviewable and accountable.",
    "NSOS separates drafting, recipient selection, approval, provider readiness and delivery evidence so a message does not become an accidental broad send.",
    [
      "Notice-board publishing",
      "Recipient targeting",
      "In-app delivery history",
      "Delivery-status distinction",
    ],
    ["/parent-portal", "/school-administration", "/ai-for-schools"],
  ],
];
for (const [
  path,
  navLabel,
  title,
  eyebrow,
  hero,
  intro,
  bullets,
  related,
] of detailPages) {
  pages[path] = {
    path,
    navLabel,
    title,
    description: `${hero} ${intro}`,
    eyebrow,
    hero,
    intro,
    sections: [
      { title: "What NSOS supports", body: intro, bullets },
      {
        title: "Reviewable and tenant-scoped",
        body: "NSOS keeps records within the institution, uses role-aware access, and distinguishes planning, review, approval and execution. It does not invent people, outcomes, payments or public claims.",
        bullets: [
          "Role-aware permissions",
          "Tenant isolation",
          "Clear pending and unavailable states",
          "Human approval for consequential actions",
        ],
      },
    ],
    related,
    serviceName: navLabel,
  };
}

pages["/faq"] = {
  path: "/faq",
  navLabel: "FAQ",
  title: "NSOS FAQ — Nigerian School Operating System",
  description:
    "Factual answers about NSOS, school management software, Nigerian school digitisation, parent portals, results, fees, attendance and supervised AI.",
  eyebrow: "Frequently asked questions",
  hero: "Straight answers about what NSOS is and what it does.",
  intro:
    "This FAQ describes the product’s operating model and boundaries. It does not make claims about customer numbers, rankings, accreditation, partnerships or outcomes that are not independently verified.",
  sections: [
    {
      title: "Common questions",
      body: "Choose a question below for a concise product explanation, then follow the related pages for operational detail.",
    },
  ],
  faqs: [
    [
      "What is NSOS?",
      "NSOS means Nigerian School Operating System. It is a Nigeria-first school and learning-operations platform for administration, academic operations, communication, finance, student management and supervised AI workflows.",
    ],
    [
      "What does NSOS do?",
      "NSOS connects admissions, student records, classes, curriculum, attendance, results, fees, staff operations, family communication, school websites and selected review-first AI workflows within tenant-scoped workspaces.",
    ],
    [
      "How can Nigerian schools digitise administration?",
      "A practical path is to start with the school profile, academic calendar, classes, staff, student records, finance and communication foundations, then move approved information through reviewable workflows rather than copying everything into disconnected tools.",
    ],
    [
      "How can schools manage student records digitally?",
      "Schools can use a tenant-scoped student record system that connects approved admissions, class assignment, academic history, guardian relationships, attendance, results and finance context while restricting access by role.",
    ],
    [
      "How can schools manage attendance?",
      "Attendance can be captured against the relevant learner, staff member, class and date, then summarised for authorised school roles. It should support human follow-up rather than make automatic high-stakes decisions.",
    ],
    [
      "How can schools manage school fees digitally?",
      "Schools can organise fee structures, individual invoices, payment records, receipts and balances. Provider configuration and payment collection should remain explicit, reviewable actions.",
    ],
    [
      "How can schools manage results and report cards?",
      "A results workflow can capture assessments, compute configured grades, route them for approval, publish approved views and generate report cards. Teachers and school leaders remain responsible for review and publication.",
    ],
    [
      "How can AI help Nigerian schools?",
      "Supervised AI can help structure setup plans, draft course materials, explain operational options, assist with learning design and support practice. It should not autonomously grade, enrol, charge, message, publish or issue credentials.",
    ],
    [
      "How can parents access school information digitally?",
      "A secure parent or guardian portal can show only the linked family’s permitted attendance, results, fees, announcements and onboarding guidance after authenticated access is established.",
    ],
    [
      "How does NSOS protect school data?",
      "NSOS uses tenant-scoped records, authenticated procedures, role and membership checks, protected uploads, audit-friendly actions and review gates. Public pages are intended to contain school-approved public content, not learner or family records.",
    ],
  ].map(([question, answer]) => ({ question, answer })),
  related: [
    "/about",
    "/school-management-system-nigeria",
    "/ai-for-schools",
    "/contact",
  ],
};

pages["/contact"] = {
  path: "/contact",
  navLabel: "Contact",
  title: "Contact NSOS — Nigerian School Operating System",
  description:
    "Find the right next step for learning about NSOS, school operations, public school websites and secure platform access.",
  eyebrow: "Contact and next steps",
  hero: "Start with the right NSOS path for your institution.",
  intro:
    "NSOS keeps public product information separate from private school records. Use the official platform entry to begin a school workspace or use a school’s own published NSOS website for school-specific admissions and contact details.",
  sections: [
    {
      title: "For a school or learning organisation",
      body: "Open the NSOS platform to review the available sign-in and institution setup path. The authenticated workspace is separate from this public information site.",
      bullets: [
        "Review the platform entry",
        "Create or access an institution workspace",
        "Configure only approved school information",
        "Use protected support and communication workflows",
      ],
    },
    {
      title: "For a family",
      body: "Use the school’s official published NSOS website or admissions link. School-specific contact details are controlled by that school and are not invented or shared from another tenant.",
      bullets: [
        "Follow the school’s official link",
        "Use the school’s admissions route",
        "Do not submit credentials by email",
        "Contact the school office for school-specific questions",
      ],
    },
  ],
  related: ["/for-schools", "/parent-portal", "/faq"],
};

export const PUBLIC_MARKETING_PATHS = Object.keys(pages);

function pageForPath(pathname: string) {
  return pages[pathname.replace(/\/+$/, "") || "/"];
}
function iconFor(title: string) {
  if (title.includes("AI")) return BrainCircuit;
  if (title.includes("fee")) return CircleDollarSign;
  if (title.includes("student")) return UsersRound;
  if (title.includes("academic") || title.includes("results"))
    return BookOpenCheck;
  if (title.includes("communication") || title.includes("parent"))
    return MessageSquareText;
  if (title.includes("administration") || title.includes("software"))
    return LayoutDashboard;
  return ShieldCheck;
}

function PublicHeader({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="border-b border-[#dfe9e1] bg-white/95 backdrop-blur dark:border-[#34463e] dark:bg-[#18231f]/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <a href="/" className="min-w-0">
          <NSOSLogo className="h-10 max-w-[190px]" />
        </a>
        <nav
          className="hidden items-center gap-5 text-xs font-semibold text-[#52675d] lg:flex"
          aria-label="Public NSOS navigation"
        >
          <a href="/school-management-software">Platform</a>
          <a href="/for-schools">For schools</a>
          <a href="/ai-for-schools">AI for schools</a>
          <a href="/faq">FAQ</a>
          <a href="/contact">Contact</a>
          <a
            href={appUrl}
            className="rounded-xl bg-[#0f5c4f] px-4 py-2.5 text-white"
          >
            Open NSOS
          </a>
        </nav>
        <button
          type="button"
          onClick={onMenu}
          className="rounded-lg p-2 text-[#0f5c4f] lg:hidden"
          aria-label="Open public navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

export default function PublicMarketingPage() {
  const pathname =
    typeof window === "undefined" ? "/" : window.location.pathname;
  const page = pageForPath(pathname) ?? pages["/"];
  const [menuOpen, setMenuOpen] = useState(false);
  const Icon = iconFor(page.title);
  const canonicalUrl = absolutePublicUrl(page.path);
  const jsonLd = useMemo(() => {
    const breadcrumb = breadcrumbJsonLd([
      { name: "NSOS", path: "/" },
      ...(page.path === "/" ? [] : [{ name: page.navLabel, path: page.path }]),
    ]);
    const extras: unknown[] = [breadcrumb];
    if (page.serviceName)
      extras.push(serviceJsonLd(page.serviceName, page.description));
    if (page.faqs) extras.push(faqJsonLd(page.faqs));
    return [
      ...nsosEntityJsonLd(),
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: page.title,
        description: page.description,
        url: canonicalUrl,
        isPartOf: {
          "@type": "WebSite",
          name: "NSOS — Nigerian School Operating System",
          url: NSOS_PUBLIC_ORIGIN,
        },
      },
      ...extras,
    ];
  }, [canonicalUrl, page]);
  usePublicMetadata({
    title: page.title,
    description: page.description,
    canonicalUrl,
    jsonLd,
  });

  return (
    <main className="min-h-screen bg-[#f7faf7] text-[#13251f]">
      <PublicHeader onMenu={() => setMenuOpen(value => !value)} />
      {menuOpen && (
        <div className="border-b border-[#dfe9e1] bg-white px-5 py-4 dark:border-[#34463e] dark:bg-[#18231f] lg:hidden">
          <div className="mx-auto grid max-w-7xl gap-2 text-sm font-semibold text-[#38564a]">
            <div className="flex items-center justify-between pb-2 text-xs uppercase tracking-[.14em] text-[#718078]">
              Navigate{" "}
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close public navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {[
              "/school-management-software",
              "/for-schools",
              "/ai-for-schools",
              "/faq",
              "/contact",
            ].map(path => (
              <a
                key={path}
                href={path}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-2 py-2 hover:bg-[#eef6ef]"
              >
                {pages[path].navLabel}
              </a>
            ))}
            <a
              href={appUrl}
              className="mt-2 rounded-xl bg-[#0f5c4f] px-4 py-3 text-center text-white"
            >
              Open NSOS
            </a>
          </div>
        </div>
      )}
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-24">
        <div>
          <p className="mono text-[10px] font-semibold uppercase tracking-[.18em] text-[#0f5c4f]">
            {page.eyebrow}
          </p>
          <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[.98] tracking-[-.055em] sm:text-7xl">
            {page.hero}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[#617069]">
            {page.intro}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={appUrl}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0f5c4f] px-5 py-3 text-sm font-bold text-white"
            >
              Open NSOS <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#content"
              className="rounded-xl border border-[#d8e2da] bg-white px-5 py-3 text-sm font-bold text-[#28483d]"
            >
              Read the details
            </a>
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-[#dce7df] bg-[#102a24] p-6 text-white shadow-[0_24px_60px_rgba(16,42,36,.12)] sm:p-8">
          <p className="mono text-[10px] uppercase tracking-[.16em] text-[#a8d3bd]">
            NSOS in practice
          </p>
          <div className="mt-6 grid gap-3">
            {[
              { label: "Connected records", icon: GraduationCap },
              { label: "Role-aware access", icon: ShieldCheck },
              { label: "Review-first workflows", icon: CheckCircle2 },
              { label: "Family communication", icon: UsersRound },
            ].map(({ label, icon: ItemIcon }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.05] px-4 py-3 text-sm"
              >
                <ItemIcon className="h-4 w-4 text-[#9fd1b5]" />
                {label}
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs leading-5 text-[#b7cbc0]">
            A public product explanation only. School records, learner data and
            private workspace activity remain behind authenticated tenant
            controls.
          </p>
        </div>
      </section>
      <section id="content" className="border-y border-[#e1e8e2] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
          <div className="grid gap-5 lg:grid-cols-2">
            {page.sections.map(section => (
              <article
                key={section.title}
                className="rounded-2xl border border-[#e2e9e3] bg-[#fbfcfb] p-6 sm:p-8"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8f2eb] text-[#0f5c4f]">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="mt-5 text-2xl font-semibold tracking-[-.035em] text-[#1b352a]">
                  {section.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#65736b]">
                  {section.body}
                </p>
                {section.bullets && (
                  <ul className="mt-5 grid gap-2 text-sm text-[#40594d]">
                    {section.bullets.map(bullet => (
                      <li key={bullet} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2f7b5e]" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
          {page.faqs && (
            <div className="mt-10 grid gap-3">
              {page.faqs.map(faq => (
                <details
                  key={faq.question}
                  className="group rounded-2xl border border-[#e2e9e3] bg-[#fbfcfb] p-5"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-[#29483d]">
                    <span>{faq.question}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-4 max-w-4xl text-sm leading-7 text-[#65736b]">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          )}
        </div>
      </section>
      {page.related && (
        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
          <p className="mono text-[10px] font-semibold uppercase tracking-[.16em] text-[#0f5c4f]">
            Continue exploring
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {page.related.map(path => (
              <a
                key={path}
                href={path}
                className="group rounded-2xl border border-[#dfe9e1] bg-white p-5 hover:border-[#9cc6ad]"
              >
                <span className="text-sm font-bold text-[#29483d]">
                  {pages[path]?.navLabel ?? path}
                </span>
                <ArrowRight className="mt-4 h-4 w-4 text-[#0f5c4f] transition-transform group-hover:translate-x-1" />
              </a>
            ))}
          </div>
        </section>
      )}
      <footer className="border-t border-[#e2e9e3] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-xs text-[#718079] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-3">
            <NSOSLogo className="h-9 max-w-[170px]" />
            <span>· Nigeria-first school and learning operations</span>
          </div>
          <div className="flex gap-4">
            <a href="/about" className="font-semibold text-[#0f5c4f]">
              About
            </a>
            <a href="/faq" className="font-semibold text-[#0f5c4f]">
              FAQ
            </a>
            <a href="/contact" className="font-semibold text-[#0f5c4f]">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
