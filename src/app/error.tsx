"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page-error">
      <p className="eyebrow">AETHER / SIGNAL INTERRUPTED</p>
      <h1>A moment of darkness.</h1>
      <p>The explorer could not load. Please try again.</p>
      <button className="primary-button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
