import { ArrowRight, BookOpenCheck, BrainCircuit, Building2, ShieldCheck, UsersRound } from "lucide-react";

const features = [
  { icon: Building2, title: "School operations", text: "Manage admissions, student records, staff, academics, attendance, results and school administration in one system." },
  { icon: BookOpenCheck, title: "Learning operations", text: "Organise curriculum, programmes, courses and learning workflows for Nigerian schools and other learning organisations." },
  { icon: BrainCircuit, title: "Supervised AI", text: "Use review-first AI tools for school setup, knowledge-to-business workflows, school operations and learning support." },
  { icon: ShieldCheck, title: "Controlled by people", text: "Tenant isolation, role permissions, auditability and approval-first workflows keep important school decisions under human control." },
];

export default function PublicLanding() {
  return (
    <main className="min-h-screen bg-[#f7faf7] text-[#13251f]">
      <header className="border-b border-[#e2e9e3] bg-white/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="/" className="text-sm font-bold tracking-tight">NSOS <span className="font-normal text-[#6c7a73]">· Nigerian School Operating System</span></a>
          <a href="https://nsos-system-uhkdscaf.manus.space" className="rounded-xl bg-[#0f5c4f] px-4 py-2.5 text-sm font-semibold text-white">Open NSOS</a>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:py-28">
        <div>
          <p className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0f5c4f]">Nigeria-first school technology</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[.98] tracking-[-.055em] sm:text-7xl">The operating system for running a modern school.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#617069]">NSOS (Nigerian School Operating System) brings school administration, learning operations, family communication and supervised AI tools into one secure, multi-tenant platform.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="https://nsos-system-uhkdscaf.manus.space" className="inline-flex items-center gap-2 rounded-xl bg-[#0f5c4f] px-5 py-3 text-sm font-bold text-white">Explore NSOS <ArrowRight className="h-4 w-4" /></a>
            <a href="#features" className="rounded-xl border border-[#d8e2da] bg-white px-5 py-3 text-sm font-bold text-[#28483d]">See capabilities</a>
          </div>
          <p className="mt-5 text-xs text-[#7a8780]">Built for Nigerian schools first, with support for broader learning-organisation workflows.</p>
        </div>

        <div className="rounded-[1.5rem] border border-[#dce7df] bg-[#102a24] p-7 text-white shadow-[0_24px_60px_rgba(16,42,36,.12)]">
          <p className="mono text-[10px] uppercase tracking-[.16em] text-[#a8d3bd]">One platform</p>
          <div className="mt-6 grid gap-3">
            {["Admissions", "Students & guardians", "Academics & curriculum", "Attendance & results", "Fees & finance", "Staff operations", "AI study tutors", "School website & communication"].map(item => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.05] px-4 py-3 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#9fd1b5]" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-[#e1e8e2] bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <div className="max-w-2xl">
            <p className="mono text-[10px] uppercase tracking-[.16em] text-[#0f5c4f]">What NSOS does</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">School operations without disconnected tools.</h2>
            <p className="mt-3 text-sm leading-6 text-[#6b7871]">NSOS is a multi-tenant school and learning-operations platform. Each institution gets its own controlled workspace and operational records.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-2xl border border-[#e2e9e3] bg-[#fbfcfb] p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8f2eb] text-[#0f5c4f]"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-5 text-sm font-bold">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-[#6e7a74]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="grid gap-8 rounded-[1.5rem] bg-[#e3f0e7] p-8 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="mono text-[10px] uppercase tracking-[.16em] text-[#417161]">For school owners and teams</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.04em]">A single operating layer for the institution.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#526a5f]">NSOS is designed around the realities of Nigerian school operations: school administration, fees, attendance, results, parent communication, curriculum and controlled digital workflows.</p>
          </div>
          <UsersRound className="hidden h-20 w-20 text-[#4f866f] lg:block" />
        </div>
      </section>

      <footer className="border-t border-[#e2e9e3] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-xs text-[#718079] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p><strong className="text-[#29483d]">NSOS — Nigerian School Operating System</strong> · Nigeria</p>
          <a className="font-semibold text-[#0f5c4f]" href="https://nsos-system-uhkdscaf.manus.space">Open platform</a>
        </div>
      </footer>
    </main>
  );
}
