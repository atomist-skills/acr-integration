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
	processCommand,
	processEvent,
	processWebhook,
	PubSubMessage,
} from "./function";
import {
	CommandHandler,
	EventHandler,
	WebhookHandler,
} from "./handler/handler";
import { wrapEventHandler } from "./map";
import {
	isCommandIncoming,
	isEventIncoming,
	isSubscriptionIncoming,
	isWebhookIncoming,
} from "./payload";
import { resolvePayload } from "./payload_resolve";

const HandlerRegistry = {
	events: {},
	commands: {},
	webhooks: {},
};

/**
 * Register a command handler with a certain name
 */
export function registerCommand(
	name: string,
	loader: () => Promise<CommandHandler>,
): void {
	HandlerRegistry.commands[name] = loader;
}

/**
 * Register a event handler with a certain name
 */
export function registerEvent(
	name: string,
	loader: () => Promise<EventHandler>,
): void {
	HandlerRegistry.events[name] = loader;
}

/**
 * Register a webhook handler with a certain name
 */
export function registerWebhook(
	name: string,
	loader: () => Promise<WebhookHandler>,
): void {
	HandlerRegistry.webhooks[name] = loader;
}

export const bundle = async (
	pubSubEvent: PubSubMessage,
	context: { eventId: string },
): Promise<void> => {
	const payload = await resolvePayload(pubSubEvent);

	if (isEventIncoming(payload)) {
		return processEvent(payload, context, async () => {
			const loader =
				HandlerRegistry.events[payload.extensions.operationName];
			if (loader) {
				return loader();
			} else {
				throw new Error(
					`Event handler with name '${payload.extensions.operationName}' not registered`,
				);
			}
		});
	} else if (isSubscriptionIncoming(payload)) {
		return processEvent(payload, context, async () => {
			const loader = HandlerRegistry.events[payload.subscription.name];
			if (loader) {
				return wrapEventHandler(await loader());
			} else {
				throw new Error(
					`Event handler with name '${payload.subscription.name}' not registered`,
				);
			}
		});
	} else if (isCommandIncoming(payload)) {
		return processCommand(payload, context, async () => {
			const loader = HandlerRegistry.commands[payload.command];
			if (loader) {
				return loader();
			} else {
				throw new Error(
					`Command handler with name '${payload.command}' not registered`,
				);
			}
		});
	} else if (isWebhookIncoming(payload)) {
		return processWebhook(payload, context, async () => {
			const loader =
				HandlerRegistry.webhooks[payload.webhook.parameter_name];
			if (loader) {
				return loader();
			} else {
				throw new Error(
					`Command handler with name '${payload.webhook.parameter_name}' not registered`,
				);
			}
		});
	}
};
