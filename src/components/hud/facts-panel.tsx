"use client";
import { useEffect, useRef } from "react";
import type { CelestialBody } from "@/data/bodies";
import { Icon } from "@/components/ui/icon";
export function FactsPanel({
  body,
  onClose,
}: {
  body: CelestialBody;
  onClose: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <aside
      id="object-facts"
      className="facts-panel"
      tabIndex={-1}
      ref={ref}
      role="region"
      aria-label={`About ${body.name}`}
    >
      <div className="panel-heading">
        <span className="eyebrow">OBJECT RECORD</span>
        <button
          className="icon-button"
          aria-label="Close information panel"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <h2>{body.name}</h2>
      <p className="panel-type">{body.type}</p>
      <p className="panel-description">{body.description}</p>
      <dl className="fact-list">
        {body.facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>
              {fact.value}
              <a
                href={
                  body.sources.find((source) => source.id === fact.source)?.url
                }
                target="_blank"
                rel="noreferrer"
                aria-label={`Source for ${fact.label} (opens in new tab)`}
              >
                <Icon name="external" size={12} />
              </a>
            </dd>
          </div>
        ))}
      </dl>
      <p className="eyebrow">REFERENCES</p>
      <div className="source-links">
        {body.sources.map((source) => (
          <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
            {source.title}
            <Icon name="external" size={13} />
          </a>
        ))}
      </div>
      <p className="scale-note">
        {body.id === "moon"
          ? "Aristarchus surface mode uses measured SLDEM2015 elevations over a bounded 60 km region. Source detail is approximately 60–100 m; no metre-scale terrain accuracy is implied."
          : "Illustrative sizes and distances. Fixed moon positions. These are reference facts, not live telemetry."}
      </p>
    </aside>
  );
}
