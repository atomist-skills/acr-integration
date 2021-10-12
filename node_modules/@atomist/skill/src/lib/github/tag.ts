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

import * as semver from "semver";

import { debug } from "../log/console";
import { AuthenticatedRepositoryId } from "../repository/id";
import { GitHubAppCredential, GitHubCredential } from "../secret/provider";
import { api } from "./operation";

export async function nextTag(
	id: AuthenticatedRepositoryId<GitHubAppCredential | GitHubCredential>,
	increment: "major" | "minor" | "patch" | "prerelease" = "prerelease",
	startTag = "0.1.0-0",
): Promise<string> {
	const github = api(id);
	const tags = [];
	for await (const response of github.paginate.iterator(
		github.repos.listTags,
		{
			owner: id.owner,
			repo: id.repo,
			per_page: 200,
		},
	)) {
		tags.push(...response.data.map(t => t.name));
	}
	return incrementTag(tags, increment, startTag);
}

export function incrementTag(
	tags: string[],
	increment: "major" | "minor" | "patch" | "prerelease" = "prerelease",
	startTag = "0.1.0-0",
): string {
	const sortedTags = tags
		.filter(t => semver.valid(t))
		.sort((t1, t2) => {
			return semver.compare(t2, t1);
		});
	if (sortedTags.length === 0) {
		return startTag;
	}
	const latestTag = sortedTags[0];
	const nextTag = semver.inc(latestTag, increment);
	debug(`Calculated next tag '${nextTag}' from current tag '${latestTag}'`);
	return nextTag;
}
