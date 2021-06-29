/*
 * Copyright © 2020 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { execPromise } from "../child_process";

export interface Status {
	isClean: boolean;
	ignoredChanges: string[];
	raw: string;
	sha: string;
	branch: string;
	upstream?: {
		branch: string;
		inSync: boolean;
	};
	detached: boolean;
}

export function isFullyClean(gs: Status): boolean {
	return gs.isClean && gs.ignoredChanges.length === 0;
}

export async function runStatusIn(baseDir: string): Promise<Status> {
	const branch = await determineBranch(baseDir);
	const upstreamData = await collectUpstream(baseDir, branch);
	const shaData = await collectFullSha(baseDir);
	const cleanlinessData = await collectCleanliness(baseDir);
	const ignoredChangeData = await collectIgnoredChanges(baseDir);
	const detached = await collectDetached(baseDir);
	return {
		branch,
		...ignoredChangeData,
		...cleanlinessData,
		...shaData,
		...upstreamData,
		detached,
	};
}

export async function determineBranch(baseDir: string): Promise<string> {
	const branchNameResult = await execPromise(
		"git",
		["rev-parse", "--abbrev-ref", "HEAD"],
		{ cwd: baseDir },
	);
	return branchNameResult.stdout.trim();
}

async function collectCleanliness(
	baseDir: string,
): Promise<{ isClean: boolean }> {
	const porcelainStatusResult = await execPromise(
		"git",
		["status", "--porcelain"],
		{ cwd: baseDir },
	);
	const raw = porcelainStatusResult.stdout;
	return { isClean: raw.length === 0 };
}

async function collectIgnoredChanges(
	baseDir: string,
): Promise<{ ignoredChanges: string[]; raw: string }> {
	const porcelainStatusResult = await execPromise(
		"git",
		["status", "--porcelain", "--ignored"],
		{ cwd: baseDir },
	);
	const raw = porcelainStatusResult.stdout;
	const ignored = raw
		.trim()
		.split("\n")
		.filter(s => s.startsWith("!"))
		.map(s => s.substring(3));
	return {
		raw,
		ignoredChanges: ignored,
	};
}

async function collectFullSha(
	baseDir: string,
	commit = "HEAD",
): Promise<{ sha: string }> {
	const result = await execPromise("git", ["rev-list", "-1", commit, "--"], {
		cwd: baseDir,
	});
	return {
		sha: result.stdout.trim(),
	};
}

async function collectUpstream(
	baseDir: string,
	branch: string,
): Promise<{ upstream?: { branch: string; inSync: boolean } }> {
	const branchArgs = [
		"for-each-ref",
		"--format",
		"%(upstream:short) %(upstream:trackshort)",
		`refs/heads/${branch}`,
	];
	const branchResult = await execPromise("git", branchArgs, { cwd: baseDir });
	const branchResultParts = branchResult.stdout.trim().split(" ");
	const upstream =
		branchResultParts.length > 0
			? {
					branch: branchResultParts[0],
					inSync: branchResultParts[1] === "=",
			  }
			: undefined;
	return { upstream };
}

async function collectDetached(baseDir: string): Promise<boolean> {
	const statusResult = await execPromise("git", ["status"], { cwd: baseDir });
	return statusResult.stdout.includes("HEAD detached at ");
}
