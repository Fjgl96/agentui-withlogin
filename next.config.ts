import type { NextConfig } from "next";

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/chat', // Cuando el front llame a /chat
        destination: 'http://127.0.0.1:8080/chat', // Next.js lo manda al backend
      },
    ]
  },
};

export default nextConfig;