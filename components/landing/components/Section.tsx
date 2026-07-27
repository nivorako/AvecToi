import React from "react";

export function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="py-24">
      {children}
    </section>
  );
}
