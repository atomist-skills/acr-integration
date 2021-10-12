/*
 * Copyright © 2021 Atomist, Inc.
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
import * as JSZip from "jszip";
import * as os from "os";
import * as path from "path";

import { CommandContext, EventContext } from "../handler/handler";
import { debug } from "../log/console";
import { Project } from "../project/project";
import { globFiles } from "../project/util";

/**
 * Glob files and store archive in storage backend
 */
export async function store(
	ctx: EventContext | CommandContext,
	key: string,
	cwdOrProject: string | Project,
	...pattern: string[]
): Promise<void> {
	const cwd =
		typeof cwdOrProject === "string" ? cwdOrProject : cwdOrProject.path();
	debug(`Storing cache '${key}' for pattern '${pattern.join(", ")}'...`);
	const files = await globFiles({ path: () => cwd } as any, pattern);
	debug(`Caching ${files.length} files`);

	const zip = new JSZip();
	for (const file of files) {
		const p = path.join(cwd, file);
		if ((await fs.stat(p)).isFile()) {
			zip.file(file, fs.createReadStream(p));
		}
	}

	const fileName = path.join(
		os.tmpdir() || "/tmp",
		`${ctx.correlationId}-${Date.now()}.zip`,
	);
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

	await ctx.storage.store(key, fileName);
	debug(`Cache '${key}' stored`);
}

/**
 * Restore archive from storage backend and extract files
 */
export async function restore(
	ctx: EventContext | CommandContext,
	key: string,
	cwdOrProject: string | Project,
): Promise<void> {
	const cwd =
		typeof cwdOrProject === "string" ? cwdOrProject : cwdOrProject.path();
	debug(`Restoring cache '${key}'...`);
	try {
		const fileName = path.join(
			os.tmpdir() || "/tmp",
			`${ctx.correlationId}-${Date.now()}.zip`,
		);
		await ctx.storage.retrieve(key, fileName);

		const zip = await JSZip.loadAsync(await fs.readFile(fileName));
		for (const file in zip.files) {
			if (zip.files[file]) {
				const entry = zip.file(file);
				if (entry) {
					const p = path.join(cwd, file);
					await fs.ensureDir(path.dirname(p));
					await fs.writeFile(
						p,
						await zip.file(file).async("nodebuffer"),
					);
				}
			}
		}
	} catch (e) {
		debug(`Error extracting cache: %s`, e.message);
	}
	debug(`Cache '${key}' restored`);
}
