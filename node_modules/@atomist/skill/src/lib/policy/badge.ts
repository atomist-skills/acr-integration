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

import * as crypto from "crypto";
import * as fs from "fs-extra";
import * as path from "path";

import { encrypt } from "../jose/encyrpt";
import { ResultEntitySeverity, ResultEntityState } from "./result";

export async function link(parameters: {
	sha: string;
	name: string;
	workspace: string;
	title?: string;
	state?: ResultEntityState;
	severity?: ResultEntitySeverity;
}): Promise<string> {
	const publicKey = crypto.createPublicKey(
		await fs.readFile(path.join(__dirname, "badge-public.pem")),
	);
	const encrypted = await encrypt(parameters, publicKey);
	return `https://us-east1-atomist-skill-production.cloudfunctions.net/global-badge-creator/badge/${encodeURIComponent(
		encrypted,
	)}`;
}

export async function markdownLink(parameters: {
	sha: string;
	name: string;
	workspace: string;
	title?: string;
	state?: ResultEntityState;
	severity?: ResultEntitySeverity;
}): Promise<string> {
	return `<!-- atomist:hide -->
![badge](${await link(parameters)})
<!-- atomist:show -->`;
}
