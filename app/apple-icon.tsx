import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export default function AppleIcon() {
  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", background: "#11101d",
      display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: 35, color: "#baa5ff", fontSize: 116, fontWeight: 900,
      fontFamily: "Arial, sans-serif"
    }}>
      C<span style={{ fontSize: 28, color: "#74e6cd", marginLeft: -8, marginBottom: 72 }}>✦</span>
    </div>, size
  );
}
