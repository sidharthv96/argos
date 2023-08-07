import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsPointingInIcon,
  EyeIcon,
} from "@heroicons/react/20/solid";
import { clsx } from "clsx";
import { memo } from "react";

import { Test } from "@/gql/graphql";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { ColumnsIcon } from "@/ui/ColumnsIcon";
import { FlakyChip } from "@/ui/FlakyIndicator";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";
import { MuteIndicator } from "@/ui/MuteIndicator";

import { useBuildDiffFitState } from "./BuildDiffFitState";
import { useBuildDiffState } from "./BuildDiffState";
import { useBuildDiffVisibleState } from "./BuildDiffVisibleState";
import { useBuildHotkey } from "./BuildHotkeys";
import { useZoomerSyncContext } from "./Zoomer";
import { useBuildDiffViewModeState } from "./useBuildDiffViewModeState";

const BuildDiffChangesOverlayToggle = memo(() => {
  const { visible, setVisible } = useBuildDiffVisibleState();
  const toggle = () => setVisible((visible) => !visible);
  const hotkey = useBuildHotkey("toggleChangesOverlay", toggle, {
    preventDefault: true,
  });
  return (
    <HotkeyTooltip
      description={visible ? "Hide changes overlay" : "Show changes overlay"}
      keys={hotkey.displayKeys}
    >
      <IconButton color="danger" aria-pressed={visible} onClick={toggle}>
        <EyeIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});

const BuildDiffFitToggle = memo(() => {
  const { contained, setContained } = useBuildDiffFitState();
  const { reset } = useZoomerSyncContext();
  const toggle = () => {
    setContained((contained) => !contained);
    reset();
  };
  const hotkey = useBuildHotkey("toggleDiffFit", toggle, {
    preventDefault: true,
  });
  return (
    <HotkeyTooltip
      description={contained ? "Expand the screenshot" : "Fit the screenshot"}
      keys={hotkey.displayKeys}
    >
      <IconButton aria-pressed={contained} onClick={toggle}>
        <ArrowsPointingInIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});

const BuildVisibleDiffButtonGroup = memo(() => {
  const { viewMode, setViewMode } = useBuildDiffViewModeState();
  const showBaselineOnly = () => setViewMode("baseline");
  const showBaselineOnlyHotkey = useBuildHotkey(
    "showBaselineOnly",
    showBaselineOnly,
    { preventDefault: true },
  );
  const showChangesOnly = () => setViewMode("changes");
  const showChangesOnlyHotkey = useBuildHotkey(
    "showChangesOnly",
    showChangesOnly,
    { preventDefault: true },
  );

  if (viewMode === "split") {
    return null;
  }

  return (
    <ButtonGroup>
      <HotkeyTooltip
        description={showBaselineOnlyHotkey.description}
        keys={showBaselineOnlyHotkey.displayKeys}
      >
        <IconButton
          aria-pressed={viewMode === "baseline"}
          onClick={showBaselineOnly}
        >
          Baseline
        </IconButton>
      </HotkeyTooltip>
      <HotkeyTooltip
        description={showChangesOnlyHotkey.description}
        keys={showChangesOnlyHotkey.displayKeys}
      >
        <IconButton
          aria-pressed={viewMode === "changes"}
          onClick={showChangesOnly}
        >
          Changes
        </IconButton>
      </HotkeyTooltip>
    </ButtonGroup>
  );
});

const BuildSplitViewToggle = memo(() => {
  const { viewMode, setViewMode } = useBuildDiffViewModeState();
  const { reset } = useZoomerSyncContext();
  const toggleSplitView = () => {
    setViewMode((viewMode) => (viewMode === "split" ? "changes" : "split"));
    reset();
  };
  const hotkey = useBuildHotkey("toggleSplitView", toggleSplitView, {
    preventDefault: true,
  });
  return (
    <HotkeyTooltip
      description={
        viewMode === "split"
          ? "Show new screenshot only"
          : "Show baseline and changes side by side"
      }
      keys={hotkey.displayKeys}
    >
      <IconButton aria-pressed={viewMode === "split"} onClick={toggleSplitView}>
        <ColumnsIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});

const NextDiffButton = memo(() => {
  const { diffs, activeDiff, setActiveDiff } = useBuildDiffState();
  const activeDiffIndex = activeDiff ? diffs.indexOf(activeDiff) : -1;
  const disabled = activeDiffIndex >= diffs.length - 1;
  const goToNextDiff = () => {
    if (disabled) return;
    const nextDiff = diffs[activeDiffIndex + 1];
    if (nextDiff) {
      setActiveDiff(nextDiff, true);
    }
  };
  const hotkey = useBuildHotkey("goToNextDiff", goToNextDiff, {
    preventDefault: true,
    enabled: !disabled,
  });
  return (
    <HotkeyTooltip description={hotkey.description} keys={hotkey.displayKeys}>
      <IconButton disabled={disabled} onClick={goToNextDiff}>
        <ArrowDownIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});

const PreviousDiffButton = memo(() => {
  const { diffs, activeDiff, setActiveDiff } = useBuildDiffState();
  const activeDiffIndex = activeDiff ? diffs.indexOf(activeDiff) : -1;
  const disabled = activeDiffIndex <= 0;
  const goToPreviousDiff = () => {
    if (disabled) return;
    const previousDiff = diffs[activeDiffIndex - 1];
    if (previousDiff) {
      setActiveDiff(previousDiff, true);
    }
  };
  const hotkey = useBuildHotkey("goToPreviousDiff", goToPreviousDiff, {
    preventDefault: true,
    enabled: !disabled,
  });
  return (
    <HotkeyTooltip description={hotkey.description} keys={hotkey.displayKeys}>
      <IconButton disabled={disabled} onClick={goToPreviousDiff}>
        <ArrowUpIcon />
      </IconButton>
    </HotkeyTooltip>
  );
});

export interface BuildDetailToolbarProps {
  name: string;
  bordered: boolean;
  test: Pick<
    Test,
    "status" | "unstable" | "resolvedDate" | "mute" | "muteUntil"
  > | null;
}

export const BuildDetailToolbar = memo(
  ({ name, bordered, test }: BuildDetailToolbarProps) => {
    return (
      <div
        className={clsx(
          "sticky top-0 z-20 flex shrink-0 items-start justify-between gap-4 border-b p-4 transition-colors",
          !bordered && "border-b-transparent",
        )}
      >
        <div className="flex items-start gap-2">
          <div className="flex gap-1">
            <PreviousDiffButton />
            <NextDiffButton />
          </div>
          <MuteIndicator test={test} className="mt-1" />
          <div
            role="heading"
            className="mr-2 mt-1 line-clamp-2 text-sm font-medium"
          >
            {name}
          </div>
          <FlakyChip test={test} className="mt-0.5" />
        </div>
        <div className="flex gap-2">
          <BuildVisibleDiffButtonGroup />
          <BuildSplitViewToggle />
          <BuildDiffFitToggle />
          <BuildDiffChangesOverlayToggle />
        </div>
      </div>
    );
  },
);
