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

/**
 * Clean a skill project that was previously processed by generate, bundle or package commands
 */
export async function cleanSkill(cwd: string): Promise<void> {
	// Restore package.json and package_lock.json
	info("Restoring 'package.json' and 'package-lock.json'");
	await safeCopy(cwd, path.join(".atomist", "package.json"), "package.json");
	await safeCopy(
		cwd,
		path.join(".atomist", "package-lock.json"),
		"package-lock.json",
	);

	// Delete .atomist and bundle folders
	info("Cleaning '.atomist' and 'bundle' folders");
	await safeDelete(cwd, ".atomist");
	await safeDelete(cwd, "bundle");
}

async function safeDelete(cwd: string, p: string): Promise<void> {
	if (await fs.pathExists(path.join(cwd, p))) {
		await fs.remove(path.join(cwd, p));
	}
}

async function safeCopy(cwd: string, from: string, to: string): Promise<void> {
	if (await fs.pathExists(path.join(cwd, from))) {
		await fs.copyFile(path.join(cwd, from), path.join(cwd, to));
	}
}
