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

import { Action } from "@atomist/slack-messages";
import { flatten } from "flat";

import { CommandReferencingAction } from "../message";
import merge = require("lodash.merge");
import forOwn = require("lodash.forown");

export type ParameterIndexType = string;
export type ParameterType = {
	[key in ParameterIndexType]?: number | boolean | string | ParameterType;
};

/**
 * Create a slack button that invokes a command handler.
 */
export function buttonForCommand(
	buttonSpec: ButtonSpecification,
	command: string,
	parameters: ParameterType = {},
): Action {
	const params = mergeParameters(command, parameters);
	const id = command.toLocaleLowerCase();
	const action = chatButtonFrom(buttonSpec, {
		id,
	}) as CommandReferencingAction;
	action.command = {
		id,
		name: command,
		parameters: params,
	};
	return action;
}

/**
 * Create a Slack menu that invokes a command handler.
 */
export function menuForCommand(
	selectSpec: MenuSpecification,
	command: string,
	parameterName: string,
	parameters: ParameterType = {},
): Action {
	const params = mergeParameters(command, parameters);
	const id = command.toLocaleLowerCase();
	const action = chatMenuFrom(selectSpec, {
		id,
		parameterName,
	}) as CommandReferencingAction;
	action.command = {
		id,
		name: command,
		parameters: params,
		parameterName,
	};
	return action;
}

/**
 * Merge the provided parameters into any parameters provided as
 * command object instance variables.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function mergeParameters(command: any, parameters: any): any {
	// Reuse parameters defined on the instance
	if (typeof command !== "string" && typeof command !== "function") {
		const newParameters = merge(command, parameters);
		return flatten(newParameters);
	}
	return flatten(parameters);
}

function chatButtonFrom(action: ButtonSpecification, command: any): Action {
	if (!command.id) {
		throw new Error(`Please provide a valid non-empty command id`);
	}
	const button: Action = {
		text: action.text,
		type: "button",
		name: `automation-command::${command.id}`,
	};
	forOwn(action, (v, k) => {
		(button as any)[k] = v;
	});
	return button;
}

function chatMenuFrom(action: MenuSpecification, command: any): Action {
	if (!command.id) {
		throw new Error("SelectableIdentifiableInstruction must have id set");
	}

	if (!command.parameterName) {
		throw new Error(
			"SelectableIdentifiableInstruction must have parameterName set",
		);
	}

	const select: Action = {
		text: action.text,
		type: "select",
		name: `automation-command::${command.id}`,
	};

	if (typeof action.options === "string") {
		select.data_source = action.options;
	} else if (action.options.length > 0) {
		const first = action.options[0] as any;
		if (first.value) {
			// then it's normal options
			select.options = action.options as SelectOption[];
		} else {
			// then it's option groups
			select.option_groups = action.options as OptionGroup[];
		}
	}

	forOwn(action, (v, k) => {
		if (k !== "options") {
			(select as any)[k] = v;
		}
	});
	return select;
}

export interface ActionConfirmation {
	title?: string;
	text: string;
	ok_text?: string;
	dismiss_text?: string;
}

export interface ButtonSpecification {
	text: string;
	style?: string;
	confirm?: ActionConfirmation;
	role?: string;
}

export interface SelectOption {
	text: string;
	value: string;
}

export interface OptionGroup {
	text: string;
	options: SelectOption[];
}

export type DataSource =
	| "static"
	| "users"
	| "channels"
	| "conversations"
	| "external";

export interface MenuSpecification {
	text: string;
	options: SelectOption[] | DataSource | OptionGroup[];
	role?: string;
}
