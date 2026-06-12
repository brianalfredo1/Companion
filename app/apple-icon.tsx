import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #fda4af 0%, #f43f5e 100%)",
        }}
      >
        <div style={{ fontSize: 104, display: "flex" }}>🤍</div>
      </div>
    ),
    size
  );
}
