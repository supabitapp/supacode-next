import { Platform } from "react-native";

import { NATIVE_MAIL_SEARCH_TOOLBAR_SUPPORTED } from "../layout/native-mail-search-toolbar";

/** The iPad sidebar stacks home search under its title. */
export function isHomeIPadSidebar(primaryColumn: object | null) {
  return Platform.OS === "ios" && Platform.isPad && primaryColumn !== null;
}

/** Everywhere else on iOS 26+, home search floats in a toolbar that rides the keyboard. */
export function homeSearchRidesKeyboard(primaryColumn: object | null) {
  return NATIVE_MAIL_SEARCH_TOOLBAR_SUPPORTED && !isHomeIPadSidebar(primaryColumn);
}
