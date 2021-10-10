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

import * as pRetry from "p-retry";

export async function retry<T>(
	cb: () => Promise<T>,
	options: pRetry.Options = {
		retries: 5,
		factor: 3,
		minTimeout: 1 * 500,
		maxTimeout: 5 * 1000,
		randomize: true,
	},
): Promise<T> {
	const retry = await import("p-retry");
	return retry(() => cb(), options);
}
