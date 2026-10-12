import { Host, Picker, Text } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import { View } from "react-native";
import { useAppearancePreferences } from "../settings/appearance/AppearancePreferencesProvider";
import { useWorkspaceTabs } from "./WorkspaceTabsContext";
import { useWorkspaceTabSelection } from "./useWorkspaceTabSelection";

/** Wide iPad navigation belongs to the sidebar, leaving the detail's header unobstructed. */
export function WorkspaceSidebarTabs() {
  const workspace = useWorkspaceTabs()!;
  const selectTab = useWorkspaceTabSelection();
  const { themeAppearance } = useAppearancePreferences();
  return (
    <View className="px-4 pb-3 pt-2">
      <Host
        matchContents={{ vertical: true }}
        colorScheme={themeAppearance}
        style={{ width: "100%" }}
      >
        <Picker
          label="Workspace"
          selection={workspace.state.selectedTab}
          onSelectionChange={selectTab}
          modifiers={[pickerStyle("segmented")]}
        >
          <Text modifiers={[tag("threads")]}>Threads</Text>
          <Text modifiers={[tag("pullRequests")]}>Pull requests</Text>
        </Picker>
      </Host>
    </View>
  );
}
