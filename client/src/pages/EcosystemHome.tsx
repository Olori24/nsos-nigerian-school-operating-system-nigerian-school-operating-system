import { ArrowRight, ArrowUpRight, BookOpen, Building2, HeartPulse, Layers3, Radar, Sparkles, Workflow } from "lucide-react";

const products = [
  {
    name: "NSOS School",
    category: "Education",
    description: "A connected operating system for schools and learning institutions, bringing administration, academics, finance, communication and AI-supported learning into one workspace.",
    href: "/app",
    action: "Enter school workspace",
    icon: BookOpen,
    featured: true,
    status: "Available",
  },
  {
    name: "OAE Core",
    category: "AI infrastructure",
    description: "The OAE core project: a foundation for building and coordinating intelligent, purpose-built AI capabilities.",
    href: "https://oae-core.vercel.app",
    action: "Open OAE Core preview",
    icon: Layers3,
    status: "Private preview · access restricted",
  },
  {
    name: "O Clinic · ClinicOS",
    category: "Healthcare",
    description: "An AI-powered clinic operating system for administration and daily operations. The deployed preview is available while external production dependencies remain under verification.",
    href: "https://clinicos-red.vercel.app",
    action: "Open ClinicOS preview",
    icon: HeartPulse,
    status: "Private preview · access restricted",
  },
  {
    name: "SAMURA AI",
    category: "AI assistant",
    description: "A conversational AI workspace being developed as a capable, standalone assistant experience.",
    href: "https://samura-ai.vercel.app",
    action: "Open SAMURA AI",
    icon: Sparkles,
    status: "Live preview",
  },
  {
    name: "Opportunity Radar Africa",
    category: "Opportunities",
    description: "A platform focused on helping people discover relevant opportunities across Africa.",
    href: "https://opportunity-radar-africa.vercel.app",
    action: "Open Opportunity Radar preview",
    icon: Radar,
    status: "Public demo · no account required",
  },
  {
    name: "Business Operating System",
    category: "Business operations",
    description: "A connected operating-system concept for organising business work, processes and execution.",
    href: "https://business-operating-system-pied.vercel.app",
    action: "Open business system",
    icon: Building2,
    status: "Deployed · preview",
  },
  {
    name: "Olori AI Workforce",
    category: "AI workforce",
    description: "An AI-enabled workforce concept for business research, prospecting, outreach preparation, marketing and operational support.",
    href: null,
    action: null,
    icon: Workflow,
    status: "In development",
  },
];

function ProductCard({ product }: { product: (typeof products)[number] }) {
  const Icon = product.icon;
  return (
    <article className={`group flex h-full flex-col rounded-2xl border p-6 transition duration-200 hover:-translate-y-1 hover:shadow-xl ${product.featured ? "border-[#75a995] bg-[#f0f7f2] shadow-[0_18px_50px_rgba(16,57,43,0.08)]" : "border-white/10 bg-white/[0.045] hover:border-[#77b99b]/50 hover:bg-white/[0.075]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className={`grid h-12 w-12 place-items-center rounded-xl ${product.featured ? "bg-[#145b46] text-white" : "bg-[#b8e2cb]/10 text-[#9bd5b4]"}`}>
          <Icon size={23} strokeWidth={1.8} />
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide ${product.featured ? "bg-[#d9eadf] text-[#19563f]" : "bg-white/10 text-[#c1d8ca]"}`}>
          {product.status}
        </span>
      </div>
      <p className={`mt-6 text-[11px] font-bold uppercase tracking-[0.18em] ${product.featured ? "text-[#47745d]" : "text-[#9bc9ae]"}`}>{product.category}</p>
      <h3 className={`mt-2 text-xl font-semibold tracking-tight ${product.featured ? "text-[#142c22]" : "text-white"}`}>{product.name}</h3>
      <p className={`mt-3 flex-1 text-sm leading-7 ${product.featured ? "text-[#52675b]" : "text-[#b7c8bf]"}`}>{product.description}</p>
      {product.href ? (
        <a href={product.href} target={product.href.startsWith("http") ? "_blank" : undefined} rel={product.href.startsWith("http") ? "noreferrer" : undefined} className={`mt-6 inline-flex w-fit items-center gap-2 text-sm font-semibold transition group-hover:gap-3 ${product.featured ? "text-[#145b46]" : "text-[#a8dfbc]"}`}>
          {product.action}<ArrowUpRight size={16} />
        </a>
      ) : (
        <span className="mt-6 inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#82978a]">Launch link coming soon</span>
      )}
    </article>
  );
}

