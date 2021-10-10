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

import { Options } from "fast-glob";

import { Project } from "./project";

/**
 * Utility to find files in a project via provided glob patterns
 */
export async function globFiles(
	projectOrCwd: Project | string,
	patterns: string | string[],
	options: Options = {},
): Promise<string[]> {
	return (await import("fast-glob"))(patterns, {
		cwd: cwd(projectOrCwd),
		onlyFiles: true,
		dot: true,
		ignore: [".git", "node_modules"],
		...options,
	});
}

/**
 * Utility to run a callback with any matched file
 */
export async function withGlobMatches<T>(
	projectOrCwd: Project | string,
	patterns: string | string[],
	cb: (match: string) => Promise<T>,
	options: Options = {},
): Promise<T[]> {
	const files = await globFiles(projectOrCwd, patterns, options);
	const results = [];
	for (const file of files) {
		const result = await cb(file);
		if (result) {
			results.push(result);
		}
	}
	return results;
}

export function cwd(projectOrCwd: Project | string): string {
	return typeof projectOrCwd === "string"
		? projectOrCwd
		: projectOrCwd.path();
}
