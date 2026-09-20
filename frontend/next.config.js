const path = require("path");

// NEXT_OUTPUT=export produces a fully static site in ./out. That is what the
// Android/iOS apps bundle (npm run build:mobile), and it can also be dropped on
// any static host (GitHub Pages, Cloudflare Pages, Netlify...).
const staticExport = process.env.NEXT_OUTPUT === "export";

// The page never needs to be framed, never needs camera/mic/location, and should
// not leak room codes (?room=...) to other sites through the Referer header.
const securityHeaders = [
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "X-Frame-Options", value: "DENY" },
	{ key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
	{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	output: staticExport ? "export" : "standalone",
	// Explicitly set the project root to the frontend directory
	outputFileTracingRoot: __dirname,
	poweredByHeader: false,
	...(staticExport
		? { images: { unoptimized: true }, trailingSlash: true }
		: { headers: async () => [{ source: "/:path*", headers: securityHeaders }] }),
};

module.exports = nextConfig;
