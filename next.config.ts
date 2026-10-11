import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Foto barang dan bukti transfer dikirim lewat server action.
    // Batas Vercel 4,5 MB per request, jadi foto dikompres dulu di browser.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
