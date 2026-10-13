import { requireNativeView } from "expo";
import { use, useLayoutEffect, useState } from "react";
import { NativeWorkspaceTabActivityContext } from "../../native/v5-workspace-context";
import type { NativeSyntheticEvent, ViewProps } from "react-native";
import { useAppearancePreferences } from "../settings/appearance/AppearancePreferencesProvider";
import { useWorkspaceTabs } from "./WorkspaceTabsContext";
import { useWorkspaceTabSelection } from "./useWorkspaceTabSelection";
import { WorkspaceDockFrame } from "./WorkspaceDockFrame";
import { WORKSPACE_DOCK, type WorkspaceTab } from "./workspace-tabs-state";
import type { WorkspaceDockProps, WorkspaceDockFilterMenu } from "./WorkspaceDock.types";

interface NativeDockProps extends ViewProps {
  readonly selectedTab: WorkspaceTab;
  readonly showTabs: boolean;
  readonly filterCustomized: boolean;
  readonly filterLabel: string;
  readonly filterTitle: string;
  readonly filterActions: WorkspaceDockFilterMenu["actions"];
  readonly appearance: string;
  readonly onTabSelected: (event: NativeSyntheticEvent<{ readonly tab: WorkspaceTab }>) => void;
  readonly onCompose: () => void;
  readonly onHeightChange: (event: NativeSyntheticEvent<{ readonly height: number }>) => void;
  readonly onFilterAction?: WorkspaceDockFilterMenu["onPressAction"];
}

const NativeDock = requireNativeView<NativeDockProps>("SupacodeNativeControls", "WorkspaceDock");

export function WorkspaceDock(props: WorkspaceDockProps) {
  const workspace = useWorkspaceTabs()!;
  const selectTab = useWorkspaceTabSelection();
  const active = use(NativeWorkspaceTabActivityContext)?.active ?? true;
  const [height, setHeight] = useState(WORKSPACE_DOCK.height);
  const { setDockHeight } = workspace;
  useLayoutEffect(() => {
    if (active) setDockHeight(height);
  }, [active, height, setDockHeight]);
  const { themeAppearance } = useAppearancePreferences();
  if (!active) return null;
  return (
    <WorkspaceDockFrame floating={props.floating}>
      <NativeDock
        selectedTab={workspace.state.selectedTab}
        showTabs={props.showTabs !== false}
        filterCustomized={props.filterMenu?.customized ?? false}
        filterLabel={props.filterMenu?.accessibilityLabel ?? "Filter"}
        filterTitle={props.filterMenu?.title ?? ""}
        filterActions={props.filterMenu?.actions ?? []}
        appearance={themeAppearance}
        onTabSelected={({ nativeEvent }) => selectTab(nativeEvent.tab)}
        onCompose={props.onNewTask}
        onFilterAction={props.filterMenu?.onPressAction}
        onHeightChange={({ nativeEvent }) => setHeight(nativeEvent.height)}
        style={{ width: "100%", height }}
      />
    </WorkspaceDockFrame>
  );
}
