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

import * as fs from "fs-extra";
import gql from "graphql-tag";
import * as path from "path";
import * as p from "path";

const FragmentExpression = /\.\.\.\s*([_A-Za-z][_0-9A-Za-z]*)/gi;

export function inlineFragments(q: string, cwd: string): string {
	const fragmentDir = path.join(cwd, "fragment");
	if (!fs.pathExistsSync(fragmentDir)) {
		return q;
	}
	if (FragmentExpression.test(q)) {
		// Load all fragments
		const fragments = fs
			.readdirSync(fragmentDir)
			.filter(f => f.endsWith(".graphql"))
			.map(f => {
				const content = fs
					.readFileSync(p.join(fragmentDir, f))
					.toString();
				const graphql = gql(content);
				return {
					name: (graphql.definitions[0] as any).name.value,
					kind: graphql.definitions[0].kind,
					body: content.slice(
						content.indexOf("{") + 1,
						content.lastIndexOf("}") - 1,
					),
				};
			})
			.filter(f => f.kind === "FragmentDefinition");

		FragmentExpression.lastIndex = 0;
		let result;

		while ((result = FragmentExpression.exec(q))) {
			const fragment = fragments.find(f => f.name === result[1]);
			if (fragment) {
				q = replace(q, result[0], fragment.body);
			}
		}
	}
	return q;
}

function replace(q: string, key: string, value: string): string {
	return q.replace(new RegExp(`${key}\\b`, "g"), value);
}
