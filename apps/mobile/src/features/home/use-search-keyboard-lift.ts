import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect } from "react";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";

/**
 * Lifts the bottom-aligned home list by `distance` in step with a keyboard
 * that opened while home was focused, so the rows nearest the search field
 * stay above it. A sheet's keyboard never moves the list underneath it.
 */
export function useSearchKeyboardLift(distance: number) {
  const focused = useSharedValue(false);
  const owned = useSharedValue(false);
  const progress = useSharedValue(0);
  const target = useSharedValue(0);
  useFocusEffect(
    useCallback(() => {
      focused.set(true);
      return () => focused.set(false);
    }, [focused]),
  );
  // The provider's shared progress jumps to its end value on iOS, so follow
  // the per-frame events instead.
  useKeyboardHandler(
    {
      onStart: (event) => {
        "worklet";
        if (event.height > 0) owned.set(focused.get());
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
  // Hiding keeps the last distance so the list rides the keyboard back down.
  useEffect(() => {
    if (distance > 0) target.set(distance);
  }, [distance, target]);
  return useDerivedValue(() => (owned.get() ? target.get() * progress.get() : 0));
}
