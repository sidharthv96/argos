import { memo } from "react";

import { BuildStatusDescription } from "@/containers/BuildStatusDescription";
import { DocumentType, FragmentType, graphql, useFragment } from "@/gql";

import { BuildDetail } from "./BuildDetail";
import { BuildDiffProvider } from "./BuildDiffState";
import { BuildParams } from "./BuildParams";
import { BuildSidebar } from "./BuildSidebar";
import { BuildOrphanDialog } from "./BuildOrphanDialog";
import { Progress } from "@/ui/Progress";

const BuildFragment = graphql(`
  fragment BuildWorkspace_Build on Build {
    ...BuildSidebar_Build
    ...BuildStatusDescription_Build
    ...BuildDetail_Build
    status
    type
    stats {
      total
      failure
      changed
      added
      removed
      unchanged
    }
    parallel {
      total
      received
      nonce
    }
  }
`);

const ProjectFragment = graphql(`
  fragment BuildWorkspace_Project on Project {
    ...BuildStatusDescription_Project
    referenceBranch
    slug
    repository {
      id
      url
    }
  }
`);

const BuildProgress = memo(
  ({
    parallel,
  }: {
    parallel: DocumentType<typeof BuildFragment>["parallel"];
  }) => {
    return (
      <div className="flex flex-1 flex-col items-center gap-10 p-10">
        <div className="text-4xl">Your build is cooking...</div>
        <div>
          <div className="egg-loader" data-visual-test="transparent" />
        </div>
        {parallel && (
          <div className="w-80">
            <Progress
              className="mb-2"
              value={parallel.received}
              max={parallel.total}
              min={0}
            />
            <div className="flex justify-between tabular-nums font-medium mb-0.5">
              <div>{parallel.received} batches</div>
              <div className="text-low">/ {parallel.total}</div>
            </div>
            <div className="text-low text-xs mb-1 font-mono">
              {parallel.nonce}
            </div>
          </div>
        )}
      </div>
    );
  },
);

export const BuildWorkspace = (props: {
  params: BuildParams;
  build: FragmentType<typeof BuildFragment>;
  project: FragmentType<typeof ProjectFragment>;
}) => {
  const build = useFragment(BuildFragment, props.build);
  const project = useFragment(ProjectFragment, props.project);
  const repoUrl = project.repository?.url ?? null;

  switch (build.status) {
    case "aborted":
    case "error":
    case "expired":
      return (
        <div className="flex-1 p-10 text-center text-xl">
          <BuildStatusDescription build={build} project={project} />
        </div>
      );
    case "pending":
    case "progress":
      return <BuildProgress parallel={build.parallel} />;
    default:
      return (
        <BuildDiffProvider params={props.params} stats={build?.stats ?? null}>
          <div className="flex min-h-0 flex-1">
            <BuildSidebar build={build} repoUrl={repoUrl} />
            {build ? (
              <>
                <BuildDetail build={build} repoUrl={repoUrl} />
                {build.type === "orphan" ? (
                  <BuildOrphanDialog
                    referenceBranch={project.referenceBranch}
                    projectSlug={project.slug}
                  />
                ) : null}
              </>
            ) : null}
          </div>
        </BuildDiffProvider>
      );
  }
};
