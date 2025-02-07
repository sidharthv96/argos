import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import { pushBuildNotification } from "@/build-notification/index.js";
import { checkIsPartialBuild } from "@/build/partial.js";
import { transaction } from "@/database/index.js";
import {
  Build,
  BuildMode,
  GithubPullRequest,
  Project,
  ScreenshotBucket,
} from "@/database/models/index.js";
import { job as githubPullRequestJob } from "@/github-pull-request/job.js";
import { getRedisLock } from "@/util/redis/index.js";
import { boom } from "@/web/util.js";

async function getOrCreatePullRequest({
  githubRepositoryId,
  number,
}: {
  githubRepositoryId: string;
  number: number;
}) {
  const lock = await getRedisLock();
  return lock.acquire(
    ["pull-request-creation", githubRepositoryId, number],
    async () => {
      const existingPr = await GithubPullRequest.query().findOne({
        githubRepositoryId,
        number,
      });

      if (existingPr) {
        return existingPr;
      }

      const pr = await GithubPullRequest.query().insertAndFetch({
        githubRepositoryId,
        number,
        jobStatus: "pending",
      });

      await githubPullRequestJob.push(pr.id);

      return pr;
    },
  );
}

export async function createBuild(params: {
  project: Project;
  commit: string;
  branch: string;
  buildName: string | null;
  parallel: { nonce: string } | null;
  prNumber: number | null;
  prHeadCommit: string | null;
  referenceCommit: string | null;
  referenceBranch: string | null;
  mode: BuildMode | null;
  ciProvider: string | null;
  argosSdk: string | null;
  runId: string | null;
  runAttempt: number | null;
}) {
  const account = await params.project.$relatedQuery("account");
  invariant(account, "Account should be fetched");

  const manager = account.$getSubscriptionManager();
  const [plan, outOfCapacityReason] = await Promise.all([
    manager.getPlan(),
    manager.checkIsOutOfCapacity(),
  ]);

  if (account.type === "team" && !plan) {
    throw boom(
      402,
      `Build rejected: subscribe to a Pro plan to use Team features.`,
    );
  }

  switch (outOfCapacityReason) {
    case null: {
      break;
    }
    case "trialing":
      throw boom(
        402,
        `You have reached the maximum screenshot capacity of your ${plan ? `${plan.displayName} Plan` : "Plan"} trial. Please upgrade your Plan.`,
      );
    case "flat-rate":
      throw boom(
        402,
        `You have reached the maximum screenshot capacity included in your ${plan ? `${plan.displayName} Plan` : "Plan"}. Please upgrade your Plan.`,
      );
    default:
      assertNever(outOfCapacityReason);
  }

  const buildName = params.buildName || "default";
  const mode = params.mode ?? "ci";

  const [pullRequest, isPartial, lock] = await Promise.all([
    (async () => {
      if (!params.prNumber) {
        return null;
      }
      const githubRepository =
        await params.project.$relatedQuery("githubRepository");
      if (!githubRepository) {
        return null;
      }
      return getOrCreatePullRequest({
        githubRepositoryId: githubRepository.id,
        number: params.prNumber,
      });
    })(),
    checkIsPartialBuild({
      ciProvider: params.ciProvider ?? null,
      project: params.project,
      runAttempt: params.runAttempt ?? null,
      runId: params.runId ?? null,
    }),
    getRedisLock(),
  ]);

  const build = await lock.acquire(
    ["create-build", params.project.id, buildName],
    async () => {
      return transaction(async (trx) => {
        const bucket = await ScreenshotBucket.query(trx).insertAndFetch({
          name: buildName,
          commit: params.commit,
          branch: params.branch,
          projectId: params.project.id,
          complete: false,
          valid: false,
          mode,
        });

        const build = await Build.query(trx).insertAndFetch({
          jobStatus: "pending" as const,
          baseScreenshotBucketId: null,
          externalId: params.parallel ? params.parallel.nonce : null,
          batchCount: params.parallel ? 0 : null,
          projectId: params.project.id,
          name: buildName,
          prNumber: params.prNumber ?? null,
          prHeadCommit: params.prHeadCommit ?? null,
          githubPullRequestId: pullRequest?.id ? String(pullRequest?.id) : null,
          referenceCommit: params.referenceCommit ?? null,
          referenceBranch: params.referenceBranch ?? null,
          compareScreenshotBucketId: bucket.id,
          mode,
          ciProvider: params.ciProvider ?? null,
          argosSdk: params.argosSdk ?? null,
          runId: params.runId ?? null,
          runAttempt: params.runAttempt ?? null,
          partial: isPartial,
        });

        return build;
      });
    },
  );

  await pushBuildNotification({
    buildId: build.id,
    type: "queued",
  });

  return build;
}
