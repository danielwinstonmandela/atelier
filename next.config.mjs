/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  // Required by @imgly/background-removal (ONNX runtime / WASM) in the browser
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, sharp$: false, "onnxruntime-node$": false };
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self)" },
        ],
      },
    ];
  },
};
export default nextConfig;
