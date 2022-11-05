import { ChevronRightIcon } from "@primer/octicons-react";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import { x } from "@xstyled/styled-components";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useNavigate } from "react-router-dom";

import { HOTKEYS } from "@/pages/Build/Hotkeys";

import { Alert } from "./Alert";
import { Badge } from "./Badge";
import { BuildStatLink, BuildStatLinks } from "./BuildStat";
import { Thumbnail, ThumbnailImage, ThumbnailTitle } from "./Thumbnail";

const DIFFS_GROUPS = {
  failed: { diffs: {}, label: "failures", collapsed: false },
  updated: { diffs: {}, label: "changes", collapsed: false },
  added: { diffs: {}, label: "additions", collapsed: false },
  removed: { diffs: {}, label: "deletions", collapsed: false },
  stable: { diffs: {}, label: "stables", collapsed: true },
};

const ScreenshotName = ({ diff }) =>
  (diff?.compareScreenshot?.name || diff?.baseScreenshot?.name || "")
    .split(".")
    .slice(0, -1)
    .join(".");

const ListItem = ({ virtualRow, ...props }) => (
  <x.div
    top={0}
    left={0}
    w={1}
    virtualRow={virtualRow}
    h={`${virtualRow.size}px`}
    position="absolute"
    transform={`translateY(${virtualRow.start}px)`}
    px={5}
    display="flex"
    flexDirection="column"
    gap={2}
    {...props}
  />
);

const HeaderChevron = (props) => (
  <x.div
    w={4}
    display="inline-flex"
    alignItems="center"
    justifyContent="center"
    color="secondary-text"
    transform
    data-header-chevron=""
    {...props}
  >
    <x.svg as={ChevronRightIcon} w={3} h={3} />
  </x.div>
);

const Header = ({ ...props }) => (
  <x.button
    w={1}
    color="primary-text"
    outline={{ _: "none", focus: "none" }}
    display="flex"
    alignItems="center"
    justifyContent="space-between"
    fontSize="xs"
    lineHeight="16px"
    textTransform="capitalize"
    cursor="default"
    fontWeight={{ _: "medium", focus: "semibold" }}
    borderTop={1}
    borderBottom={1}
    borderColor="layout-border"
    borderRadius={0}
    backgroundColor={{ _: "bg", hover: "bg-hover", focus: "bg-hover" }}
    userSelect="none"
    pr={4}
    h={1}
    {...props}
  />
);

const StickyItem = ({ active, ...props }) => (
  <ListItem
    zIndex={1}
    p={0}
    {...(active ? { position: "sticky", transform: "none" } : {})}
    {...props}
  />
);

function fillGroups(groups, data) {
  return data.reduce((res, item) => {
    res[item.status].diffs[item.rank] = item;
    return res;
  }, groups);
}

function enrichGroups(groups, groupCollapseStatuses, stats) {
  let nextGroupIndex = 0;
  let nextFirstRank = 1;

  const richGroups = Object.keys(groups).reduce((acc, status) => {
    const count = stats[`${status}ScreenshotCount`];
    if (count === 0) {
      return acc;
    }

    const index = nextGroupIndex;
    const collapsed = groupCollapseStatuses[status];
    nextGroupIndex += collapsed ? 1 : count + 1;
    const firstRank = nextFirstRank;
    nextFirstRank += count;

    return {
      ...acc,
      [status]: {
        ...groups[status],
        count,
        index,
        status,
        collapsed,
        firstRank,
      },
    };
  }, {});

  return Object.values(richGroups);
}

function getRows(groups) {
  return groups.flatMap((group) => {
    return [
      { type: "listHeader", ...group },

      ...(group.collapsed
        ? []
        : Array.from({ length: group.count }, (e, i) => {
            const rank = group.firstRank + i;
            return {
              type: "listItem",
              rank,
              diff: group.diffs[rank] || null,
            };
          })),
    ];
  });
}

const DiffImages = ({ diff, imageHeight }) => (
  <>
    {diff.status === "updated" && (
      <ThumbnailImage
        image={diff}
        position="absolute"
        backgroundColor="rgba(255, 255, 255, 0.8)"
        top="50%"
        transform
        translateY="-50%"
        maxH={imageHeight}
      />
    )}
    <ThumbnailImage
      image={diff.compareScreenshot || diff.baseScreenshot}
      h={imageHeight}
    />
  </>
);

