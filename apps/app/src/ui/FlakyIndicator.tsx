import {
  BugAntIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/20/solid";
import moment from "moment";
import { Fragment } from "react";
import { Link } from "react-router-dom";

import { Test } from "@/gql/graphql";

import { Chip } from "./Chip";
import { MagicTooltip } from "./Tooltip";

export const getFlakyIndicatorProps = (
  test: Pick<Test, "status" | "unstable" | "resolvedDate">
) => {
  const { status, unstable, resolvedDate } = test;

  switch (status) {
    case "pending":
      return unstable
        ? {
            label: "Test unstable",
            color: "neutral" as const,
            icon: ExclamationTriangleIcon,
            tooltip:
              "High instability and potential flakiness detected in the past 7 days",
          }
        : { label: null, color: "neutral" as const, icon: null };

    case "flaky":
      return {
        label: "Flaky",
        color: "warning" as const,
        icon: BugAntIcon,
        tooltip: "Unreliable test that may have false positives",
      };

    case "resolved":
      return {
        label: "Resolved",
        color: "success" as const,
        icon: CheckCircleIcon,
        tooltip: `This test has been resolved and its stability score reset${
          resolvedDate ? ` on: ${moment(resolvedDate).format("LLL")}` : ""
        }`,
      };

    default:
      throw new Error(`Invalid test status: ${status}`);
  }
};

export const FlakyChip = ({
  test,
  className,
  link,
}: {
  test: Pick<Test, "status" | "unstable" | "resolvedDate"> | null;
  className?: string;
  link?: string | null;
}) => {
  const ConditionalLink = (props: any) =>
    link ? <Link to={link} {...props} /> : <Fragment {...props} />;

  if (!test || !test.status) {
    return null;
  }

  const { label, color, icon: Icon, tooltip } = getFlakyIndicatorProps(test);
  if (!label) {
    return null;
  }

  return (
    <MagicTooltip tooltip={tooltip}>
      <div className={className}>
        <ConditionalLink>
          <Chip icon={Icon} color={color} scale="sm">
            {label}
          </Chip>
        </ConditionalLink>
      </div>
    </MagicTooltip>
  );
};