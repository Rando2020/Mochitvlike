import Link from "next/link";
import { CRAYVO } from "@/lib/brand/crayvo";

export function CrayvoBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="crayvo-brand" aria-label="Crayvo home">
      <svg className="crayvo-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="crayvo-gradient" x1="4" y1="5" x2="43" y2="43" gradientUnits="userSpaceOnUse">
            <stop stopColor="#BAA5FF" />
            <stop offset="1" stopColor="#74E6CD" />
          </linearGradient>
        </defs>
        <path d="M37 11A19 19 0 1 0 37 37" stroke="url(#crayvo-gradient)" strokeWidth="7" strokeLinecap="round" />
        <path d="m20 15 15 9-15 9V15Z" fill="#F8F7FF" />
        <path d="M38 5v6M35 8h6" stroke="#74E6CD" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {!compact && <span className="crayvo-wordmark">{CRAYVO.name}<span className="crayvo-wordmark-dot">.</span></span>}
    </Link>
  );
}
