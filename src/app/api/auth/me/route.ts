import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { hasPrimaryDomain, userHasMailboxes } from "@/lib/user";
import { hasCloudflareCredentials, isNodeRuntime } from "@/lib/runtime";

export async function GET(request: Request) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let hasMailboxes = false;
	let isSetup = true;
	try {
		[hasMailboxes, isSetup] = await Promise.all([
			userHasMailboxes(env, user.id),
			hasPrimaryDomain(env),
		]);
	} catch {
		// Authentication remains valid when optional mailbox/setup metadata is unavailable.
	}
	return NextResponse.json({
		user: {
			id: user.id,
			email: user.email,
			name: user.name,
			resetEmail: user.resetEmail,
			forwardingEmail: user.forwardingEmail,
			canForwardEmail: true,
			role: user.role,
			canManageMailboxes: user.canManageMailboxes,
			keyboardShortcutsEnabled: user.keyboardShortcutsEnabled,
			spamProtectionEnabled: user.spamProtectionEnabled,
			hasAvatar: !!user.avatarKey,
			mfaEnabled: user.totpEnabled,
		},
		runtime: isNodeRuntime(env) ? "node" : "cloudflare",
		managesDns: hasCloudflareCredentials(env),
		hasMailboxes,
		isSetup,
	});
}
