import { createHash } from "node:crypto";
import { MAX_PRODUCTION_REFERENCE_BYTES } from "./image";

// Fixed, immutable, first-party asset. Never accept a URL or revision from
// the browser: doing so would introduce SSRF and unreviewed remote imports.
export const VEYA_SERIES_ID = "70bb0b5c-1ee1-4c0a-8e41-4a62bcf9c892";
export const VEYA_CHARACTER_ID = "char_veya";
export const VEYA_SOURCE_SHA256 = "561bb24474d7aeecb2bae4ff0193f81f1f7e6218c9cb242306db65723612111b";
export const VEYA_SOURCE_REPO_COMMIT = "82cf5d2ec3211ee6af93afe8a99bc772e335d023";
const URL = `https://raw.githubusercontent.com/Rando2020/Mochitvlike/${VEYA_SOURCE_REPO_COMMIT}/Crayvo_Veya_Source_Sheet.png`;

export async function fetchPinnedVeyaSource(fetcher: typeof fetch = fetch): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetcher(URL, { cache: "no-store", signal: AbortSignal.timeout(12000) });
  } catch { throw new Error("VEYA_SOURCE_FETCH_UNAVAILABLE"); }
  if (!response.ok || (response.headers.get("content-type") ?? "").includes("text/html"))
    throw new Error("VEYA_SOURCE_FETCH_UNAVAILABLE");
  const length = Number(response.headers.get("content-length") ?? "0");
  if (length > MAX_PRODUCTION_REFERENCE_BYTES) throw new Error("VEYA_SOURCE_TOO_LARGE");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_PRODUCTION_REFERENCE_BYTES)
    throw new Error("VEYA_SOURCE_TOO_LARGE");
  const checksum = createHash("sha256").update(bytes).digest("hex");
  if (checksum !== VEYA_SOURCE_SHA256) throw new Error("VEYA_SOURCE_CHECKSUM_MISMATCH");
  return bytes;
}
