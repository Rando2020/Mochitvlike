import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

/** Two raster fallbacks meet Chromium PWA install requirements. No user data or external calls. */
export function GET(request: NextRequest) {
  const pixels = request.nextUrl.searchParams.get("size") === "192" ? 192 : 512;
  const fontSize = Math.round(pixels * 0.62);
  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", display: "flex", alignItems: "center",
      justifyContent: "center", borderRadius: Math.round(pixels * 0.2),
      background: "#11101d", fontFamily: "Arial, sans-serif"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#baa5ff", fontSize, fontWeight: 900, lineHeight: 1 }}>C</span>
        <span style={{ color: "#74e6cd", fontSize: Math.round(pixels * 0.15), marginLeft: -Math.round(pixels * 0.08), marginBottom: Math.round(pixels * 0.32) }}>✦</span>
      </div>
    </div>,
    { width: pixels, height: pixels, headers: { "Cache-Control": "public, max-age=86400, immutable" } }
  );
}
