import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

import { NATIVE_MAIL_SEARCH_TOOLBAR_CONTENT_INSET } from "../layout/native-mail-search-toolbar";

const SEARCH_KEYBOARD_GAP = 16;

/**
 * The safe-area bottom from the last time no keyboard was up. iOS can raise the
 * live value while the floating search toolbar rides the keyboard.
 */
export function useRestingSafeAreaBottom(safeAreaBottom: number, keyboardVisible: boolean) {
  const [resting, setResting] = useState(safeAreaBottom);
  if (!keyboardVisible && resting !== safeAreaBottom) {
    setResting(safeAreaBottom);
  }
  return resting;
}

/**
 * Lifts the bottom-aligned home list in step with a keyboard that opened while
 * home was focused, so the rows nearest the search field stay above it. A
 * sheet's keyboard never moves the list underneath it.
 */
export function useSearchKeyboardLift(input: {
  /** Space the list keeps below its last row with no keyboard. */
  readonly restingClearance: number;
  readonly toolbarRidesKeyboard: boolean;
}) {
  const clearanceAboveKeyboard =
    SEARCH_KEYBOARD_GAP +
    (input.toolbarRidesKeyboard ? NATIVE_MAIL_SEARCH_TOOLBAR_CONTENT_INSET : 0);
  const liftBeyondKeyboard = useSharedValue(0);
  const focused = useSharedValue(false);
  const owned = useSharedValue(false);
  const progress = useSharedValue(0);
  const target = useSharedValue(0);
  useEffect(() => {
    liftBeyondKeyboard.set(clearanceAboveKeyboard - input.restingClearance);
  }, [clearanceAboveKeyboard, input.restingClearance, liftBeyondKeyboard]);
  useFocusEffect(
    useCallback(() => {
      focused.set(true);
      return () => focused.set(false);
    }, [focused]),
  );
  // The provider's shared progress jumps to its end value on iOS, so follow
  // the per-frame events instead. A hide keeps the target it started from.
  useKeyboardHandler(
    {
      onStart: (event) => {
        "worklet";
        if (event.height === 0) return;
        owned.set(focused.get());
        target.set(Math.max(0, event.height + liftBeyondKeyboard.get()));
      },
      onMove: (event) => {
        "worklet";
        progress.set(event.progress);
      },
      onInteractive: (event) => {
        "worklet";
        progress.set(event.progress);
      },
      onEnd: (event) => {
        "worklet";
        progress.set(event.progress);
        if (event.height === 0) owned.set(false);
      },
    },
    [],
  );
  return useDerivedValue(() => (owned.get() ? target.get() * progress.get() : 0));
}

/** Owns its style so a view mounted mid-search starts at the current lift. */
export function KeyboardLiftedView(props: {
  readonly lift: SharedValue<number>;
  /** Fraction of the lift to apply, such as half for a view centered in the pane. */
  readonly ratio?: number;
  readonly style?: StyleProp<ViewStyle>;
  readonly children: ReactNode;
}) {
  const { lift, ratio = 1 } = props;
  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.get() * ratio }],
  }));
  return (
    <Animated.View className="w-full" style={[props.style, liftStyle]}>
      {props.children}
    </Animated.View>
  );
}
