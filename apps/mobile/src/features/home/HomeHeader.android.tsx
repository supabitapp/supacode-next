import { NativeStackScreenOptions } from "../../native/StackHeader";
import { useAdaptiveWorkspaceLayout } from "../layout/AdaptiveWorkspaceLayout";
import { WorkspaceDock } from "../workspace/WorkspaceDock";
import { MaterialThreadListToolbar } from "./MaterialThreadListToolbar";
import { ThreadListFilters, useThreadListFilterMenu } from "./ThreadListFilters";
import type { HomeHeaderProps } from "./HomeHeader.types";

export type { HomeHeaderEnvironment } from "./HomeHeader.types";

export function HomeHeader(props: HomeHeaderProps) {
  const { layout } = useAdaptiveWorkspaceLayout();
  const usesDock = props.usesWorkspaceToolbar && !layout.usesSplitView;
  const menu = useThreadListFilterMenu(props);
  return (
    <>
      <NativeStackScreenOptions options={{ headerShown: false }} />
      {usesDock ? (
        <WorkspaceDock
          floating
          onNewTask={props.onStartNewTask}
          filter={<ThreadListFilters {...props} />}
        />
      ) : null}
      <MaterialThreadListToolbar
        showFloatingFilter={!usesDock}
        searchQuery={props.searchQuery}
        onSearchQueryChange={props.onSearchQueryChange}
        filterActions={menu.actions}
        filterCustomized={menu.customized}
        onFilterAction={menu.onPressAction}
        onOpenSettings={props.onOpenSettings}
        onOpenEnvironments={props.onOpenEnvironments}
      />
    </>
  );
}
