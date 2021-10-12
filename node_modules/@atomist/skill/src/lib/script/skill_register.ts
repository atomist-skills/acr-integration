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

import * as fs from "fs-extra";
import * as yaml from "js-yaml";
import * as os from "os";
import * as path from "path";
import * as semver from "semver";

import { spawnPromise } from "../child_process";
import * as git from "../git";
import { createGraphQLClient, GraphQLClient } from "../graphql";
import { error, info } from "../log";
import { GoogleCloudStorageProvider } from "../storage/provider";
import { AtomistSkillInput } from "./skill_input";

export async function registerSkill(
	cwd: string,
	workspaceId?: string,
	version?: string,
	verbose?: boolean,
): Promise<void> {
	if (!verbose) {
		process.env.ATOMIST_LOG_LEVEL = "info";
	}
	info("Registering skill...");

	const w = await wid(workspaceId);
	const client = createGraphQLClient(await apiKey(), w);
	const originUrl = await spawnPromise(
		"git",
		["config", "--get", "remote.origin.url"],
		{ cwd },
	);
	const branchName = await spawnPromise(
		"git",
		["rev-parse", "--abbrev-ref", "HEAD"],
		{ cwd },
	);
	const giturl = (await import("git-url-parse"))(originUrl.stdout.trim());

	const status = await git.status(cwd);
	if (!status.isClean) {
		throw new Error(
			`Repository contains uncommitted changes. Please commit before running this command.`,
		);
	}

	const storage = new GoogleCloudStorageProvider(
		`gs://${w.toLowerCase()}-workspace-storage`,
	);
	const key = `skills/${w}/${giturl.owner}/${giturl.name}`;
	const url = `gs://${w.toLowerCase()}-workspace-storage/${key}/${
		status.sha
	}.zip`;

	const ids = await loadRepoAndBranch(client, {
		owner: giturl.owner,
		name: giturl.name,
		branch: branchName.stdout.trim(),
	});

	const content = (
		await fs.readFile(path.join(cwd, ".atomist", "skill.yaml"))
	).toString();
	const atomistYaml: { skill: AtomistSkillInput } = yaml.load(content) as any;

	if (atomistYaml?.skill?.artifacts?.gcf?.[0]) {
		atomistYaml.skill.artifacts.gcf[0].url = url;
	}

	if (version) {
		atomistYaml.skill.version = version;
	} else {
		const q = await qualifier(client, {
			owner: giturl.owner,
			name: giturl.name,
		});
		const latestTagOutput = await spawnPromise(
			"git",
			["describe", "--tags", "--abbrev=0"],
			{ cwd },
		);
		let latestTag = "0.1.0";
		if (latestTagOutput.status === 0) {
			latestTag = latestTagOutput.stdout.trim();
		}
		atomistYaml.skill.version = `${semver.major(latestTag)}.${semver.minor(
			latestTag,
		)}.${semver.patch(latestTag)}-${q}`;
	}
	atomistYaml.skill.branchId = ids.branchId;
	atomistYaml.skill.repoId = ids.repoId;
	atomistYaml.skill.commitSha = status.sha;

	await fs.writeFile(
		path.join(cwd, ".atomist", "skill.yaml"),
		yaml.dump(atomistYaml, { skipInvalid: true }),
	);

	if (await fs.pathExists(path.join(cwd, ".atomist", "skill.zip"))) {
		await storage.store(
			`${key}/${status.sha}.zip`,
			path.join(cwd, ".atomist", "skill.zip"),
		);
	}
	await storage.store(
		`${key}/${status.sha}.yaml`,
		path.join(cwd, ".atomist", "skill.yaml"),
	);

	await register(client, atomistYaml.skill);

	await spawnPromise(
		"git",
		[
			"tag",
			"-a",
			atomistYaml.skill.version,
			"-m",
			`Registered skill with version ${atomistYaml.skill.version}`,
		],
		{ cwd },
	);

	info(
		`Registered skill '${atomistYaml.skill.namespace}/${atomistYaml.skill.name}' with version '${atomistYaml.skill.version}'`,
	);
}

const BranchQuery = `query BranchForName($name: String!, $owner: String!, $branch: String!) {
  Branch(name: $branch) {
    id
    repo(name: $name, owner: $owner) @required {
      id
    }
  }
}
`;

async function loadRepoAndBranch(
	client: GraphQLClient,
	branch: { owner: string; name: string; branch: string },
): Promise<{ repoId: string; branchId: string }> {
	const result = await client.query(BranchQuery, branch);
	return {
		repoId: result.Branch[0].repo.id,
		branchId: result.Branch[0].id,
	};
}

const BuildQuery = `query BuildIdentifierForRepo(
  $owner: String!
  $name: String!
) {
  SdmBuildIdentifier {
    identifier
    id
    repo(name: [$name], owner: [$owner]) @required {
      name
      owner
      providerId
    }
  }
}
`;

const BuildMutation = `mutation StoreBuildIdentifierForRepo($identifier: String!, $name: String!, $owner: String!, $providerId: String!) {
    ingestCustomSdmBuildIdentifier(value: {identifier: $identifier, repo: {name: $name, owner: $owner, providerId: $providerId}})
}
`;

async function qualifier(
	client: GraphQLClient,
	repo: { owner: string; name: string },
): Promise<string> {
	const bi = await client.query(BuildQuery, repo);
	const count = (+bi?.SdmBuildIdentifier[0]?.identifier || 0) + 1;
	await client.mutate(BuildMutation, {
		providerId: bi?.SdmBuildIdentifier[0]?.repo?.providerId,
		name: repo.name,
		owner: repo.owner,
		identifier: count.toString(),
	});
	return count.toString();
}

const RegisterSkillMutation = `mutation RegisterSkill($skill: AtomistSkillInput!) {
    registerSkill(skill: $skill) {
		namespace
		name
		version
    }
}
`;

async function register(
	client: GraphQLClient,
	skill: AtomistSkillInput,
): Promise<void> {
	await client.mutate(RegisterSkillMutation, {
		skill,
	});
}

export async function wid(workspaceId?: string): Promise<string> {
	let w = workspaceId || process.env.ATOMIST_WORKSPACE_ID;
	if (!w) {
		const cfgPath = path.join(
			os.homedir(),
			".atomist",
			"client.config.json",
		);
		if (await fs.pathExists(cfgPath)) {
			const cfg = await fs.readJson(cfgPath);
			w = cfg.workspaceIds[0];
		}
	}
	if (!w) {
		error(
			`No workspace id provided. Please pass --workspace or set 'ATOMIST_WORKSPACE_ID'.`,
		);
	}
	return w;
}

export async function apiKey(key?: string): Promise<string> {
	let apiKey = key || process.env.ATOMIST_API_KEY;
	if (!apiKey) {
		const cfgPath = path.join(
			os.homedir(),
			".atomist",
			"client.config.json",
		);
		if (await fs.pathExists(cfgPath)) {
			const cfg = await fs.readJson(cfgPath);
			apiKey = cfg.apiKey;
		}
	}
	if (!apiKey) {
		error(`No API key provided. Please set 'ATOMIST_API_KEY'.`);
	}
	return apiKey;
}
