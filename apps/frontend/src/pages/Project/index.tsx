import { useSuspenseQuery } from "@apollo/client";
import { Outlet, useOutletContext, useParams } from "react-router-dom";

import { useVisitAccount } from "@/containers/AccountHistory";
import { PaymentBanner } from "@/containers/PaymentBanner";
import { DocumentType, graphql } from "@/gql";
import { ProjectPermission } from "@/gql/graphql";
import {
  TabLink,
  TabLinkList,
  TabLinkPanel,
  useTabLinkState,
} from "@/ui/TabLink";

import { NotFound } from "../NotFound";

const ProjectQuery = graphql(`
  query Project_project($accountSlug: String!, $projectName: String!) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      permissions
      account {
        id
        ...PaymentBanner_Account
      }
    }
  }
`);

type Account = NonNullable<
  NonNullable<DocumentType<typeof ProjectQuery>["project"]>["account"]
>;

const ProjectTabs = ({
  permissions,
  account,
}: {
  permissions: ProjectPermission[];
  account: Account;
}) => {
  const tab = useTabLinkState();
  return (
    <>
      <TabLinkList state={tab} aria-label="Sections">
        <TabLink to="">Builds</TabLink>
        {permissions.includes(ProjectPermission.ViewSettings) && (
          <TabLink to="settings">Project Settings</TabLink>
        )}
      </TabLinkList>
      <hr className="border-t" />
      <PaymentBanner account={account} />
      <TabLinkPanel
        state={tab}
        tabId={tab.selectedId || null}
        className="flex min-h-0 flex-1 flex-col"
      >
        <Outlet context={{ permissions } as OutletContext} />
      </TabLinkPanel>
    </>
  );
};

interface OutletContext {
  permissions: ProjectPermission[];
}

export function useProjectContext() {
  return useOutletContext<OutletContext>();
}

function Project({
  accountSlug,
  projectName,
}: {
  accountSlug: string;
  projectName: string;
}) {
  const {
    data: { project },
  } = useSuspenseQuery(ProjectQuery, {
    variables: { accountSlug, projectName },
  });

  if (!project) {
    return <NotFound />;
  }

  if (!project.permissions.includes(ProjectPermission.View)) {
    return <NotFound />;
  }

  if (project.permissions.includes(ProjectPermission.ViewSettings)) {
    return (
      <ProjectTabs
        permissions={project.permissions}
        account={project.account}
      />
    );
  }

  return (
    <Outlet context={{ permissions: project.permissions } as OutletContext} />
  );
}

/** @route */
export function Component() {
  const { accountSlug, projectName } = useParams();
  useVisitAccount(accountSlug ?? null);
  if (!accountSlug || !projectName) {
    return <NotFound />;
  }
  return <Project accountSlug={accountSlug} projectName={projectName} />;
}
