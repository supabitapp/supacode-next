import { useMemo, type ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialScreenContent } from "../../components/MaterialScreenContent";
import { PullRequestsScreen } from "../pull-requests/PullRequestsScreen";
import { MaterialPullRequestToolbar } from "../pull-requests/MaterialPullRequestToolbar.android";
import { WorkspaceTabsContext, useWorkspaceTabs } from "./WorkspaceTabsContext";
import { WORKSPACE_DOCK } from "./workspace-tabs-state";

export function AndroidWorkspaceSidebar(props: {
  readonly children: ReactNode;
  readonly onRequestVisibility: () => void;
  readonly selectedPullRequestKey: string | null;
}) {
  const workspace = useWorkspaceTabs()!;
  const insets = useSafeAreaInsets();
  const bottomClearance =
    Math.max(insets.bottom, 12) + WORKSPACE_DOCK.bottomGap + WORKSPACE_DOCK.height + 16;
  const context = useMemo(() => ({ ...workspace, bottomClearance }), [workspace, bottomClearance]);
  return workspace.state.selectedTab === "threads" ? (
    props.children
  ) : (
    <WorkspaceTabsContext value={context}>
      <View className="flex-1 bg-header">
        <MaterialPullRequestToolbar onRequestVisibility={props.onRequestVisibility} />
        <MaterialScreenContent insetHorizontal>
          <PullRequestsScreen sidebar selectedPullRequestKey={props.selectedPullRequestKey} />
        </MaterialScreenContent>
      </View>
    </WorkspaceTabsContext>
  );
}
