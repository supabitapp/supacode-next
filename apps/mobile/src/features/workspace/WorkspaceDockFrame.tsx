import type { ReactNode } from "react";
import { View } from "react-native";
import { useKeyboardState } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WORKSPACE_DOCK } from "./workspace-tabs-state";

export function WorkspaceDockFrame(props: {
  readonly floating?: boolean;
  readonly children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  if (keyboardVisible) return null;
  return (
    <View
      pointerEvents="box-none"
      className="w-full"
      style={
        props.floating
          ? {
              position: "absolute",
              left: 0,
              right: 0,
              bottom: Math.max(insets.bottom, 12) + WORKSPACE_DOCK.bottomGap,
              paddingHorizontal: 16,
              zIndex: 5,
            }
          : undefined
      }
    >
      {props.children}
    </View>
  );
}
