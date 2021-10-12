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

import * as fg from "fast-glob";
import * as fs from "fs";
import * as path from "path";

export function match(
	pattern: string | string[],
	cwd: string = process.cwd(),
): string[] {
	const files = fg.sync(pattern, {
		cwd,
		onlyFiles: true,
		dot: true,
		ignore: [".git", "node_modules"],
	});
	return files.map(f => fs.readFileSync(path.join(cwd, f)).toString());
}
