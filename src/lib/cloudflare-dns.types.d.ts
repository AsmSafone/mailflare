export type CloudflareDnsRecordCreate = {
	type: "MX";
	name: string;
	content: string;
	priority: number;
	ttl: number;
	proxied?: boolean;
	comment?: string;
	tags?: string[];
};
