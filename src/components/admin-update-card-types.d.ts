export interface UpdateStatusResponse {
	available?: boolean;
	currentVersion?: string;
	error?: string;
	repository?: string;
	targetVersion?: string;
}

export interface UpdateWorkflowResponse {
	error?: string;
	ok?: boolean;
	ref?: string;
	repository?: string;
	runUrl?: string;
	workflowRunId?: number;
}

export interface MigrationStatusResponse {
	applied?: string[];
	error?: string;
	pending: string[];
	ready: boolean;
	unknown: string[];
}
