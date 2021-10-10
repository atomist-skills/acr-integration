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
import * as os from "os";
import * as path from "path";

import { guid } from "../util";

/**
 * [[PayloadResolver]] implementation that resolves incoming
 * skill invocations from an object in a Google Cloud Storage
 * bucket.
 */
export const GoogleCloudStoragePayloadResolver = {
	supports: (rawUrl: string): boolean => rawUrl.startsWith("gs://"),
	resolve: async (rawUrl: string): Promise<any> => {
		const url = new URL(rawUrl);

		const targetFilePath = path.join(os.tmpdir() || "/tmp", guid());
		await fs.ensureDir(path.dirname(targetFilePath));

		const storage = new (await import("@google-cloud/storage")).Storage();
		const file = storage.bucket(url.host).file(url.pathname.slice(1));
		await file.download({ destination: targetFilePath });
		await file.delete();
		return fs.readJson(targetFilePath);
	},
};