export default function EcosystemHome() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0b1713] text-white">
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <a href="/" aria-label="NSOS home" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#b7e2c8] text-[#103d2d]"><span className="text-lg font-black tracking-tighter">N</span></div>
          <div><span className="block text-lg font-bold tracking-[0.12em]">NSOS</span><span className="block text-[9px] font-semibold uppercase tracking-[0.22em] text-[#8da99a]">A connected product ecosystem</span></div>
        </a>
        <nav className="hidden items-center gap-8 text-sm text-[#c1d0c7] md:flex" aria-label="Main navigation">
          <a className="transition hover:text-white" href="#ecosystem">Our products</a>
          <a className="transition hover:text-white" href="#about">About</a>
          <a className="transition hover:text-white" href="#contact">Contact</a>
        </nav>
        <a href="/app" className="inline-flex items-center gap-2 rounded-full bg-[#b7e2c8] px-4 py-2.5 text-xs font-bold text-[#103d2d] transition hover:bg-white sm:px-5 sm:text-sm">Open NSOS <ArrowUpRight size={15} /></a>
      </header>

      <section className="relative mx-auto grid min-h-[570px] w-full max-w-7xl items-center gap-12 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:pb-28 lg:pt-20">
        <div className="pointer-events-none absolute -right-48 -top-40 h-[560px] w-[560px] rounded-full border border-[#6ba889]/10" />
        <div className="pointer-events-none absolute -right-24 -top-16 h-[400px] w-[400px] rounded-full border border-[#6ba889]/10" />
        <div className="relative">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#6ca98a]/25 bg-[#17382b]/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a8d7b9]"><span className="h-2 w-2 rounded-full bg-[#8bd6a8]" /> One ecosystem. Multiple solutions.</div>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.055em] sm:text-6xl lg:text-[76px]">Technology built to <span className="text-[#9bd6b2]">move people</span> and businesses forward.</h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-[#b6c8bd] sm:text-lg">NSOS brings our growing family of digital products together in one place. From education and healthcare to AI and business operations, explore practical technology designed to solve real problems.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#ecosystem" className="inline-flex items-center gap-3 rounded-full bg-[#b7e2c8] px-6 py-3.5 text-sm font-bold text-[#103d2d] transition hover:bg-white">Explore the ecosystem <ArrowRight size={17} /></a>
            <a href="/app" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-[#9bd6b2] hover:bg-white/5">Go to school app <ArrowUpRight size={16} /></a>
          </div>
          <p className="mt-8 text-xs tracking-wide text-[#81988a]">A shared front door for independent products and experiences.</p>
        </div>
        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-8 rounded-[2.5rem] bg-[#1a6048]/20 blur-3xl" />
          <div className="relative rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#18392c] to-[#10221b] p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-5"><span className="text-xs font-bold uppercase tracking-[0.18em] text-[#a8d7b9]">The NSOS ecosystem</span><Layers3 className="text-[#9bd6b2]" size={20} /></div>
            <div className="py-8 text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-[#9bd6b2]/30 bg-[#9bd6b2]/10 text-3xl font-black text-[#b7e2c8]">N</div><p className="mt-4 text-2xl font-semibold">One connected home</p><p className="mt-2 text-sm text-[#a9beb1]">Different products. Clear destinations.</p></div>
            <div className="grid grid-cols-2 gap-3">
              {["Education", "Healthcare", "Artificial intelligence", "Business"].map((label) => <div key={label} className="rounded-xl border border-white/10 bg-black/10 px-3 py-4 text-center text-xs font-semibold text-[#d1e2d7]">{label}</div>)}
            </div>
            <div className="mt-5 flex items-center justify-between rounded-xl bg-[#b7e2c8] px-4 py-3 text-[#103d2d]"><span className="text-xs font-bold">Explore our products</span><ArrowRight size={17} /></div>
          </div>
        </div>
      </section>

      <section id="ecosystem" className="scroll-mt-8 border-y border-white/10 bg-[#10221b] px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9bd6b2]">The product family</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">One starting point. A growing ecosystem.</h2><p className="mt-4 text-sm leading-7 text-[#afc2b6] sm:text-base">Choose a product to explore. Each solution has its own purpose and application; this page brings them together without mixing their accounts, data or operations.</p></div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{products.map((product) => <ProductCard key={product.name} product={product} />)}</div>
        </div>
      </section>

      <section id="about" className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:px-10 lg:py-24">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9bd6b2]">Why one ecosystem?</p><h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Different challenges deserve focused products.</h2></div>
        <div className="space-y-5 text-sm leading-8 text-[#b6c8bd] sm:text-base"><p>We build software around real operational needs. Schools need better ways to manage learning and administration. Clinics need dependable operational systems. Businesses need clearer processes. People need useful AI tools.</p><p>NSOS is the shared front door to this work: one place to understand what we are building and find the right product.</p></div>
      </section>

      <section id="contact" className="mx-5 mb-16 rounded-3xl border border-[#6ca98a]/20 bg-gradient-to-br from-[#173c2c] to-[#10251c] px-6 py-12 text-center sm:mx-8 sm:px-10 lg:mx-auto lg:max-w-7xl lg:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a8d7b9]">Start here</p><h2 className="mx-auto mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Find the product built for what you need to do.</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#bdd0c3]">Explore the ecosystem or contact the NSOS team directly.</p><a href="mailto:hello@nsos.top" className="mt-7 inline-flex items-center gap-2 rounded-full border border-[#b7e2c8]/40 px-6 py-3.5 text-sm font-bold text-[#b7e2c8] transition hover:bg-white/10">Contact hello@nsos.top</a><a href="/app" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#b7e2c8] px-6 py-3.5 text-sm font-bold text-[#103d2d] transition hover:bg-white">Enter NSOS <ArrowUpRight size={16} /></a>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 text-center text-xs text-[#81988a] sm:px-8"><p>© {new Date().getFullYear()} NSOS. A connected ecosystem of digital products.</p><p className="mt-2">Each product is independently developed and operated. Availability varies by product.</p></footer>
    </main>
  );
}
