import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  reference: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, reference: null };
  }

  static getDerivedStateFromError(): State {
    return {
      hasError: true,
      reference: `NSOS-${Date.now().toString(36).toUpperCase()}`,
    };
  }

  resetBoundary = () => {
    this.setState({ hasError: false, reference: null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#f4f7f5] p-5 text-[#14372f] dark:bg-[#0d211c] dark:text-[#edf6f0]">
          <section
            aria-labelledby="nsos-recovery-title"
            className="w-full max-w-lg rounded-[1.75rem] border border-[#cdded5] bg-white p-7 shadow-[0_24px_70px_rgba(20,55,47,0.12)] dark:border-[#31564a] dark:bg-[#133329] sm:p-10"
          >
            <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-[#f4e6d7] text-[#a24f12] dark:bg-[#4a2814] dark:text-[#ffd2aa]">
              <AlertTriangle aria-hidden="true" size={24} />
            </div>

            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#5e746b] dark:text-[#a7c5b9]">
              NSOS recovery
            </p>
            <h1 id="nsos-recovery-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Something interrupted this page.
            </h1>
            <p className="mt-4 text-sm leading-6 text-[#52675f] dark:text-[#bed2c8]">
              Your session and school records have not been changed by this screen. You can try the page again, or return to the NSOS home page.
            </p>

            {this.state.reference ? (
              <p className="mt-5 rounded-xl bg-[#edf4f0] px-4 py-3 text-xs font-medium text-[#35584a] dark:bg-[#1b4538] dark:text-[#d0e6da]">
                Recovery reference: <span className="font-mono">{this.state.reference}</span>
              </p>
            ) : null}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={this.resetBoundary}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#106c5a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0c594a] focus:outline-none focus:ring-2 focus:ring-[#106c5a] focus:ring-offset-2 dark:focus:ring-offset-[#133329]"
              >
                <RotateCcw aria-hidden="true" size={16} />
                Try again
              </button>
              <button
                onClick={() => { window.location.href = "/"; }}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#b7cabe] px-4 py-2.5 text-sm font-semibold text-[#173d32] transition hover:bg-[#edf4f0] focus:outline-none focus:ring-2 focus:ring-[#106c5a] focus:ring-offset-2 dark:border-[#5c7f70] dark:text-[#eff8f2] dark:hover:bg-[#1b4538] dark:focus:ring-offset-[#133329]"
              >
                <Home aria-hidden="true" size={16} />
                NSOS home
              </button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
