/* eslint-disable react/no-unescaped-entities */
import { RepoIcon } from "@primer/octicons-react";
import { gql } from "graphql-tag";
import { useParams } from "react-router-dom";

import {
  BaseLink,
  Icon,
  Link,
  Loader,
  Menu,
  MenuButton,
  MenuButtonArrow,
  MenuItem,
  MenuSeparator,
  MenuText,
  MenuTitle,
  useMenuState,
} from "@/components";
import { Query } from "@/containers/Apollo";

const OWNER_REPOSITORIES_QUERY = gql`
  query OWNER_REPOSITORIES_QUERY($login: String!) {
    owner(login: $login) {
      id
      repositories(enabled: true) {
        id
        name
      }
    }
  }
`;

export function RepositoryBreadcrumbMenu({ ...props }) {
  const { ownerLogin } = useParams();
  const menu = useMenuState({ placement: "bottom", gutter: 4 });

  return (
    <>
      <MenuButton state={menu} shape="square" {...props}>
        <MenuButtonArrow />
      </MenuButton>

      <Menu aria-label="Repositories" state={menu}>
        <MenuTitle>Repositories</MenuTitle>
        <MenuSeparator />
        {menu.open && (
          <Query
            query={OWNER_REPOSITORIES_QUERY}
            variables={{ login: ownerLogin }}
            fallback={<Loader />}
          >
            {(data) => {
              const repositoryLogins =
                data.owner?.repositories
                  .map(({ name }) => name)
                  .sort((repoA, repoB) => repoA.localeCompare(repoB)) ?? [];

              if (repositoryLogins.length === 0) {
                return <MenuText>No active repository found</MenuText>;
              }

              return repositoryLogins.map((repositoryLogin) => (
                <MenuItem
                  key={repositoryLogin}
                  state={menu}
                  as={BaseLink}
                  to={`${ownerLogin}/${repositoryLogin}`}
                  minWidth="200px"
                >
                  <Icon as={RepoIcon} w={5} h={5} mt={1} />
                  {repositoryLogin}
                </MenuItem>
              ));
            }}
          </Query>
        )}

        <MenuSeparator />
        <MenuText>
          Don't see your repo?
          <br />
          <Link to={`/${ownerLogin}`}>Be sure to activate it →</Link>
        </MenuText>
      </Menu>
    </>
  );
}
