import type { NextConfig } from "next";

// Routes that embed search queries with the bundled all-MiniLM-L6-v2 model.
const EMBEDDING_ROUTES = ["/api/search", "/api/librarian", "/api/recommend", "/api/health"];
const EMBEDDING_FILES = [
  "./models/**",
  "./node_modules/@huggingface/transformers/dist/transformers.node.mjs",
  "./node_modules/@huggingface/transformers/package.json",
  "./node_modules/onnxruntime-node/package.json",
  "./node_modules/onnxruntime-node/dist/**",
  "./node_modules/onnxruntime-node/bin/napi-v*/linux/x64/{libonnxruntime.so.1,onnxruntime_binding.node}",
  "./node_modules/onnxruntime-common/**",
  // transformers.js imports sharp at load time; make sure its Linux native library ships too
  "./node_modules/@img/sharp-linux-x64/**",
  "./node_modules/@img/sharp-libvips-linux-x64/**",
];

const nextConfig: NextConfig = {
  // Native ONNX runtime + sharp: load from node_modules at runtime instead of bundling.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "sharp"],
  outputFileTracingIncludes: Object.fromEntries(EMBEDDING_ROUTES.map((r) => [r, EMBEDDING_FILES])),
  outputFileTracingExcludes: {
    // Vercel functions run on linux/x64: drop the other platforms' runtimes (~250 MB) and GPU providers.
    "*": [
      "./node_modules/onnxruntime-node/bin/napi-v*/win32/**",
      "./node_modules/onnxruntime-node/bin/napi-v*/darwin/**",
      "./node_modules/onnxruntime-node/bin/napi-v*/linux/arm64/**",
      "./node_modules/onnxruntime-node/bin/**/libonnxruntime_providers_{cuda,tensorrt}.so",
      "./node_modules/onnxruntime-web/**",
      "./node_modules/@img/sharp-wasm32/**",
      "./node_modules/@img/sharp-*linuxmusl*/**",
      "./node_modules/@huggingface/transformers/.cache/**",
      "./node_modules/@huggingface/transformers/dist/{transformers.js,transformers.min.js,transformers.web.js,transformers.web.min.js,*.cjs}",
      "./node_modules/@huggingface/transformers/dist/*.wasm",
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
