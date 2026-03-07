import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    // ===== ローカル =====
    "http://localhost",
    "http://localhost:3000",
    "http://127.0.0.1",
    "http://127.0.0.1:3000",

    // ===== PCホスト名（重要）=====
    "http://LAPTOP-3IBE4G98",
    "http://LAPTOP-3IBE4G98:3000",

    // ===== LAN IP =====
    "http://192.168.1.11",
    "http://192.168.1.11:3000",
  ],
};

export default nextConfig;
