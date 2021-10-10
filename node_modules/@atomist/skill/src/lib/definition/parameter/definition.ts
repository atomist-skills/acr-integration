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

import {
	ParameterType,
	RepoFilterParameter,
	SingleChoiceParameter,
	StringArrayParameter,
} from "../skill";

export function repoFilter(
	options: { required?: boolean } = { required: true },
): RepoFilterParameter {
	return {
		type: ParameterType.RepoFilter,
		displayName: "Which repositories",
		description: "",
		required: options.required !== undefined ? options.required : true,
	};
}

export function refFilter(
	options: { required?: boolean; description?: string } = { required: false },
): StringArrayParameter {
	return {
		type: ParameterType.StringArray,
		displayName: "Branch and tag filter",
		description: options.description
			? options.description
			: "Restrict skill execution to certain branches or tags (use regular expressions)",
		required: options.required !== undefined ? options.required : false,
	};
}

/**
 * How to push changes back to a repository. The follow values are
 * available:
 *
 * -   _`pr_default_commit`_: create a pull request if acting on default branch,
 *     commit directly to non-default branch
 * -   _`pr_default`_: create a pull request if acting on default branch
 * -   _`pr`_: create a pull request
 * -   _`commit_default`_: commit directly to default branch
 * -   _`commit`_: commit directly to branch
 */
export type PushStrategy =
	| "pr_default_commit"
	| "pr_default"
	| "pr"
	| "commit_default"
	| "commit";

export function pushStrategy(options: {
	displayName: string;
	description: string;
	required?: boolean;
	defaultValue?: string;
	options?: SingleChoiceParameter["options"];
}): SingleChoiceParameter {
	return {
		type: ParameterType.SingleChoice,
		displayName: options.displayName,
		description: options.description,
		defaultValue: options.defaultValue
			? options.defaultValue
			: "pr_default_commit",
		options: [
			{
				text:
					"Raise pull request for default branch; commit to other branches",
				value: "pr_default_commit",
			},
			{
				text: "Raise pull request for default branch only",
				value: "pr_default",
			},
			{
				text: "Raise pull request for any branch",
				value: "pr",
			},
			{
				text: "Commit to default branch only",
				value: "commit_default",
			},
			{
				text: "Commit to any branch",
				value: "commit",
			},
			...(options.options || []),
		],
		required: options.required !== undefined ? options.required : false,
	};
}
