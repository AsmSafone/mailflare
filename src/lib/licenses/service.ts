import type { LicenseEntitlements, LicensePlan, LicenseStatus } from "./types";

export async function getLicenseStatus(_env?: CloudflareEnv): Promise<LicenseStatus> {
	return {
		plan: "team",
		state: "active",
		features: ["branding", "accounts", "forwarding"],
		instanceId: "self-hosted",
		instanceUrl: "",
		active: true,
		activatedAt: "2024-01-01T00:00:00.000Z",
		validatedAt: new Date().toISOString(),
	};
}

export async function getLicenseEntitlements(_env?: CloudflareEnv): Promise<LicenseEntitlements> {
	return {
		plan: "team",
		canCustomizeBranding: true,
		canManageAccounts: true,
		canForwardEmail: true,
	};
}

export async function activateLicense(
	env: CloudflareEnv,
	_licenseKey?: string,
	_instanceUrl?: string,
	_plan?: Exclude<LicensePlan, "community">,
): Promise<LicenseStatus> {
	return getLicenseStatus(env);
}

export async function validateLicense(env: CloudflareEnv, _licenseKey?: string, _instanceUrl?: string): Promise<LicenseStatus> {
	return getLicenseStatus(env);
}

export async function deactivateLicense(env: CloudflareEnv): Promise<LicenseStatus> {
	return getLicenseStatus(env);
}
