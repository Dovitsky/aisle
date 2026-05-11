"use client";

// Top-level error boundary. If anything inside the app throws during
// render, we show a calm recovery surface instead of a blank screen.

import React from "react";
import Link from "next/link";

interface Props { children: React.ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("UI crashed:", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <p className="text-[10.5px] uppercase tracking-[0.28em] text-sage-500 font-mono mb-3">
            Something went sideways
          </p>
          <h1 className="display text-[36px] sm:text-[44px] leading-[1.1] text-ink mb-4">
            Take a breath.
          </h1>
          <p className="text-[14px] text-ink-300 leading-relaxed">
            A small wrinkle on our end. Your work is safe. every approval and
            every change is on the ledger. Reload the page or jump home.
          </p>
          <p className="text-[11.5px] text-ink-300/80 mt-4 font-mono">
            {this.state.error.message.slice(0, 200)}
          </p>
          <div className="flex justify-center gap-3 mt-7">
            <button
              onClick={this.reset}
              className="rounded-2xl cta-sage px-5 py-2.5 text-[13px] font-semibold transition-colors"
            >
              Try again
            </button>
            <Link
              href="/"
              onClick={this.reset}
              className="rounded-2xl border hairline bg-white/70 hover:bg-white text-ink-400 hover:text-ink px-5 py-2.5 text-[13px] font-medium transition-all"
            >
              Take me home
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
