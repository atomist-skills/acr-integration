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

export interface Option {
	value: string;
	description?: string;
}

/**
 * Represents a selection of exactly one or some strings from a fixed list of options
 */
export interface Options {
	/**
	 * Whether the user must select exactly one option. In this case,
	 * binds to string. Otherwise binds to string[]
	 */
	kind?: "single" | "multiple";

	/**
	 * Possible options to select from
	 */
	options?: Option[];
}

export interface BaseParameter {
	readonly pattern?: RegExp;
	readonly required?: boolean;
	readonly description?: string;
	readonly displayName?: string;
	readonly validInput?: string;
	readonly displayable?: boolean;
	readonly maxLength?: number;
	readonly minLength?: number;
	readonly type?: "string" | "number" | "boolean" | Options;
	readonly order?: number;
	readonly control?: "input" | "textarea";
}

/**
 * Interface mixed in with BaseParameter to allow adding a default value to a parameter.
 * When the class-style decorated approach is used, this is unnecessary as any field
 * value will be used as a default.
 */
export interface HasDefaultValue {
	defaultValue?: any;
}

export type ParameterObjectValue = BaseParameter & HasDefaultValue;
