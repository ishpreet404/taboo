const path = require("path");

// NEXT_OUTPUT=export produces a fully static site in ./out. That is what the
// Android/iOS apps bundle (npm run build:mobile), and it can also be dropped on
// any static host (GitHub Pages, Cloudflare Pages, Netlify...).
const staticExport = process.env.NEXT_OUTPUT === "export";

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	output: staticExport ? "export" : "standalone",
	// Explicitly set the project root to the frontend directory
	outputFileTracingRoot: __dirname,
	...(staticExport ? { images: { unoptimized: true }, trailingSlash: true } : {}),
};

module.exports = nextConfig;
