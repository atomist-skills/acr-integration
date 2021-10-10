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

import { Contextual, EventContext } from "./handler/handler";
import { debug } from "./log/console";
import { guid, handleError, isPrimitive } from "./util";

export async function hydrate<T>(
	configurationName: string,
	ctx: Contextual<any, any>,
	value?: T,
): Promise<T> {
	const key = stateKey(configurationName, ctx);
	try {
		const stateFile = await ctx.storage.retrieve(key);
		const state = await fs.readJson(stateFile);
		return {
			...(value || ({} as T)),
			...state,
		};
	} catch (e) {
		return value || ({} as T);
	}
}

export async function save(
	state: Record<string, any>,
	configurationName: string,
	ctx: Contextual<any, any>,
): Promise<void> {
	const key = stateKey(configurationName, ctx);
	try {
		const targetFilePath = path.join(os.tmpdir() || "/tmp", guid());
		await fs.ensureDir(path.dirname(targetFilePath));
		await fs.writeJson(targetFilePath, state);
		await ctx.storage.store(key, targetFilePath);
	} catch (e) {
		debug(`Failed to save state: ${e.message}`);
	}
}

function stateKey(
	configurationName: string,
	ctx: Contextual<any, any>,
): string {
	return `state/${ctx.workspaceId}/${ctx.skill.namespace}/${
		ctx.skill.name
	}/${configurationName.replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase()}.json`;
}

export function cachify<
	T extends (ctx: EventContext<any, any>, ...args: any) => Promise<any>
>(func: T, resolver?: (...args: any) => string): T {
	return (async (ctx: EventContext<any, any>, ...args: any) => {
		let key;
		if (resolver) {
			key = resolver(...args);
		} else {
			key = args.reduce((p, c) => {
				if (isPrimitive(c)) {
					return `${p}_${c.toString()}`;
				} else {
					return p;
				}
			}, "");
		}
		const resultKey = `${ctx.configuration.name}/${key.toLowerCase()}`;
		const old = await hydrate(resultKey, ctx, {
			result: undefined,
		});
		if (old.result) {
			return JSON.parse(old.result);
		}
		const result = await func(ctx, ...args);
		await handleError(() =>
			save({ result: JSON.stringify(result) }, resultKey, ctx),
		);
		return result;
	}) as any;
}
