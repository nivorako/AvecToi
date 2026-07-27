import { ReactNode } from "react";
 
export function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4">
        <h3 className="!font-semibold text-foreground">{title}</h3>
        <div className="flex flex-col gap-3">
            {children}
        </div>
    </div>
  );
}