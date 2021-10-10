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

import { Attachment, SlackMessage, url } from "@atomist/slack-messages";

import { Contextual } from "../handler/handler";
import { url as lurl } from "../log/util";
import { guid } from "../util";

export function successMessage(
	title: string,
	text: string,
	ctx: Contextual<any, any>,
	options: Partial<Attachment> = {},
): SlackMessage {
	const msg: SlackMessage = {
		attachments: [
			{
				author_icon: `https://images.atomist.com/rug/check-circle.gif?gif=${guid()}`,
				author_name: title,
				author_link: lurl(ctx),
				text,
				fallback: text,
				color: "#37A745",
				mrkdwn_in: ["text"],
				footer: footer(ctx),
				footer_icon:
					"https://images.atomist.com/logo/atomist-black-mark-xsmall.png",
				ts: ts(),
				...options,
			},
		],
	};
	return msg;
}

export function questionMessage(
	title: string,
	text: string,
	ctx: Contextual<any, any>,
	options: Partial<Attachment> = {},
): SlackMessage {
	const msg: SlackMessage = {
		attachments: [
			{
				author_icon: `https://images.atomist.com/rug/question.png`,
				author_name: title,
				author_link: lurl(ctx),
				text,
				fallback: text,
				color: "#B5B5B5",
				mrkdwn_in: ["text"],
				footer: footer(ctx),
				footer_icon:
					"https://images.atomist.com/logo/atomist-black-mark-xsmall.png",
				ts: ts(),
				...options,
			},
		],
	};
	return msg;
}

export function infoMessage(
	title: string,
	text: string,
	ctx: Contextual<any, any>,
	options: Partial<Attachment> = {},
): SlackMessage {
	const msg: SlackMessage = {
		attachments: [
			{
				author_icon: `https://images.atomist.com/rug/info.png`,
				author_name: title,
				author_link: lurl(ctx),
				text,
				fallback: text,
				color: "#B5B5B5",
				mrkdwn_in: ["text"],
				footer: footer(ctx),
				footer_icon:
					"https://images.atomist.com/logo/atomist-black-mark-xsmall.png",
				ts: ts(),
				...options,
			},
		],
	};
	return msg;
}

export function warningMessage(
	title: string,
	text: string,
	ctx: Contextual<any, any>,
	options: Partial<Attachment> = {},
): SlackMessage {
	const msg: SlackMessage = {
		attachments: [
			{
				author_icon: `https://images.atomist.com/rug/warning-yellow.png`,
				author_name: title,
				author_link: lurl(ctx),
				text,
				fallback: text,
				color: "#D7B958",
				mrkdwn_in: ["text"],
				footer: supportLink(ctx),
				footer_icon:
					"https://images.atomist.com/logo/atomist-black-mark-xsmall.png",
				ts: ts(),
				...options,
			},
		],
	};
	return msg;
}

export function errorMessage(
	title: string,
	text: string,
	ctx: Contextual<any, any>,
	options: Partial<Attachment> = {},
): SlackMessage {
	const msg: SlackMessage = {
		attachments: [
			{
				author_icon: "https://images.atomist.com/rug/error-circle.png",
				author_name: title,
				author_link: lurl(ctx),
				text,
				fallback: text,
				color: "#BC3D33",
				mrkdwn_in: ["text"],
				footer: supportLink(ctx),
				footer_icon:
					"https://images.atomist.com/logo/atomist-black-mark-xsmall.png",
				ts: ts(),
				...options,
			},
		],
	};
	return msg;
}

export function progressMessage(
	title: string,
	text: string,
	progress: {
		state:
			| "canceled"
			| "stopped"
			| "in_process"
			| "requested"
			| "planned"
			| "failure"
			| "waiting_for_approval"
			| "approved"
			| "waiting_for_pre_approval"
			| "pre_approved"
			| "success";
		color?: string;
		counter?: boolean;
		status?: boolean;
		image?: boolean;
		total: number;
		count: number;
	},
	ctx: Contextual<any, any>,
	options: Partial<Attachment> = {},
): SlackMessage {
	let color;
	switch (progress.state) {
		case "canceled":
			color = progress.color || "#B5B5B5";
			break;
		case "stopped":
			color = progress.color || "#D7B958";
			break;
		case "in_process":
			color = progress.color || "#2A7D7D";
			break;
		case "requested":
		case "planned":
			color = progress.color || "#D7B958";
			break;
		case "failure":
			color = progress.color || "#BC3D33";
			break;
		case "waiting_for_approval":
		case "approved":
			color = progress.color || "#D7B958";
			break;
		case "waiting_for_pre_approval":
		case "pre_approved":
			color = progress.color || "#D7B958";
			break;
		default:
			color = progress.color || "#37A745";
			break;
	}
	const params = [];
	if (progress.counter === false) {
		params.push("counter=no");
	}
	if (progress.status === false) {
		params.push("status=no");
	}
	if (progress.image === false) {
		params.push("image=no");
	}
	if (progress.color) {
		params.push(`color=${progress.color}`);
	}
	const slackMsg: SlackMessage = {
		attachments: [
			{
				mrkdwn_in: ["text"],
				fallback: title,
				title,
				title_link: lurl(ctx),
				text,
				thumb_url: `https://badge.atomist.com/v2/progress/${
					progress.state
				}/${progress.count}/${progress.total}${
					params.length > 0 ? `?${params.join("&")}` : ""
				}`,
				color,
				footer: footer(ctx),
				footer_icon:
					"https://images.atomist.com/logo/atomist-black-mark-xsmall.png",
				ts: ts(),
				...(options || {}),
			},
		],
	};
	return slackMsg;
}

export function supportLink(ctx: Contextual<any, any>): string {
	const supportUrl = `https://atomist.typeform.com/to/yvnyOj?message_id=${Buffer.from(
		ctx.correlationId,
	).toString("base64")}`;
	return `${footer(ctx)} \u00B7 ${url(supportUrl, "Support")}`;
}

export function footer(ctx: Contextual<any, any>): string {
	return `${ctx.skill.namespace}/${ctx.skill.name}`;
}

export function ts(): number {
	return Math.floor(Date.now() / 1000);
}

export function separator(): string {
	return "\u00B7";
}
