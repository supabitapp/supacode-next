import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSidebarWorkspaceTabs } from "./useSidebarWorkspaceTabs";
import { WORKSPACE_DOCK } from "./workspace-tabs-state";

export function useWorkspaceDockBottomInset() {
  const insets = useSafeAreaInsets();
  const sidebarTabs = useSidebarWorkspaceTabs();
  return Platform.OS === "ios" && !sidebarTabs
    ? 0
    : Math.max(insets.bottom, 12) + WORKSPACE_DOCK.bottomGap;
}
