"use client";
import { useEffect, useRef } from "react";
import type { FlightInput } from "@/lib/lunar/types";
export function FlightControls({
  onInput,
}: {
  onInput: (input: FlightInput) => void;
}) {
  const held = useRef(new Map<number, FlightInput>());
  const update = () => {
    const result = { forward: 0, right: 0, up: 0 };
    for (const value of held.current.values()) {
      result.forward += value.forward;
      result.right += value.right;
      result.up += value.up;
    }
    onInput(result);
  };
  useEffect(() => {
    const release = () => {
      held.current.clear();
      onInput({ forward: 0, right: 0, up: 0 });
    };
    window.addEventListener("blur", release);
    return () => window.removeEventListener("blur", release);
  }, [onInput]);
  const buttons: [string, string, FlightInput][] = [
    ["Fly forward", "↑", { forward: 1, right: 0, up: 0 }],
    ["Fly backward", "↓", { forward: -1, right: 0, up: 0 }],
    ["Fly left", "←", { forward: 0, right: -1, up: 0 }],
    ["Fly right", "→", { forward: 0, right: 1, up: 0 }],
    ["Ascend", "＋", { forward: 0, right: 0, up: 1 }],
    ["Descend", "−", { forward: 0, right: 0, up: -1 }],
  ];
  return (
    <div
      className="flight-controls"
      role="group"
      aria-label="Surface flight controls"
    >
      {buttons.map(([name, label, value]) => (
        <button
          key={name}
          title={name}
          aria-label={name}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            held.current.set(event.pointerId, value);
            update();
          }}
          onPointerUp={(event) => {
            held.current.delete(event.pointerId);
            update();
          }}
          onPointerCancel={(event) => {
            held.current.delete(event.pointerId);
            update();
          }}
          onLostPointerCapture={(event) => {
            held.current.delete(event.pointerId);
            update();
          }}
          onBlur={() => {
            for (const key of held.current.keys())
              if (key < 0) held.current.delete(key);
            update();
          }}
          onKeyDown={(event) => {
            if (event.key === " " || event.key === "Enter") {
              event.preventDefault();
              held.current.set(
                -buttons.findIndex((b) => b[0] === name) - 1,
                value,
              );
              update();
            }
          }}
          onKeyUp={(event) => {
            if (event.key === " " || event.key === "Enter") {
              held.current.delete(-buttons.findIndex((b) => b[0] === name) - 1);
              update();
            }
          }}
        >
          {label}
          <span>{name.startsWith("Fly") ? name.slice(4) : name}</span>
        </button>
      ))}
    </div>
  );
}
