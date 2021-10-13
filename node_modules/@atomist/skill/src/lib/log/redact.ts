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

/**
 * Default set of regular expressions used to remove sensitive
 * information from messages and logs.  The entries are applied in
 * order, so more specific regular expressions should be placed
 * earlier in the list to avoid a shorter replacement preventing a
 * longer replacement from being applied.
 */
export const DEFAULT_REDACTION_PATTERNS = [
	{
		regexp: /\b[A-F0-9]{64}\b/g,
		replacement: "[ATOMIST_API_KEY]",
	},
	{
		regexp: /[1-9][0-9]+-[0-9a-zA-Z]{40}/g,
		replacement: "[TWITTER_ACCESS_TOKEN]",
	},
	{
		regexp: /EAACEdEose0cBA[0-9A-Za-z]+/g,
		replacement: "[FACEBOOK_ACCESS_TOKEN]",
	},
	{
		regexp: /AIza[0-9A-Za-z\-_]{35}/g,
		replacement: "[GOOGLE_API_KEY]",
	},
	{
		regexp: /[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com/g,
		replacement: "[GOOGLE_OAUTH_ID]",
	},
	{
		regexp: /sk_live_[0-9a-z]{32}/g,
		replacement: "[PICATIC_API_KEY|",
	},
	{
		regexp: /sk_live_[0-9a-zA-Z]{24}/g,
		replacement: "[STRIPE_REGULAR_API_KEY]",
	},
	{
		regexp: /rk_live_[0-9a-zA-Z]{24}/g,
		replacement: "[STRIPE_RESTRICTED_API_KEY]",
	},
	{
		regexp: /sq0atp-[0-9A-Za-z\-_]{22}/g,
		replacement: "[SQUARE_OAUTH_TOKEN]",
	},
	{
		regexp: /sq0csp-[0-9A-Za-z\-_]{43}/g,
		replacement: "[SQUARE_OAUTH_SECRET]",
	},
	{
		regexp: /access_token\$production\$[0-9a-z]{16}\$[0-9a-f]{32}/g,
		replacement: "[BRAINTREE_ACCESS_TOKEN]",
	},
	{
		regexp: /amzn\.mws\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
		replacement: "[AMAZON_AUTH_TOKEN]",
	},
	{
		regexp: /SK[0-9a-fA-F]{32}/g,
		replacement: "[TWILLIO_API_KEY]",
	},
	{
		regexp: /key-[0-9a-zA-Z]{32}/g,
		replacement: "[MAILGUN_KEY]",
	},
	{
		regexp: /[0-9a-f]{32}-us[0-9]{1,2}/g,
		replacement: "[MAILCHIMP_API_KEY]",
	},
	{
		regexp: /\bAK[0-9A-Z]{18}\b/g,
		replacement: "[AMAZON_ACCESS_KEY]",
	},
	{
		regexp: /\b(https?:\/\/)(?:v1\.)?[a-f0-9]{40}((?::x-oauth-basic)?@)/g,
		replacement: "$1[GITHUB_TOKEN]$2",
	},
	{
		// https://perishablepress.com/stop-using-unsafe-characters-in-urls/
		// https://www.ietf.org/rfc/rfc3986.txt
		regexp: /\b((?:ht|f|sm)tps?:\/\/)[^:/?#\[\]@""<>{}|\\^``\s]+:[^:/?#\[\]@""<>{}|\\^``\s]+@/g, // eslint-disable-line no-useless-escape
		replacement: "$1[USER]:[PASSWORD]@",
	},
];

export function redact(message: string): string {
	let output = message;
	DEFAULT_REDACTION_PATTERNS.forEach(r => {
		output =
			typeof output === "string"
				? output.replace(r.regexp, r.replacement)
				: output;
	});
	return output;
}
