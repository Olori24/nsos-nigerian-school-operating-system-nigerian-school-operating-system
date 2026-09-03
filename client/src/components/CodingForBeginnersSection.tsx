import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Laptop,
  ShieldCheck,
} from "lucide-react";

type CodingForBeginnersSectionProps = {
  brand: string;
  highlighted?: string;
};

const weeks = [
  {
    label: "01",
    title: "Digital foundations",
    detail: "Workspaces, safe online participation, and confident setup.",
    progression:
      "Set up a simple workspace, practise file organisation, and explain how to participate safely online.",
  },
  {
    label: "02–03",
    title: "Build for the web",
    detail: "HTML structure, meaningful content, media, and accessible forms.",
    progression:
      "Turn a short idea into a structured page with headings, links, images, and a form that people can use.",
  },
  {
    label: "04–05",
    title: "Design for every screen",
    detail:
      "Readable CSS, visual hierarchy, flexible layout, and responsive thinking.",
    progression:
      "Style the page for clarity, then check how its spacing, contrast, and layout behave on smaller screens.",
  },
  {
    label: "06–08",
    title: "Make, test, improve",
    detail:
      "JavaScript foundations, a guided mini-project, and a final review.",
    progression:
      "Add one useful interaction, test it with sample content, and present what you would improve next.",
  },
];

export function CodingForBeginnersSection({
  brand,
  highlighted = "",
}: CodingForBeginnersSectionProps) {
  return (
    <section
      className={`border-b border-[#dbe6df] bg-[#123b31] px-5 py-14 text-white sm:px-8 sm:py-18 ${highlighted}`}
      data-preview-section="learning"
      aria-labelledby="coding-for-beginners-title"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#b8dfc3]">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.07] px-3 py-1.5">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Practical learning spotlight
              </span>
              <span className="text-white/45">Eight weeks</span>
            </div>
            <h2
              id="coding-for-beginners-title"
              className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-.055em] text-white sm:text-5xl"
            >
              Start with the confidence to build.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/70">
              Coding for Beginners is an eight-week introduction to the web for
              learners who want to understand how ideas become useful digital
              projects. Each week moves from a clear foundation to practical
              work that can be reviewed and improved.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 text-sm font-semibold">
              <span className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-[#123b31]">
                <CalendarDays
                  className="h-4 w-4"
                  style={{ color: brand }}
                  aria-hidden="true"
                />
                4 Sep – 29 Oct 2026
              </span>
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[.07] px-4 py-3 text-white/85">
                <Laptop className="h-4 w-4 text-[#b8dfc3]" aria-hidden="true" />
                Online learning preparation
              </span>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-white/12 bg-white/[.07] p-5 shadow-[0_20px_50px_rgba(6,25,18,.18)] sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/45">
              Class rhythm
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <ScheduleDay day="Monday" time="4–6pm" />
              <ScheduleDay day="Wednesday" time="4–6pm" />
              <ScheduleDay day="Saturday" time="11am–1pm" />
            </div>
            <p className="mt-4 inline-flex items-center gap-2 text-xs text-white/55">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              West Africa Time (WAT)
            </p>
          </div>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {weeks.map(week => (
            <article
              key={week.label}
              tabIndex={0}
              className="group rounded-2xl border border-white/10 bg-white/[.06] p-4 outline-none transition-colors duration-200 hover:bg-white/[.1] focus-visible:ring-2 focus-visible:ring-[#b8dfc3] focus-visible:ring-offset-2 focus-visible:ring-offset-[#123b31]"
              aria-label={`Week ${week.label}: ${week.title}. Focus or hover to reveal the practical progression.`}
            >
              <span className="text-[10px] font-bold tracking-[.14em] text-[#b8dfc3]">
                WEEK {week.label}
              </span>
              <h3 className="mt-4 text-base font-semibold text-white">
                {week.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/60">
                {week.detail}
              </p>
              <div className="max-h-0 overflow-hidden opacity-0 transition-[max-height,opacity] duration-200 motion-reduce:transition-none group-hover:max-h-24 group-hover:opacity-100 group-focus-within:max-h-24 group-focus-within:opacity-100">
                <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-5 text-[#d8f0dc]">
                  <span className="font-bold uppercase tracking-[.1em] text-[#b8dfc3]">
                    Practical progression ·{" "}
                  </span>
                  {week.progression}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-[#9bc9aa]/25 bg-[#1c4a3d] p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="flex gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#b8dfc3] text-[#123b31]">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">
                A thoughtful start, with support built in.
              </p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/65">
                Learners practise with sample content, receive human-reviewed
                feedback, and finish with a small project they can explain and
                improve.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-start gap-2 text-xs leading-5 text-white/55 sm:max-w-[230px]">
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-[#b8dfc3]"
              aria-hidden="true"
            />
            <span>
              Course access and invitations are confirmed separately by the
              school.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ScheduleDay({ day, time }: { day: string; time: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3">
      <p className="text-xs font-semibold text-white/85">{day}</p>
      <p className="mt-1 text-sm font-bold text-[#b8dfc3]">{time}</p>
    </div>
  );
}
