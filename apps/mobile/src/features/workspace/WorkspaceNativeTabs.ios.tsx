import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Keyboard, View, type NativeSyntheticEvent } from "react-native";
import { Tabs, type TabSelectedEvent, type TabSelectionRejectedEvent } from "react-native-screens";

import { WorkspaceTabsContext, useWorkspaceTabs } from "./WorkspaceTabsContext";
import type { WorkspaceTab } from "./workspace-tabs-state";
import { NativeWorkspaceTabActivityContext } from "../../native/v5-workspace-context";

// Tabler's git-pull-request geometry, rasterized at 1x/2x/3x for UIKit template images.
const PULL_REQUEST_ICON = require("../../../modules/supacode-native-controls/ios/Resources/pull-request.png");

/** Retain each native controller tree; removing its root can leave RNS's stack empty. */
function RetainedWorkspaceTab(props: {
  readonly tab: WorkspaceTab;
  readonly active: boolean;
  readonly children: ReactNode;
}) {
  const workspace = useWorkspaceTabs()!;
  const { isTabActive } = workspace;
  const isActive = useCallback(() => isTabActive(props.tab), [isTabActive, props.tab]);
  const activity = useMemo(
    () => ({
      active: props.active,
      isActive,
    }),
    [props.active, isActive],
  );
  const [content, setContent] = useState(
    props.active ? { workspace, children: props.children } : null,
  );
  if (props.active && (content?.workspace !== workspace || content?.children !== props.children))
    setContent({ workspace, children: props.children });
  return content ? (
    <NativeWorkspaceTabActivityContext value={activity}>
      <WorkspaceTabsContext value={content.workspace}>{content.children}</WorkspaceTabsContext>
    </NativeWorkspaceTabActivityContext>
  ) : null;
}

export function WorkspaceNativeTabs(props: {
  readonly children: ReactNode;
  readonly onSelect: () => void;
}) {
  const workspace = useWorkspaceTabs()!;
  const [provenance, setProvenance] = useState(0);
  const selectedTab = workspace.state.selectedTab;
  const request = useMemo(
    () => ({ selectedScreenKey: selectedTab, baseProvenance: provenance }),
    [selectedTab, provenance],
  );
  return (
    <View style={{ flex: 1 }}>
      <Tabs.Host
        navStateRequest={request}
        tabBarHidden
        ios={{ tabBarControllerMode: "tabBar", tabBarMinimizeBehavior: "never" }}
        onTabSelectionRejected={({
          nativeEvent,
        }: NativeSyntheticEvent<TabSelectionRejectedEvent>) => {
          setProvenance(nativeEvent.provenance);
        }}
        onTabSelected={({ nativeEvent }: NativeSyntheticEvent<TabSelectedEvent>) => {
          const tab = nativeEvent.selectedScreenKey;
          if (tab !== "threads" && tab !== "pullRequests") return;
          setProvenance(nativeEvent.provenance);
          if (nativeEvent.actionOrigin === "programmatic-js" || tab === selectedTab) return;
          Keyboard.dismiss();
          props.onSelect();
          workspace.dispatch({ type: "select", tab });
        }}
      >
        {(["threads", "pullRequests"] as const).map((tab: WorkspaceTab) => (
          <Tabs.Screen
            key={tab}
            screenKey={tab}
            title={tab === "threads" ? "Threads" : "Pulls"}
            tabBarItemAccessibilityLabel={tab === "threads" ? "Threads" : "Pull requests"}
            ios={{
              icon:
                tab === "threads"
                  ? { type: "sfSymbol", name: "text.bubble" }
                  : { type: "templateSource", templateSource: PULL_REQUEST_ICON },
              selectedIcon:
                tab === "threads" ? { type: "sfSymbol", name: "text.bubble.fill" } : undefined,
              overrideScrollViewContentInsetAdjustmentBehavior: false,
            }}
          >
            <RetainedWorkspaceTab tab={tab} active={selectedTab === tab}>
              {props.children}
            </RetainedWorkspaceTab>
          </Tabs.Screen>
        ))}
      </Tabs.Host>
    </View>
  );
}
