import type { ReactNode } from "react";
import { useKeyboardState } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable, View } from "react-native";

import { AppText } from "../../components/AppText";
import { SymbolView } from "../../components/AppSymbol";
import { GlassSurface } from "../../components/GlassSurface";
import { useWorkspaceTabs } from "./WorkspaceTabsContext";
import { useWorkspaceTabSelection } from "./useWorkspaceTabSelection";
import { WORKSPACE_DOCK } from "./workspace-tabs-state";

export function WorkspaceDock(props: {
  readonly onNewTask: () => void;
  readonly filter?: ReactNode;
  readonly floating?: boolean;
  readonly showTabs?: boolean;
}) {
  const workspace = useWorkspaceTabs()!;
  const selectTab = useWorkspaceTabSelection();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  if (keyboardVisible) return null;
  return (
    <View
      pointerEvents="box-none"
      className="w-full flex-row items-center justify-between"
      style={{
        gap: WORKSPACE_DOCK.gap,
        ...(props.floating
          ? {
              position: "absolute",
              left: 0,
              right: 0,
              bottom: Math.max(insets.bottom, 12) + WORKSPACE_DOCK.bottomGap,
              paddingHorizontal: 16,
              zIndex: 5,
            }
          : {}),
      }}
    >
      <View style={{ width: WORKSPACE_DOCK.height, alignItems: "center" }}>{props.filter}</View>
      {props.showTabs !== false ? (
        <GlassSurface
          style={{
            flex: 1,
            maxWidth: WORKSPACE_DOCK.tabsWidth,
            minWidth: 0,
            height: WORKSPACE_DOCK.height,
            borderRadius: WORKSPACE_DOCK.height / 2,
          }}
        >
          <View className="flex-1 flex-row p-1" accessibilityRole="tablist">
            {(["threads", "pullRequests"] as const).map((tab) => {
              const selected = workspace.state.selectedTab === tab;
              return (
                <Pressable
                  key={tab}
                  accessibilityRole="tab"
                  accessibilityLabel={tab === "threads" ? "Threads" : "Pull requests"}
                  accessibilityState={{ selected }}
                  onPress={() => selectTab(tab)}
                  className={
                    selected
                      ? "flex-1 items-center justify-center rounded-full bg-subtle-strong"
                      : "flex-1 items-center justify-center rounded-full"
                  }
                >
                  <SymbolView
                    name={tab === "threads" ? "text.bubble" : "arrow.triangle.pull"}
                    size={19}
                    tintColorClassName={selected ? "accent-focus" : "accent-icon"}
                  />
                  <AppText className="text-[10px] font-supacode-medium text-foreground">
                    {tab === "threads" ? "Threads" : "Pulls"}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </GlassSurface>
      ) : null}
      <GlassSurface
        style={{
          width: WORKSPACE_DOCK.height,
          height: WORKSPACE_DOCK.height,
          borderRadius: WORKSPACE_DOCK.height / 2,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New chat"
          onPress={props.onNewTask}
          className="flex-1 items-center justify-center"
        >
          <SymbolView name="square.and.pencil" size={23} tintColorClassName="accent-icon" />
        </Pressable>
      </GlassSurface>
    </View>
  );
}
