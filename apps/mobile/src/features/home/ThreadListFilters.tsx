import { useMemo } from "react";
import { ControlPillMenu } from "../../components/ControlPillMenu";
import type { ControlPillMenuProps } from "../../components/ControlPillMenu.types";
import { SidebarFilterButton } from "../threads/sidebar-filter-button";
import { buildHomeListFilterMenu } from "./home-list-filter-menu";
import type { HomeHeaderProps } from "./HomeHeader.types";

type ThreadListFilterProps = Pick<
  HomeHeaderProps,
  | "environments"
  | "projects"
  | "selectedEnvironmentId"
  | "selectedProjectKey"
  | "onEnvironmentChange"
  | "onProjectChange"
>;

export function useThreadListFilterMenu(props: ThreadListFilterProps) {
  const {
    environments,
    projects,
    selectedEnvironmentId,
    selectedProjectKey,
    onEnvironmentChange,
    onProjectChange,
  } = props;
  const menu = useMemo(() => {
    const definition = buildHomeListFilterMenu({
      environments,
      projects,
      selectedEnvironmentId,
      selectedProjectKey,
      onEnvironmentChange,
      onProjectChange,
    });
    const handlers = new Map<string, () => void>();
    const actions = definition.items.map((item, index) => {
      const id = String(index);
      if (item.type === "action") {
        handlers.set(id, item.onPress);
        return { id, title: item.title, state: item.state };
      }
      return {
        id,
        title: item.title,
        subactions: item.items.map((action, childIndex) => {
          const childId = `${id}:${childIndex}`;
          handlers.set(childId, action.onPress);
          return { id: childId, title: action.title, state: action.state };
        }),
      };
    });
    const onPressAction: NonNullable<ControlPillMenuProps["onPressAction"]> = ({ nativeEvent }) => {
      handlers.get(nativeEvent.event)?.();
    };
    return { title: definition.title, actions, onPressAction };
  }, [
    environments,
    projects,
    selectedEnvironmentId,
    selectedProjectKey,
    onEnvironmentChange,
    onProjectChange,
  ]);
  return {
    ...menu,
    customized: props.selectedEnvironmentId !== null || props.selectedProjectKey !== null,
  };
}

export function ThreadListFilters(props: ThreadListFilterProps) {
  const { customized, ...menu } = useThreadListFilterMenu(props);
  return (
    <ControlPillMenu {...menu}>
      <SidebarFilterButton
        accessibilityLabel="Filter threads"
        icon={
          customized
            ? "line.3.horizontal.decrease.circle.fill"
            : "line.3.horizontal.decrease.circle"
        }
      />
    </ControlPillMenu>
  );
}
