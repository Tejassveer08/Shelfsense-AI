import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The optional local embedding runtime ships native binaries; keep it out of the bundle
  // and out of Vercel functions (on Vercel, query embeddings come from Hugging Face instead).
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "sharp"],
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@huggingface/transformers/**",
      "node_modules/onnxruntime-node/**",
      "node_modules/onnxruntime-web/**",
      "node_modules/sharp/**",
      "node_modules/@img/**",
    ],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.gr-assets.com" },
      { protocol: "https", hostname: "i.gr-assets.com" },
      { protocol: "https", hostname: "s.gr-assets.com" },
      { protocol: "https", hostname: "**.amazon.com" },
      { protocol: "https", hostname: "**.media-amazon.com" },
    ],
  },
};

export default nextConfig;
