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

import { spawnPromise } from "../child_process";
import { debug, info } from "../log";
import { withGlobMatches } from "../project/util";

export async function bundleSkill(
	cwd: string,
	minify: boolean,
	sourceMap: boolean,
	verbose: boolean,
	file: string,
): Promise<void> {
	if (!verbose) {
		process.env.ATOMIST_LOG_LEVEL = "info";
	}
	info(`Creating skill bundle...`);

	const skillEntryPointExists = await fs.pathExists(path.join(cwd, file));

	if (!skillEntryPointExists) {
		const events = await withGlobMatches<string>(
			cwd,
			["events/*.js", "lib/events/*.js"],
			async file => {
				const content = (
					await fs.readFile(path.join(cwd, file))
				).toString();
				if (/exports\.handler\s*=/.test(content)) {
					const name = path.basename(file).replace(/\.js/, "");
					const fileName = file.replace(/\.js/, "");
					return `bundle.registerEvent("${name}", async () => (await Promise.resolve().then(() => require("./${fileName}"))).handler);`;
				}
				return undefined;
			},
		);
		const commands = await withGlobMatches<string>(
			cwd,
			["commands/*.js", "lib/commands/*.js"],
			async file => {
				const content = (
					await fs.readFile(path.join(cwd, file))
				).toString();
				if (/exports\.handler\s*=/.test(content)) {
					const name = path.basename(file).replace(/\.js/, "");
					const fileName = file.replace(/\.js/, "");
					return `bundle.registerCommand("${name}", async () => (await Promise.resolve().then(() => require("./${fileName}"))).handler);`;
				}
				return undefined;
			},
		);
		const webhooks = await withGlobMatches<string>(
			cwd,
			["webhooks/*.js", "lib/webhooks/*.js"],
			async file => {
				const content = (
					await fs.readFile(path.join(cwd, file))
				).toString();
				if (/exports\.handler\s*=/.test(content)) {
					const name = path.basename(file).replace(/\.js/, "");
					const fileName = file.replace(/\.js/, "");
					return `bundle.registerWebhook("${name}", async () => (await Promise.resolve().then(() => require("./${fileName}"))).handler);`;
				}
				return undefined;
			},
		);

		const skillTs = [
			`exports.entryPoint = require("@atomist/skill/lib/bundle").bundle;`,
			`const bundle = require("@atomist/skill/lib/bundle");`,
		];

		await fs.writeFile(
			path.join(cwd, "skill.bundle.js"),
			`${skillTs.join("\n")}
${events.join("\n")}
${webhooks.join("\n")}
${commands.join("\n")}`,
		);
	}

	const nccArgs = ["build", file, "-o", "bundle"];
	if (minify) {
		nccArgs.push("-m");
	}
	if (sourceMap) {
		nccArgs.push("-s");
	}

	// Run ncc
	const result = await spawnPromise(
		path.join(cwd, "node_modules", ".bin", "ncc"),
		nccArgs,
		{
			cwd,
			log: { write: (msg: string): void => debug(msg.trim()) },
		},
	);
	if (result.status !== 0) {
		throw new Error("Failed to create skill bundle");
	}

	// Update package.json
	// - rewrite main
	// - remove dependencies
	await fs.ensureDir(path.join(cwd, ".atomist"));
	await fs.copyFile(
		path.join(cwd, "package.json"),
		path.join(cwd, ".atomist", "package.json"),
	);
	if (await fs.pathExists(path.join(cwd, "package-lock.json"))) {
		await fs.copyFile(
			path.join(cwd, "package-lock.json"),
			path.join(cwd, ".atomist", "package-lock.json"),
		);
	}
	const pj = await fs.readJson(path.join(cwd, "package.json"));
	pj.main = "bundle/index.js";
	delete pj.dependencies;
	delete pj.devDependencies;
	await fs.writeJson(path.join(cwd, "package.json"), pj, { spaces: "  " });
	await fs.remove(path.join(cwd, "package-lock.json"));

	if (!skillEntryPointExists) {
		await fs.remove(path.join(cwd, file));
	}

	info(`Skill bundle created at '${path.join(cwd, "bundle")}'`);
}
