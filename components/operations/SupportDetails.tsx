"use client";
import { useState } from "react";
import type { ConnectionCheck } from "@/lib/operations/status";
export function SupportDetails({ checks, checkedAt }: { checks: ConnectionCheck[]; checkedAt: string }) {
  const [message, setMessage] = useState("");
  const details = JSON.stringify({ checkedAt, checks }, null, 2);
  async function copy() {
    try { await navigator.clipboard.writeText(details); setMessage("Support details copied."); }
    catch { setMessage("Copy is unavailable. Select the details below to copy manually."); }
  }
  return <section><button className="ops-button" onClick={copy}>Copy Support Details</button><p role="status">{message}</p>
    <details><summary>View safe support details</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{details}</pre></details></section>;
}
