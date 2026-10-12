import { Platform } from "react-native";
import { useAdaptiveWorkspaceLayout } from "../layout/AdaptiveWorkspaceLayout";

export function useSidebarWorkspaceTabs() {
  const { layout } = useAdaptiveWorkspaceLayout();
  return Platform.OS === "ios" && Platform.isPad && layout.usesSplitView;
}
