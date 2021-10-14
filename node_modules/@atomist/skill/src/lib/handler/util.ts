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

import { Check, CreateCheck, createCheck as raiseCheck } from "../github/check";
import { CloneOptions } from "../project/clone";
import { Project } from "../project/project";
import {
	AuthenticatedRepositoryId,
	gitHubComRepository,
	RepositoryId,
} from "../repository/id";
import { gitHubAppToken } from "../secret/resolver";
import { failure } from "../status";
import { EventContext, EventHandler, HandlerStatus } from "./handler";

export type ChainedHandler<D, C, S> = (
	context: EventContext<D, C> & { chain: S },
) => Promise<void | HandlerStatus>;

/**
 * Chain a series of [[ChainedHandler]]s until the first one
 * returns a [[HandlerStatus]].
 */
export function chain<D, C, S = any>(
	...handlers: Array<ChainedHandler<D, C, S>>
): EventHandler<D, C> {
	return async (ctx: EventContext<D, C> & { chain: S }) => {
		ctx.chain = {} as any;
		for (const handler of handlers) {
			const result = await handler(ctx);
			if (result) {
				return result;
			}
		}
		return undefined;
	};
}

export type CreateRepositoryId<D, C> = (
	ctx: EventContext<D, C>,
) => Pick<RepositoryId, "owner" | "repo" | "sha" | "branch">;

export function createRef<D, C>(
	id: CreateRepositoryId<D, C>,
): ChainedHandler<D, C, { id?: AuthenticatedRepositoryId<any> }> {
	return async ctx => {
		const repositoryId: AuthenticatedRepositoryId<any> =
			typeof id === "function" ? id(ctx) : (id as any);
		if (!repositoryId.credential) {
			const credential = await ctx.credential.resolve(
				gitHubAppToken(repositoryId),
			);
			ctx.chain.id = gitHubComRepository({ ...repositoryId, credential });
		} else {
			ctx.chain.id = gitHubComRepository({ ...repositoryId });
		}
	};
}

export type CreateCloneOptions<D, C> = (
	ctx: EventContext<D, C>,
) => CloneOptions;

export function cloneRef<D, C>(
	options?: CloneOptions | CreateCloneOptions<D, C>,
): ChainedHandler<
	D,
	C,
	{ id?: AuthenticatedRepositoryId<any>; project?: Project }
> {
	return async ctx => {
		if (!ctx.chain.id) {
			return failure(
				"'id' missing in chain. Make sure to include 'createRef' in handler chain",
			);
		}
		ctx.chain.project = await ctx.project.clone(
			ctx.chain.id,
			typeof options === "function" ? options(ctx) : options,
		);
		return undefined;
	};
}

export type CreateCheckOptions<D, C> = (
	ctx: EventContext<D, C>,
) => Omit<CreateCheck, "sha"> | Promise<Omit<CreateCheck, "sha">>;

export function createCheck<D, C>(
	options: Omit<CreateCheck, "sha"> | CreateCheckOptions<D, C>,
): ChainedHandler<
	D,
	C,
	{ id?: AuthenticatedRepositoryId<any>; check?: Check }
> {
	return async ctx => {
		if (!ctx.chain.id) {
			return failure(
				"'id' missing in chain. Make sure to include 'createRef' in handler chain",
			);
		}
		const optsToUse =
			typeof options === "function" ? await options(ctx) : options;
		ctx.chain.check = await raiseCheck(ctx, ctx.chain.id, {
			sha: ctx.chain.id.sha,
			...optsToUse,
		});
		return undefined;
	};
}
