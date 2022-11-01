import { ChevronDownIcon } from "@primer/octicons-react";
import styled, { css, x } from "@xstyled/styled-components";
import {
  Menu as HeadlessMenu,
  MenuButton as HeadlessMenuButton,
  MenuButtonArrow as HeadlessMenuButtonArrow,
  MenuItem as HeadlessMenuItem,
  MenuSeparator as HeadlessMenuSeparator,
  useMenuState,
} from "ariakit/menu";
import { forwardRef } from "react";

import { Icon } from "./Icon";

export { useMenuState };

export {
  HeadlessMenu,
  HeadlessMenuItem,
  HeadlessMenuButton,
  HeadlessMenuSeparator,
  HeadlessMenuButtonArrow,
};

const InnerMenuButton = styled.box`
  display: flex;
  align-items: center;
  border-radius: md;
  padding: 1 2;

  &:hover {
    background-color: bg-hover;
  }

  &[aria-expanded="true"] {
    background-color: background-active;
  }

  ${(p) =>
    p.$shape === "square" &&
    css`
      padding: 1;
    `}
`;

export const MenuButton = forwardRef(({ children, shape, ...props }, ref) => {
  return (
    <HeadlessMenuButton ref={ref} {...props}>
      {(menuProps) => (
        <InnerMenuButton {...menuProps} $shape={shape}>
          {children}
        </InnerMenuButton>
      )}
    </HeadlessMenuButton>
  );
});

export const MenuButtonArrow = ({ as, ...props }) => {
  return (
    <HeadlessMenuButtonArrow {...props}>
      {(arrowProps) => <Icon as={ChevronDownIcon} {...arrowProps} />}
    </HeadlessMenuButtonArrow>
  );
};

export const Menu = (props) => (
  <x.menu
    as={HeadlessMenu}
    backgroundColor="bg"
    border={1}
    borderColor="border"
    borderRadius="md"
    p={1}
    minWidth="110"
    zIndex="500"
    {...props}
  />
);

export const MenuItem = ({ as, children, ...props }) => {
  return (
    <HeadlessMenuItem {...props}>
      {(menuItemProps) => (
        <x.div
          as={as}
          appearance="none"
          backgroundColor={{
            _: "transparent",
            hover: "bg-hover",
            focus: "background-focus",
          }}
          border={0}
          borderRadius="md"
          color="primary-text"
          fontSize="sm"
          w={1}
          transition="md"
          transitionProperty="background-color"
          textDecoration="none"
          display="flex"
          alignItems="center"
          gap="8px"
          p={2}
          fontWeight="semibold"
          pr={4}
          userSelect="none"
          opacity={{ '&[aria-disabled="true"]': 0.5 }}
          {...menuItemProps}
        >
          {children}
        </x.div>
      )}
    </HeadlessMenuItem>
  );
};

export const MenuSeparator = (props) => (
  <x.div
    as={HeadlessMenuSeparator}
    borderColor="border"
    my={1}
    height={0}
    borderTopWidth="1px"
    {...props}
  />
);

export const MenuText = (props) => (
  <x.div fontSize="sm" my={2} mx={2} fontWeight="semibold" pr={3} {...props} />
);

export const MenuTitle = (props) => (
  <x.div
    fontSize="sm"
    fontWeight="semibold"
    color="secondary-text"
    mx={2}
    pr={4}
    {...props}
  />
);

export const MenuIcon = (props) => <Icon size={24} w={5} h={5} {...props} />;
