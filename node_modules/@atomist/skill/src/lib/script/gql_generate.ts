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
import * as path from "path";

import { spawnPromise } from "../child_process";
import { info } from "../log";
import { globFiles } from "../project/util";

export async function generateGql(options: {
	cwd: string;
	config: string;
}): Promise<void> {
	process.env.ATOMIST_LOG_LEVEL = "info";

	// Load globs from the codegen.yaml
	const yaml = await import("js-yaml");
	const localCodegenPath = path.join(options.cwd, "codegen.yml");
	const graphqlCodegenPath = path.join(options.cwd, "graphql", "codegen.yml");
	const npmCodegenPath = path.join(
		options.cwd,
		"node_modules",
		"@atomist",
		"skill",
		"graphql",
		"codegen.yaml",
	);
	const skillCodegenPath = path.join(
		__dirname,
		"..",
		"..",
		"graphql",
		"codegen.yaml",
	);
	const config =
		options.config ||
		(fs.existsSync(localCodegenPath) && localCodegenPath) ||
		(fs.existsSync(graphqlCodegenPath) && graphqlCodegenPath) ||
		(fs.existsSync(npmCodegenPath) && npmCodegenPath) ||
		skillCodegenPath;
	info(`Using codegen configuration '${config}'`);
	const codegen: { documents: string[] } = yaml.load(
		await fs.readFile(config, "utf8"),
	) as any;

	// Exit gracefully when there are no files found
	const files = await globFiles(options.cwd, codegen.documents);
	if (files.length === 0) {
		info("No graphql files found. Skipping type generation...");
		return;
	}

	const cli = path.join(
		options.cwd,
		"node_modules",
		"@graphql-codegen",
		"cli",
		"bin.js",
	);
	const result = await spawnPromise(cli, ["--config", config, "-e"], {
		logCommand: false,
		log: {
			write: async msg =>
				msg
					.trimRight()
					.split("\n")
					.forEach(l => info(l.trimRight())),
		},
	});
	if (result.status !== 0) {
		throw new Error("Type generation failed");
	} else {
		info(`Successfully generated graphql types in 'lib/typings/types.ts'`);
	}
}