export function ThumbnailsList({
  imageHeight = 300,
  gap = 16,
  headerSize = 36,
  height = 400,
  data,
  isFetchingNextPage,
  fetchNextPage,
  stats,
  previousRank,
  nextRank,
  activeDiff,
  buildUrl,
}) {
  const navigate = useNavigate();
  const parentRef = useRef();
  const activeStickyIndexRef = useRef(0);

  const filledGroups = fillGroups(DIFFS_GROUPS, data);

  const [groupCollapseStatuses, setGroupCollapseStatuses] = useState(
    Object.keys(DIFFS_GROUPS).reduce(
      (acc, status) => ({ ...acc, [status]: filledGroups[status].collapsed }),
      {}
    )
  );

  const richGroups = enrichGroups(filledGroups, groupCollapseStatuses, stats);
  const stickyIndexes = richGroups.map(({ index }) => index);
  const rows = getRows(richGroups);

  const rowsRanks = rows
    .filter((item) => item.rank !== undefined)
    .map(({ rank }) => rank);
  const activeDiffRankIndex = rowsRanks.findIndex(
    (rank) => activeDiff.rank === rank
  );
  previousRank.current = rowsRanks[activeDiffRankIndex - 1];
  nextRank.current = rowsRanks[activeDiffRankIndex + 1];

  const isSticky = (index) => stickyIndexes.includes(index);
  const isActiveSticky = (index) => activeStickyIndexRef.current === index;
  const isFirst = (index) => isSticky(index - 1);
  const isLast = (index) => isSticky(index + 1);
  const toggleSection = (status) =>
    setGroupCollapseStatuses((prev) => ({ ...prev, [status]: !prev[status] }));
  const goToSection = (index) => {
    const group = richGroups[index];
    if (!group) return;
    if (groupCollapseStatuses[group.status]) toggleSection(group.status);
    rowVirtualizer.scrollToIndex(group.index, {
      align: "start",
      smoothScroll: true,
    });
    navigate(`${buildUrl}/${group.firstRank}`, { replace: true });
  };

  useHotkeys(HOTKEYS.goToFirstSection.shortcut, () => goToSection(0));
  useHotkeys(HOTKEYS.goToSecondSection.shortcut, () => goToSection(1));
  useHotkeys(HOTKEYS.goToThirdSection.shortcut, () => goToSection(2));
  useHotkeys(HOTKEYS.goToFourthSection.shortcut, () => goToSection(3));
  useHotkeys(HOTKEYS.goToFifthSection.shortcut, () => goToSection(4));

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: (i) =>
      isSticky(i)
        ? headerSize
        : gap + // top padding + bottom padding
          40 + // thumbnail title + gap
          imageHeight +
          (isFirst(i) ? gap / 2 : 0) +
          (isLast(i) ? gap / 2 : 0),
    getScrollElement: () => parentRef.current,
    overscan: 10,
    paddingEnd: 32,
    rangeExtractor: useCallback(
      (range) => {
        activeStickyIndexRef.current = Array.from(stickyIndexes)
          .reverse()
          .find((index) => range.startIndex >= index);

        const next = new Set([
          activeStickyIndexRef.current,
          ...defaultRangeExtractor(range),
        ]);

        return Array.from(next).sort((a, b) => a - b);
      },
      [stickyIndexes]
    ),
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const firstEmptyVirtualItem = virtualItems.find(
    ({ index }) => rows[index].type === "listItem" && rows[index].diff === null
  );
  const firstEmptyRank = firstEmptyVirtualItem
    ? rows[firstEmptyVirtualItem.index].rank
    : null;
  const shouldFetch = !isFetchingNextPage && firstEmptyRank !== null;

  useEffect(() => {
    if (shouldFetch) {
      fetchNextPage(firstEmptyRank);
    }
  }, [shouldFetch, fetchNextPage, firstEmptyRank]);

  return (
    <>
      <BuildStatLinks>
        {richGroups.map((group, index) => (
          <BuildStatLink
            key={group.status}
            status={group.status}
            count={group.count}
            label={`${group.label} screenshots`}
            onClick={() =>
              goToSection(
                richGroups.findIndex(({ status }) => group.status === status)
              )
            }
            hotkey={index + 1}
          />
        ))}
      </BuildStatLinks>

      <x.div ref={parentRef} h={height} w={1} overflowY="auto">
        {rows.length === 0 ? (
          <Alert m={4} color="info">
            Empty build: no screenshot detected
          </Alert>
        ) : (
          <x.div w={1} position="relative" h={rowVirtualizer.getTotalSize()}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = rows[virtualRow.index];

              if (!item) return null;

              if (item.type === "listHeader") {
                return (
                  <StickyItem
                    key={virtualRow.index}
                    virtualRow={virtualRow}
                    active={isActiveSticky(virtualRow.index)}
                    onClick={() => toggleSection(item.status)}
                  >
                    <Header
                      borderTopColor={
                        virtualRow.index === 0 ||
                        isFirst(virtualRow.index) ||
                        isActiveSticky(virtualRow.index)
                          ? "transparent"
                          : "layout-border"
                      }
                    >
                      <x.div display="flex" alignItems="center">
                        <HeaderChevron rotate={item.collapsed ? 0 : 90} />
                        {item.label}
                      </x.div>

                      <Badge variant="secondary">{item.count}</Badge>
                    </Header>
                  </StickyItem>
                );
              }

              return (
                <ListItem
                  key={virtualRow.index}
                  virtualRow={virtualRow}
                  pt={isFirst(virtualRow.index) ? `${gap}px` : `${gap / 2}px`}
                  pb={isLast(virtualRow.index) ? `${gap}px` : `${gap / 2}px`}
                >
                  <ThumbnailTitle>
                    <ScreenshotName diff={item.diff} />
                  </ThumbnailTitle>

                  {item.diff ? (
                    <Thumbnail
                      replace
                      to={`${buildUrl}/${item.rank}`}
                      data-active={activeDiff.rank === item.diff.rank}
                    >
                      <DiffImages diff={item.diff} imageHeight={imageHeight} />
                    </Thumbnail>
                  ) : null}
                </ListItem>
              );
            })}
          </x.div>
        )}
      </x.div>
    </>
  );
}
