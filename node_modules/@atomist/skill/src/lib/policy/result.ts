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

import { entity, entityRef } from "../datalog/util";
import { EventContext } from "../handler/handler";

export enum ResultEntityState {
	Pending = ":policy.result.state/PENDING",
	Success = ":policy.result.state/SUCCESS",
	Failure = ":policy.result.state/FAILURE",
	ActionRequired = ":policy.result.state/ACTION_REQUIRED",
	Neutral = ":policy.result.state/NEUTRAL",
}

export function toState(state: string): ResultEntityState {
	for (const key of Object.keys(ResultEntityState)) {
		if (
			`:policy.result.state/${state.toUpperCase()}` ===
			ResultEntityState[key]
		) {
			return ResultEntityState[key];
		}
	}
	return undefined;
}

export enum ResultEntitySeverity {
	Critial = ":policy.result.severity/CRITICAL",
	High = ":policy.result.severity/HIGH",
	Medium = ":policy.result.severity/MEDIUM",
	Low = ":policy.result.severity/LOW",
	Minimum = ":policy.result.severity/MINIMUM",
}

export function toSeverity(severity: string): ResultEntitySeverity {
	for (const key of Object.keys(ResultEntitySeverity)) {
		if (
			`:policy.result.severity/${severity.toUpperCase()}` ===
			ResultEntitySeverity[key]
		) {
			return ResultEntitySeverity[key];
		}
	}
	return undefined;
}

export type ResultEntity = {
	sha: string;
	name: string;
	title: string;
	message?: string;
	state: ResultEntityState;
	severity?: ResultEntitySeverity;
	managedBy?: string;
	createdAt?: Date;
	lastUpdated: Date;
	jws?: string;
};

export type ResultOwnerEntity = {
	name: string;
	namespace: string;
	version: string;
};

export interface PolicyRun {
	failed: (severity: ResultEntitySeverity, message?: string) => Promise<void>;
	actionRequired: (
		severity: ResultEntitySeverity,
		message?: string,
	) => Promise<void>;
	neutral: (message?: string) => Promise<void>;
	success: (message?: string) => Promise<void>;
}

export async function pending(
	ctx: EventContext<any, any>,
	parameters: { name?: string; title: string; sha: string },
): Promise<PolicyRun> {
	let terminated = false;
	const ownerEntity = entity<ResultOwnerEntity>("policy.result/owner", {
		name: ctx.skill.name,
		namespace: ctx.skill.namespace,
		version: ctx.skill.version,
	});
	let resultEntity = entity<ResultEntity>("policy/result", {
		sha: parameters.sha,
		name: parameters.name || ctx.skill.name,
		title: parameters.title,
		state: ResultEntityState.Pending,
		createdAt: new Date(),
		lastUpdated: new Date(),
		managedBy: entityRef(ownerEntity),
	});
	await ctx.datalog.transact([ownerEntity, resultEntity]);

	const update = (state: ResultEntityState) => async (
		message?: string,
		severity?: ResultEntitySeverity,
	) => {
		resultEntity = entity<ResultEntity>("policy/result", {
			...resultEntity,
			sha: parameters.sha,
			name: parameters.name || ctx.skill.name,
			title: parameters.title,
			message,
			state,
			severity,
			lastUpdated: new Date(),
		});
		await ctx.datalog.transact([ownerEntity, resultEntity]);
		terminated = true;
	};

	ctx.onComplete(async () => {
		if (!terminated) {
			await update(ResultEntityState.Failure)(
				"Policy failed to complete",
				ResultEntitySeverity.High,
			);
		}
	});

	return {
		failed: (severity, msg) =>
			update(ResultEntityState.Failure)(msg, severity),
		actionRequired: (severity, msg) =>
			update(ResultEntityState.ActionRequired)(msg, severity),
		neutral: msg => update(ResultEntityState.Neutral)(msg),
		success: msg => update(ResultEntityState.Success)(msg),
	};
}
