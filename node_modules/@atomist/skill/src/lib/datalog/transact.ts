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

import { PubSub } from "@google-cloud/pubsub";
import { toEDNStringFromSimpleObject } from "edn-data";

import { debug, error } from "../log/console";
import { replacer, toArray } from "../util";

export type DatalogTransact = (entities: any | any[]) => Promise<void>;

export function createTransact(
	workspaceId: string,
	correlationId: string,
	skillId: string,
): DatalogTransact {
	const topicName =
		process.env.ATOMIST_TOPIC || `${workspaceId}-${skillId}-response`;
	let topic;
	return async entities => {
		const invalidEntities = toArray(entities).filter(e =>
			Object.values(e).some(v => v === undefined),
		);
		if (invalidEntities.length > 0) {
			debug(
				`Entities with 'undefined' properties detected: ${JSON.stringify(
					invalidEntities,
				)}`,
			);
			throw new Error("Entities with 'undefined' properties detected");
		}

		const message = {
			api_version: "1",
			correlation_id: correlationId,
			team: {
				id: workspaceId,
			},
			type: "facts_ingestion",
			entities: toEDNStringFromSimpleObject(toArray(entities)).replace(
				/":(.*?)"/gm,
				":$1",
			),
		};

		try {
			debug(`Sending message: ${JSON.stringify(message, replacer)}`);
			if (!topic) {
				topic = new PubSub().topic(topicName, {
					messageOrdering: true,
				});
			}
			const messageBuffer = Buffer.from(JSON.stringify(message), "utf8");
			await topic.publishMessage({
				data: messageBuffer,
				orderingKey: correlationId,
			});
		} catch (err) {
			error(`Error occurred sending message: ${err.message}`);
		}
	};
}
