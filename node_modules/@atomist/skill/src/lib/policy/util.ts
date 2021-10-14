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

import { Check, UpdateCheck } from "../github/check";
import { api } from "../github/operation";
import { EventContext, EventHandler, HandlerStatus } from "../handler/handler";
import {
	chain,
	ChainedHandler,
	cloneRef,
	createCheck,
	createRef,
	CreateRepositoryId,
} from "../handler/util";
import { SubscriptionIncoming } from "../payload";
import { CloneOptions } from "../project/clone";
import { Project } from "../project/project";
import { AuthenticatedRepositoryId } from "../repository/id";
import { failure, success } from "../status";
import { isStaging } from "../util";
import { markdownLink } from "./badge";
import {
	pending,
	PolicyRun,
	ResultEntitySeverity,
	ResultEntityState,
} from "./result";

export type CreatePolicyRun<D, C> = (
	ctx: EventContext<D, C>,
) => { name?: string; title: string };

export function createPolicyRun<D, C>(
	options: { name?: string; title: string } | CreatePolicyRun<D, C>,
): ChainedHandler<
	D,
	C,
	{ id?: AuthenticatedRepositoryId<any>; policy?: PolicyRun }
> {
	return async ctx => {
		if (!ctx.chain.id) {
			return failure(
				"'id' missing in chain. Make sure to include 'createRef' in handler chain",
			);
		}
		const optsToUse =
			typeof options === "function" ? options(ctx) : options;
		ctx.chain.policy = await pending(ctx as any, {
			sha: ctx.chain.id.sha,
			...optsToUse,
		});
		return undefined;
	};
}

export interface PolicyDetails {
	name: string;
	title: string;
	body: string;
}

function createDetails<D, C>(
	options: (ctx: EventContext<D, C>) => PolicyDetails,
): ChainedHandler<D, C, { details?: PolicyDetails }> {
	return async ctx => {
		ctx.chain.details = options(ctx as any);
	};
}

export function handler<S, C>(parameters: {
	when?: (ctx: EventContext<S, C>) => HandlerStatus | undefined;
	id: CreateRepositoryId<S, C>;
	clone?: (ctx: EventContext<S, C>) => CloneOptions | boolean;
	details: (
		ctx: EventContext<S, C>,
	) => {
		name: string;
		title: string;
		body: string;
	};
	execute: (
		ctx: EventContext<S, C> & {
			chain: {
				id: AuthenticatedRepositoryId<any>;
				details: PolicyDetails;
				policy: PolicyRun;
				check: Check;
				project?: Project;
			};
		},
	) => Promise<{
		state: ResultEntityState;
		severity?: ResultEntitySeverity;
		message?: string;
		body?: string;
		annotations?: UpdateCheck["annotations"];
		actions?: UpdateCheck["actions"];
		status: HandlerStatus;
	}>;
}): EventHandler<S, C> {
	return chain<
		S,
		C,
		{
			id: AuthenticatedRepositoryId<any>;
			details: PolicyDetails;
			check: Check;
			policy: PolicyRun;
			project?: Project;
		}
	>(
		async ctx => {
			if (parameters.when) {
				return parameters.when(ctx);
			}
			return undefined;
		},
		createRef<S, C>(parameters.id),
		async ctx => {
			if (parameters.clone) {
				try {
					if (typeof parameters.clone === "function") {
						await cloneRef(parameters.clone(ctx) as any)(ctx);
					} else {
						await cloneRef()(ctx);
					}
				} catch (e) {
					return success(
						`Failed to clone ${ctx.chain.id.owner}/${
							ctx.chain.id.repo
						}#${
							ctx.chain.id.sha?.slice(0, 7) || ctx.chain.id.branch
						}`,
					).hidden();
				}
			}
			return undefined;
		},
		createDetails<S, C>(parameters.details),
		async ctx => {
			const app = isStaging() ? "atomista" : "atomist";
			const tx = (ctx.trigger as SubscriptionIncoming).subscription.tx;
			const checks = (
				await api(ctx.chain.id).checks.listForRef({
					owner: ctx.chain.id.owner,
					repo: ctx.chain.id.repo,
					ref: ctx.chain.id.sha,
					check_name: ctx.chain.details.name,
					filter: "latest",
				})
			).data;
			if (
				checks.check_runs
					.filter(c => c.app.slug === app)
					.filter(c => !isNaN(+c.external_id))
					.some(c => +c.external_id > tx)
			) {
				return success(
					"Skipping execution of outdated subscription result",
				).hidden();
			}
			return undefined;
		},
		createCheck<S, C>(async (ctx: any) => ({
			name: ctx.chain.details.name,
			title: ctx.chain.details.title,
			body: `${await markdownLink({
				sha: ctx.chain.id.sha,
				workspace: ctx.workspaceId,
				name: ctx.chain.details.name,
				title: ctx.chain.details.title,
				state: ResultEntityState.Pending,
			})}\n\n${
				ctx.chain.details.body ? `\n\n${ctx.chain.details.body}` : ""
			}`,
		})),
		createPolicyRun<S, C>((ctx: any) => ({
			name: ctx.chain.details.name,
			title: ctx.chain.details.title,
		})),
		async ctx => {
			const result = await parameters.execute(ctx);

			let conclusion;
			switch (result.state) {
				case ResultEntityState.Success:
					conclusion = "success";
					break;
				case ResultEntityState.ActionRequired:
					conclusion = "action_required";
					break;
				case ResultEntityState.Failure:
					conclusion = "failure";
					break;
				case ResultEntityState.Neutral:
					conclusion = "neutral";
					break;
			}

			const body = `${await markdownLink({
				sha: ctx.chain.id.sha,
				workspace: ctx.workspaceId,
				name: ctx.chain.details.name,
				title: ctx.chain.details.title,
				state: result.state,
				severity: result.severity,
			})}${result.body ? `\n\n${result.body}` : ""}`;

			await ctx.chain.check.update({
				conclusion,
				body,
				annotations: result.annotations,
				actions: result.actions,
			});
			switch (result.state) {
				case ResultEntityState.Success:
					await ctx.chain.policy.success(result.body);
					break;
				case ResultEntityState.ActionRequired:
					await ctx.chain.policy.actionRequired(
						result.severity,
						result.body,
					);
					break;
				case ResultEntityState.Failure:
					await ctx.chain.policy.failed(result.severity, result.body);
					break;
				case ResultEntityState.Neutral:
					await ctx.chain.policy.neutral(result.body);
					break;
			}

			return result.status;
		},
	) as EventHandler<S, C>;
}
