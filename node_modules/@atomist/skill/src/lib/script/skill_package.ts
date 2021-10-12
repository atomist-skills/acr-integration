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

import * as fs from "fs-extra";
import * as path from "path";

import { info } from "../log";

export async function packageSkill(
	cwd: string,
	verbose: boolean,
): Promise<void> {
	if (!verbose) {
		process.env.ATOMIST_LOG_LEVEL = "info";
	}
	info(`Packaging skill archive...`);

	const fileName = path.join(cwd, ".atomist", "skill.zip");
	await fs.ensureDir(path.dirname(fileName));

	const ignores = [".git", "node_modules", ".npm"];
	const ignoreFile = ".atomistignore";
	if (await fs.pathExists(path.join(cwd, ignoreFile))) {
		ignores.push(
			...(
				await (await fs.readFile(path.join(cwd, ignoreFile))).toString()
			)
				.trim()
				.split("\n"),
		);
	}

	const matches: string[] = await (await import("glob-gitignore")).glob(
		["**"],
		{
			cwd,
			ignore: ignores,
			dot: true,
		},
	);

	const zip = new (await import("jszip"))();

	for (const match of matches) {
		const file = path.join(cwd, match);
		if ((await fs.pathExists(file)) && (await fs.stat(file)).isFile()) {
			zip.file(match, fs.createReadStream(file));
		}
	}

	await new Promise<string>(resolve => {
		zip.generateNodeStream({
			type: "nodebuffer",
			streamFiles: true,
			compression: "DEFLATE",
			compressionOptions: { level: 6 },
		})
			.pipe(fs.createWriteStream(fileName))
			.on("finish", () => {
				resolve(fileName);
			});
	});
	info(
		`Packaged ${matches.length} ${
			matches.length === 1 ? "file" : "files"
		} into archive '${fileName}'`,
	);
}
