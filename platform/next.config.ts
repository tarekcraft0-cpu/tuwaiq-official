import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // يثبت جذر Turbopack داخل مجلد المنصة ويتجنب قفل الملفات الأب
  turbopack: {
    root: path.join(__dirname),
  },
  // يسمح بفتح الموقع من الجوال على نفس الشبكة أثناء التطوير
  allowedDevOrigins: [
    "192.168.100.51",
    "localhost",
    "127.0.0.1",
  ],
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
