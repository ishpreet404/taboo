// Load environment variables from .env file
require("dotenv").config();

// Optional Socket.IO backend (server mode). The default deployment is serverless
// P2P and does not need this process at all - see SERVERLESS.md.
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");
const { google } = require("googleapis");

// Browsers may only connect from these origins. Override with a comma-separated
// ALLOWED_ORIGINS env var (e.g. your own domain) when self-hosting.
const ALLOWED_ORIGINS = (
	process.env.ALLOWED_ORIGINS ||
	"https://taboo-inferno.vercel.app,http://localhost:3001,http://localhost:3000"
)
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);

const app = express();
app.disable("x-powered-by");
const server = http.createServer(app);
const io = socketIO(server, {
	cors: { origin: ALLOWED_ORIGINS, methods: ["GET", "POST"] },
	// Largest legitimate message is a custom word pack (~25 KB); the 1 MB default
	// just gives a flooder more room
	maxHttpBufferSize: 128 * 1024,
});

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use((_req, res, next) => {
	res.setHeader("X-Content-Type-Options", "nosniff");
	res.setHeader("X-Frame-Options", "DENY");
	res.setHeader("Referrer-Policy", "no-referrer");
	next();
});

// Health endpoint used by Render health checks and uptime monitoring.
app.get("/health", (_req, res) => {
	res.status(200).json({ status: "ok" });
});

// Silence server console output to avoid exposing server logs to clients' consoles.
// This overrides console methods on the Node server only and can be reverted by
// removing these lines during debugging.
if (
	typeof process !== "undefined" &&
	process.release &&
	process.release.name === "node"
) {
	console.log = () => {};
	console.info = () => {};
	console.warn = () => {};
	console.error = () => {};
}


// Set these environment variables or hardcode them (not recommended for production)
const GOOGLE_SHEETS_CREDENTIALS = process.env.GOOGLE_SHEETS_CREDENTIALS || null;
const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID || null;

// Initialize Google Sheets API
let sheetsClient = null;
if (GOOGLE_SHEETS_CREDENTIALS && GOOGLE_SHEETS_ID) {
	try {
		const credentials = JSON.parse(GOOGLE_SHEETS_CREDENTIALS);
		const auth = new google.auth.GoogleAuth({
			credentials,
			scopes: ["https://www.googleapis.com/auth/spreadsheets"],
		});
		sheetsClient = google.sheets({ version: "v4", auth });
		console.log("✅ Google Sheets API initialized successfully");
	} catch (error) {
		console.error("❌ Failed to initialize Google Sheets API:", error.message);
		console.log(
			"Word feedback will be stored locally but not sent to Google Sheets",
		);
	}
} else {
	console.log(
		"⚠️ Google Sheets credentials not configured. Set GOOGLE_SHEETS_CREDENTIALS and GOOGLE_SHEETS_ID environment variables.",
	);
	console.log(
		"Word feedback will be stored locally but not sent to Google Sheets",
	);
}

// Function to send word feedback to Google Sheets
async function sendFeedbackToGoogleSheets(feedbackArray) {
	if (!sheetsClient || !GOOGLE_SHEETS_ID || feedbackArray.length === 0) {
		console.log(
			"Skipping Google Sheets upload (not configured or no feedback)",
		);
		return;
	}

	try {
		// Prepare rows for Google Sheets
		const rows = feedbackArray.map((fb) => [
			fb.timestamp,
			fb.roomCode,
			fb.playerName,
			fb.word,
			fb.difficulty,
			fb.feedback,
		]);

		// Append to Google Sheets
		await sheetsClient.spreadsheets.values.append({
			spreadsheetId: GOOGLE_SHEETS_ID,
			range: "Feedback!A:F", // Sheet name and range
			valueInputOption: "RAW",
			insertDataOption: "INSERT_ROWS",
			resource: {
				values: rows,
			},
		});

		console.log(`✅ Sent ${rows.length} feedback entries to Google Sheets`);
	} catch (error) {
		console.error("❌ Error sending feedback to Google Sheets:", error.message);
	}
}

// Function to send suggestions to Google Sheets (separate sheet/tab)
async function sendSuggestionsToGoogleSheets(suggestionsArray) {
	if (
		!sheetsClient ||
		!GOOGLE_SHEETS_ID ||
		!suggestionsArray ||
		suggestionsArray.length === 0
	) {
		console.log(
			"Skipping Google Sheets suggestions upload (not configured or no suggestions)",
		);
		return;
	}

	try {
		const rows = suggestionsArray.map((s) => [
			s.timestamp,
			s.roomCode || "",
			s.playerName || "",
			s.word || "",
			s.difficulty || "",
		]);

		await sheetsClient.spreadsheets.values.append({
			spreadsheetId: GOOGLE_SHEETS_ID,
			range: "Suggestions!A:E",
			valueInputOption: "RAW",
			insertDataOption: "INSERT_ROWS",
			resource: { values: rows },
		});

		console.log(`✅ Sent ${rows.length} suggestion entries to Google Sheets`);
	} catch (error) {
		console.error(
			"❌ Error sending suggestions to Google Sheets:",
			error.message,
		);
	}
}


// All game logic lives in the shared core so the exact same rules can also run
// inside a room host's browser (serverless P2P mode, see frontend/lib/p2p).
const { attachGameServer } = require("./frontend/lib/game/gameCore.js");
attachGameServer(io, {
	sendFeedback: sendFeedbackToGoogleSheets,
	sendSuggestions: sendSuggestionsToGoogleSheets,
	logger: console,
});

const PORT = process.env.PORT || 3000;

function startRenderKeepAlive() {
	const renderUrl = process.env.RENDER_EXTERNAL_URL;
	const keepAliveEnabled = process.env.ENABLE_RENDER_KEEPALIVE !== "false";

	if (!renderUrl || !keepAliveEnabled) return;

	const intervalMs = 210000; // 3.5 minutes
	const healthUrl = `${renderUrl.replace(/\/$/, "")}/health`;

	const ping = async () => {
		try {
			await fetch(healthUrl, { method: "GET", cache: "no-store" });
		} catch {
			// Keepalive is best-effort; ignore transient network failures.
		}
	};

	ping();
	setInterval(ping, intervalMs);
}

server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
	console.log(`Open http://localhost:${PORT} to play`);
	startRenderKeepAlive();
});
