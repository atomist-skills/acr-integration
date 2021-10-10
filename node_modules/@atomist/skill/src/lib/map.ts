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

import camelCase = require("lodash.camelcase");

import { EventHandler, MappingEventHandler } from "./handler/handler";
import { error } from "./log/console";
import { prepareStatus } from "./message";
import { isPrimitive, toArray } from "./util";

export function wrapEventHandler(eh: EventHandler): EventHandler {
	return async ctx => {
		const meh = (eh as any) as MappingEventHandler;
		if (typeof meh !== "function" && meh.map && meh.handle) {
			const data = meh.map(ctx.data);
			return meh.handle({
				...ctx,
				data,
			});
		}

		if (Array.isArray(ctx.data)) {
			const results = [];
			for (const event of ctx.data) {
				try {
					const result = await eh({ ...ctx, data: event });
					if (result) {
						results.push(result);
					}
				} catch (e) {
					error(`Error occurred: ${e.stack}`);
					results.push(prepareStatus(e, ctx));
				}
			}
			return {
				code: results.reduce((p, c) => {
					if (c.code !== 0) {
						return c.code;
					} else {
						return 0;
					}
				}, 0),
				reason: results
					.filter(r => r.reason)
					.filter(r => r.visibility !== "hidden")
					.map(r => r.reason)
					.join(", "),
				visibility: results.some(r => r.visibility !== "hidden")
					? undefined
					: "hidden",
			};
		} else {
			return eh(ctx);
		}
	};
}

/**
 * Map a Datalog subscription result to a JavaScript object
 */
export function mapSubscription<T = any>(result: any[]): T {
	if (!result) {
		return undefined;
	}

	const mapped = {};

	const mapper = (v: any) => {
		if (isPrimitive(v)) {
			return v;
		} else if (Array.isArray(v)) {
			return v.map(vr => mapper(vr));
		} else {
			// Special case for enums
			const values = Object.keys(v);
			if (
				values.length === 2 &&
				values.includes("db/id") &&
				values.includes("db/ident")
			) {
				return nameFromKey(v["db/ident"], false);
			}
			const m = {};
			for (const k in v) {
				m[nameFromKey(k)] = mapper(v[k]);
			}
			return m;
		}
	};

	toArray(result).forEach(r => {
		const value = {};
		const key = nameFromKey(r["schema/entity-type"] || "unknownEntity");
		for (const k in r) {
			if (k !== "schema/entity-type") {
				value[nameFromKey(k)] = mapper(r[k]);
			}
		}
		if (Array.isArray(mapped[key])) {
			mapped[key].push(value);
		} else if (mapped[key]) {
			mapped[key] = [mapped[key], value];
		} else {
			mapped[key] = value;
		}
	});

	return mapped as T;
}

function nameFromKey(value: string, toCamelCase = true): string {
	let name;
	if (value.includes("/")) {
		name = value.split("/")[1];
	} else {
		name = value;
	}
	if (toCamelCase) {
		return camelCase(name);
	} else {
		return name;
	}
}
