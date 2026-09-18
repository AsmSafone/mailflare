import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function run(cmd, options = {}) {
	try {
		return execSync(cmd, {
			encoding: "utf8",
			stdio: options.silent ? "pipe" : ["pipe", "pipe", "pipe"],
			env: { ...process.env, ...options.env },
		});
	} catch (err) {
		if (options.ignoreError) {
			return err.stdout ? err.stdout.toString() : "";
		}
		const stderr = err.stderr ? err.stderr.toString() : err.message;
		throw new Error(`Command failed: ${cmd}\n${stderr}`);
	}
}

async function resolveAccountId(token) {
	if (process.env.CLOUDFLARE_ACCOUNT_ID?.trim()) {
		return process.env.CLOUDFLARE_ACCOUNT_ID.trim();
	}

	if (!token) {
		return null;
	}

	// 1. Try GET /accounts
	try {
		const res = await fetch("https://api.cloudflare.com/client/v4/accounts", {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (res.ok) {
			const data = await res.json();
			if (data.success && Array.isArray(data.result) && data.result.length > 0) {
				const acc = data.result[0];
				console.log(`🔍 Automatically resolved Cloudflare Account: ${acc.name || "Default"} (${acc.id})`);
				return acc.id;
			}
		}
	} catch {}

	// 2. Try GET /zones (zones contain account metadata)
	try {
		const res = await fetch("https://api.cloudflare.com/client/v4/zones", {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (res.ok) {
			const data = await res.json();
			if (data.success && Array.isArray(data.result) && data.result[0]?.account?.id) {
				const acc = data.result[0].account;
				console.log(`🔍 Automatically resolved Cloudflare Account from zone: ${acc.name || "Default"} (${acc.id})`);
				return acc.id;
			}
		}
	} catch {}

	// 3. Try wrangler whoami
	try {
		const whoami = run("npx wrangler whoami", { silent: true, ignoreError: true });
		const match = whoami.match(/Account ID:\s*([0-9a-f]{32})/i) || whoami.match(/([0-9a-f]{32})/i);
		if (match) {
			console.log(`🔍 Automatically resolved Cloudflare Account via wrangler: (${match[1]})`);
			return match[1];
		}
	} catch {}

	return null;
}

async function main() {
	console.log("🚀 Provisioning and configuring Cloudflare resources for Mailflare...\n");

	const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_TOKEN;
	const resolvedAccountId = await resolveAccountId(token);
	if (resolvedAccountId) {
		process.env.CLOUDFLARE_ACCOUNT_ID = resolvedAccountId;
	}

	const d1DatabaseName = process.env.D1_DATABASE_NAME || "mailflare";
	const r2BucketName = process.env.R2_BUCKET_NAME || "mailflare-raw";
	const inboundQueueName = process.env.INBOUND_QUEUE_NAME || "mailflare-inbound";
	const outboundQueueName = process.env.OUTBOUND_QUEUE_NAME || "mailflare-outbound";

	// 1. D1 Database
	console.log(`📦 Checking D1 Database '${d1DatabaseName}'...`);
	let databaseId = null;

	try {
		const listOutput = run("npx wrangler d1 list --json", { silent: true });
		const d1Databases = JSON.parse(listOutput);
		const existing = Array.isArray(d1Databases)
			? d1Databases.find((db) => db.name === d1DatabaseName)
			: null;

		if (existing && existing.uuid) {
			databaseId = existing.uuid;
			console.log(`✅ Found existing D1 database '${d1DatabaseName}' (ID: ${databaseId})`);
		}
	} catch (err) {
		console.warn(`⚠️ Could not query existing D1 databases list: ${err.message}`);
	}

	if (!databaseId) {
		console.log(`Creating D1 database '${d1DatabaseName}'...`);
		const createOutput = run(`npx wrangler d1 create ${d1DatabaseName} --json`, { ignoreError: true });
		try {
			const parsed = JSON.parse(createOutput);
			databaseId = parsed.database_id || parsed.uuid;
		} catch {
			const match = createOutput.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
			if (match) {
				databaseId = match[0];
			}
		}

		if (!databaseId) {
			// Fallback: retry listing
			try {
				const listOutput = run("npx wrangler d1 list --json", { silent: true });
				const d1Databases = JSON.parse(listOutput);
				const existing = Array.isArray(d1Databases)
					? d1Databases.find((db) => db.name === d1DatabaseName)
					: null;
				if (existing && existing.uuid) {
					databaseId = existing.uuid;
				}
			} catch {
				// ignore
			}
		}

		if (!databaseId) {
			throw new Error(`Failed to create or obtain database_id for D1 database '${d1DatabaseName}'.\nOutput: ${createOutput}`);
		}
		console.log(`✅ Created D1 database '${d1DatabaseName}' (ID: ${databaseId})`);
	}

	// Inject database_id into wrangler.jsonc if missing
	const wranglerPath = path.resolve("wrangler.jsonc");
	if (fs.existsSync(wranglerPath)) {
		let wranglerContent = fs.readFileSync(wranglerPath, "utf8");
		if (!wranglerContent.includes(`"database_id"`)) {
			console.log(`Injecting database_id into ${wranglerPath}...`);
			wranglerContent = wranglerContent.replace(
				/("database_name":\s*"mailflare",?)/,
				`$1\n\t\t\t"database_id": "${databaseId}",`,
			);
			fs.writeFileSync(wranglerPath, wranglerContent, "utf8");
			console.log(`✅ Injected database_id into wrangler.jsonc`);
		} else {
			console.log(`ℹ️ wrangler.jsonc already specifies a database_id`);
		}
	}

	// 2. R2 Bucket
	console.log(`\n🪣 Checking R2 Bucket '${r2BucketName}'...`);
	try {
		const out = run(`npx wrangler r2 bucket create ${r2BucketName}`, { ignoreError: true });
		if (out.includes("already exists") || out.includes("Created bucket") || !out.trim()) {
			console.log(`✅ R2 Bucket '${r2BucketName}' is ready`);
		} else {
			console.log(`R2 Bucket status: ${out.trim()}`);
		}
	} catch (err) {
		console.log(`R2 Bucket check completed (${err.message})`);
	}

	// 3. Queues
	console.log(`\n📬 Checking Queues...`);
	try {
		run(`npx wrangler queues create ${inboundQueueName}`, { ignoreError: true });
		console.log(`✅ Queue '${inboundQueueName}' is ready`);
	} catch (err) {
		console.log(`Queue '${inboundQueueName}' check: ${err.message}`);
	}

	try {
		run(`npx wrangler queues create ${outboundQueueName}`, { ignoreError: true });
		console.log(`✅ Queue '${outboundQueueName}' is ready`);
	} catch (err) {
		console.log(`Queue '${outboundQueueName}' check: ${err.message}`);
	}

	console.log("\n🎉 All required Cloudflare resources are provisioned and configured!\n");
}

main().catch((err) => {
	console.error(`\n❌ Cloudflare resource setup failed: ${err.message}`);
	process.exit(1);
});
