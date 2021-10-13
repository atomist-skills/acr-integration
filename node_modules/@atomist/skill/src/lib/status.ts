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

import { HandlerStatus } from "./handler/handler";

class BuildableHandlerStatus implements HandlerStatus {
	constructor(
		public code: number,
		public reason?: string,
		public visibility?: undefined | "hidden",
		public _abort?: boolean,
	) {}

	public hidden(): this {
		this.visibility = "hidden";
		return this;
	}

	public abort(): this {
		this._abort = true;
		return this;
	}
}

/**
 * Create a successful HandlerStatus with optionally provided
 * reason text
 *
 * The return object exposes a hidden function that can be used to
 * set the status to visibility: hidden or abort the step processing early.
 */
export function success(
	reason?: string,
): HandlerStatus & {
	hidden: () => BuildableHandlerStatus;
	abort: () => BuildableHandlerStatus;
} {
	return new BuildableHandlerStatus(0, reason);
}

/**
 * Create a failed HandlerStatus with optionally provided
 * reason text
 *
 * The return object exposes a hidden function that can be used to
 * set the status to visibility: hidden or abort the step processing early.
 */
export function failure(
	reason?: string,
): HandlerStatus & {
	hidden: () => BuildableHandlerStatus;
	abort: () => BuildableHandlerStatus;
} {
	return new BuildableHandlerStatus(1, reason);
}
