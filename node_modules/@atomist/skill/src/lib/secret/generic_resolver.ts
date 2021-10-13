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

import { extractConfiguration } from "../context";
import { CredentialResolver } from "./provider";

export interface GenericSecret {
	name: string;
	secret: string;
}

const SecretProviderQuery = `query SecretProvider($id: ID) {
	SecretProvider(id: $id) {
		id
		name
		credential {
		... on Password {
				secret
			}
			owner {
				login
			}
			id
		}
	}
}`;

export function genericSecret(name: string): CredentialResolver<GenericSecret> {
	return async (graph, payload): Promise<GenericSecret> => {
		const cfg = extractConfiguration(payload)?.configuration.find(
			i => !!i.resourceProviders[name],
		);
		if (cfg) {
			const id =
				cfg.resourceProviders[name].selectedResourceProviders?.[0]?.id;
			const provider = (await graph.query(SecretProviderQuery, { id }))
				.SecretProvider?.[0];
			return {
				name: provider.name,
				secret: provider.credential?.secret,
			};
		}
		return undefined;
	};
}
