import { useAtomValue } from "@effect/atom-react";
import { connectionStatusTitle } from "@supaterm/client-runtime/connection";
import * as Option from "effect/Option";
import { AsyncResult, Atom } from "effect/reactivity";
import { CircleAlertIcon, Clock3Icon, PlusIcon } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import type { EnvironmentId, ScheduledTask, ScheduledTaskId } from "@supaterm/contracts";
import { AuthOrchestrationOperateScope, resolveEnvironmentMachineKind } from "@supaterm/contracts";

import { isElectron } from "../../env";
import { useNowMinuteMs } from "../../hooks/useNowMinute";
import { projectGroupMemberKeys } from "../../sidebarProjectGrouping";
import {
  useEnvironments,
  usePrimaryEnvironmentId,
  type EnvironmentPresentation,
} from "../../state/environments";
import { readEnvironmentScope, useEnvironmentsWithScope } from "../../state/session";
import { formatEnvironmentQueryError, useEnvironmentQuery } from "../../state/query";
import { serverEnvironment } from "../../state/server";
import { EnvironmentMachineIcon } from "../EnvironmentMachineIcon";
import { WorkspaceBreadcrumb, WorkspaceBreadcrumbItem } from "../WorkspaceBreadcrumb";
import { WorkspacePageContainer } from "../WorkspacePageContainer";
import { WorkspacePageHeader } from "../WorkspacePageHeader";
import { ScopeSentence } from "../settings/ScopeSentence";
import { selectScopedSettingsEnvironments } from "../settings/scopedSettings";
import { resolveSettingsScope, type ResolvedSettingsScope } from "../settings/settingsScope";
import { SettingsGroup } from "../settings/SettingsGroup";
import {
  settingsScopeEnvironmentLabel,
  settingsScopeEnvironmentLabels,
} from "../settings/settingsScopeAxis";
import { useSettingsProjectGroups } from "../settings/useSettingsProjectGroups";
import { Button } from "../ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";
import { SidebarInset } from "../ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { AutomationEditorDialog } from "./AutomationEditorDialog";
import { AutomationRow } from "./AutomationRow";
import { automationsScopeSearch, matchesAutomationScope } from "./automations.logic";

const route = getRouteApi("/_chat/automations");

/**
 * Every environment's scheduled tasks in one list. The project and environment
 * scope narrows both the list and where a new automation can be created.
 */
export function AutomationsPage() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const groups = useSettingsProjectGroups();
  const { environments: availableEnvironments } = useEnvironments();
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const scope = useMemo(
    () => resolveSettingsScope(search, groups, availableEnvironments),
    [availableEnvironments, groups, search],
  );
  const {
    environments,
    connectedEnvironments,
    environment: defaultEnvironment,
  } = useMemo(
    () => selectScopedSettingsEnvironments(scope, availableEnvironments, primaryEnvironmentId),
    [availableEnvironments, primaryEnvironmentId, scope],
  );
  const writableEnvironmentIds = useEnvironmentsWithScope(
    connectedEnvironments,
    AuthOrchestrationOperateScope,
  );
  const writableEnvironments = connectedEnvironments.filter((entry) =>
    writableEnvironmentIds.has(entry.environmentId),
  );
  const creationEnvironment =
    writableEnvironments.find(
      (entry) => entry.environmentId === defaultEnvironment?.environmentId,
    ) ?? writableEnvironments[0];
  const projectNameByKey = useMemo(
    () =>
      new Map(
        groups.flatMap((group) =>
          [...projectGroupMemberKeys(group)].map((key) => [key, group.displayName] as const),
        ),
      ),
    [groups],
  );
  const [editor, setEditor] = useState<{
    environmentId: EnvironmentId;
    task: ScheduledTask | null;
  } | null>(null);
  const openForEdit = useCallback((environmentId: EnvironmentId, task: ScheduledTask) => {
    setEditor({ environmentId, task });
  }, []);
  const openForCreate = useCallback((environmentId: EnvironmentId) => {
    if (readEnvironmentScope(environmentId, AuthOrchestrationOperateScope)) {
      setEditor({ environmentId, task: null });
    }
  }, []);
  const hasTaskLink = search.environmentId !== undefined || search.taskId !== undefined;
  const closeEditor = () => {
    setEditor(null);
    if (!hasTaskLink) return;
    void navigate({ search: automationsScopeSearch, replace: true });
  };
  const linkEnvironmentId = search.environmentId ?? defaultEnvironment?.environmentId;

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none isolate">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background text-foreground">
        <WorkspacePageHeader electron={isElectron}>
          <WorkspaceBreadcrumb ariaLabel="Automations breadcrumb" className="min-w-0 flex-1">
            <WorkspaceBreadcrumbItem current>
              <h1>Automations</h1>
            </WorkspaceBreadcrumbItem>
          </WorkspaceBreadcrumb>
          <Button
            variant="default"
            disabled={!creationEnvironment}
            onClick={() => creationEnvironment && openForCreate(creationEnvironment.environmentId)}
          >
            <PlusIcon />
            New automation
          </Button>
        </WorkspacePageHeader>

        <div className="topbar-scroll-fade scrollbar-gutter-both flex-1 overflow-y-auto">
          <WorkspacePageContainer>
            <ScopeSentence
              lead="Showing automations for"
              presentation="filters"
              value={search}
              scope={scope}
              groups={groups}
              environments={availableEnvironments}
              onChange={(next) => void navigate({ search: automationsScopeSearch(next) })}
            />
            {scope.kind === "unavailable" ? (
              <p className="text-sm text-muted-foreground">{scope.message}</p>
            ) : environments.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Clock3Icon />
                  </EmptyMedia>
                  <EmptyTitle>No environments available</EmptyTitle>
                  <EmptyDescription>Connect an environment to manage automations.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : environments.length > 1 ? (
              <AutomationEnvironmentList
                key={`${linkEnvironmentId ?? ""}:${search.taskId ?? ""}`}
                environments={environments}
                scope={scope}
                projectNameByKey={projectNameByKey}
                linkEnvironmentId={linkEnvironmentId}
                taskId={search.taskId}
                creationEnvironment={creationEnvironment}
                onCreate={openForCreate}
                onEdit={openForEdit}
              />
            ) : (
              environments.map((entry) => (
                <AutomationEnvironmentSection
                  key={`${entry.environmentId}:${search.taskId ?? ""}`}
                  environment={entry}
                  scope={scope}
                  projectNameByKey={projectNameByKey}
                  taskId={linkEnvironmentId === entry.environmentId ? search.taskId : undefined}
                  canCreate={writableEnvironmentIds.has(entry.environmentId)}
                  onCreate={openForCreate}
                  onEdit={openForEdit}
                />
              ))
            )}
          </WorkspacePageContainer>
        </div>
      </div>
      {editor ? (
        <AutomationEditorDialog
          key={`${editor.environmentId}:${editor.task?.id ?? "new"}`}
          initialEnvironmentId={editor.environmentId}
          task={editor.task}
          scope={scope}
          connectedEnvironments={writableEnvironments}
          onClose={closeEditor}
        />
      ) : null}
    </SidebarInset>
  );
}

/**
 * With several environments, only those with automations get a section; the
 * rest fold into one status line each for empty, loading, failed, and
 * disconnected environments.
 */
function AutomationEnvironmentList({
  environments,
  scope,
  projectNameByKey,
  linkEnvironmentId,
  taskId,
  creationEnvironment,
  onCreate,
  onEdit,
}: {
  readonly environments: readonly EnvironmentPresentation[];
  readonly scope: ResolvedSettingsScope;
  readonly projectNameByKey: ReadonlyMap<string, string>;
  readonly linkEnvironmentId: EnvironmentId | undefined;
  readonly taskId: ScheduledTaskId | undefined;
  readonly creationEnvironment: EnvironmentPresentation | undefined;
  readonly onCreate: (environmentId: EnvironmentId) => void;
  readonly onEdit: (environmentId: EnvironmentId, task: ScheduledTask) => void;
}) {
  const states = useAtomValue(
    useMemo(
      () =>
        Atom.make((get) =>
          environments.map((environment) => {
            const connected =
              environment.connection.phase === "connected" && environment.serverConfig !== null;
            const query = connected
              ? get(
                  serverEnvironment.scheduledTasksLive({
                    environmentId: environment.environmentId,
                    input: {},
                  }),
                )
              : null;
            const data = query === null ? null : Option.getOrNull(AsyncResult.value(query));
            return {
              environment,
              connected,
              tasks: data?.tasks.filter((task) =>
                matchesAutomationScope(scope, environment.environmentId, task.projectId),
              ),
              error: query?._tag === "Failure" ? formatEnvironmentQueryError(query.cause) : null,
            };
          }),
        ),
      [environments, scope],
    ),
  );
  const linkedState = states.find((state) => state.environment.environmentId === linkEnvironmentId);
  const linkedTask = linkedState?.tasks?.find((task) => task.id === taskId);
  const openedLink = useRef(false);
  useEffect(() => {
    if (!openedLink.current && linkEnvironmentId && linkedTask) {
      openedLink.current = true;
      onEdit(linkEnvironmentId, linkedTask);
    }
  }, [linkEnvironmentId, linkedTask, onEdit]);
  const now = useNowMinuteMs();

  const loaded = states.filter((state) => state.connected && state.error === null && state.tasks);
  const populated = loaded.filter((state) => state.tasks && state.tasks.length > 0);
  const summaries: Record<string, string[]> = {
    "Not connected:": [],
    "Loading automations on": [],
    "Could not load automations:": [],
    "No automations on": [],
  };
  for (const { environment, connected, tasks, error } of states) {
    const label = settingsScopeEnvironmentLabel(environment, environments);
    if (!connected) {
      summaries["Not connected:"]!.push(
        `${label} (${connectionStatusTitle(environment.connection)})`,
      );
    } else if (error !== null) {
      summaries["Could not load automations:"]!.push(`${label}: ${error}`);
    } else if (!tasks) {
      summaries["Loading automations on"]!.push(label);
    } else if (tasks.length === 0 && populated.length > 0) {
      summaries["No automations on"]!.push(label);
    }
  }

  return (
    <>
      {populated.map(({ environment, tasks }) => {
        const { primary, secondary } = settingsScopeEnvironmentLabels(environment, environments);
        return (
          <section
            key={environment.environmentId}
            className="flex min-w-0 flex-col gap-3"
            aria-label={primary}
          >
            <div className="flex items-center justify-between gap-3 px-1">
              <h2 className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <EnvironmentMachineIcon
                  aria-hidden
                  kind={resolveEnvironmentMachineKind(environment.serverConfig)}
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
                <span className="truncate">{primary}</span>
                {secondary ? (
                  <span className="min-w-0 truncate text-xs font-normal text-muted-foreground">
                    {secondary}
                  </span>
                ) : null}
              </h2>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {tasks?.length} {tasks?.length === 1 ? "automation" : "automations"}
              </span>
            </div>
            <SettingsGroup>
              {tasks?.map((task) => (
                <AutomationRow
                  key={task.id}
                  environmentId={environment.environmentId}
                  task={task}
                  projectName={
                    projectNameByKey.get(`${environment.environmentId}:${task.projectId}`) ?? null
                  }
                  now={now}
                  onEdit={() => onEdit(environment.environmentId, task)}
                />
              ))}
            </SettingsGroup>
          </section>
        );
      })}
      {taskId && linkedState?.tasks && linkedState.error === null && !linkedTask ? (
        <SettingsGroup>
          <AutomationNotice
            title="Automation unavailable"
            description="This automation no longer exists or is outside the selected project."
          />
        </SettingsGroup>
      ) : null}
      {populated.length === 0 && loaded.length > 0 ? (
        <SettingsGroup>
          <AutomationNotice
            title="No automations yet"
            description="Schedule a prompt to keep work moving."
            action={
              creationEnvironment ? (
                <Button
                  variant="outline"
                  aria-label={`Create automation on ${creationEnvironment.label}`}
                  onClick={() => onCreate(creationEnvironment.environmentId)}
                >
                  <PlusIcon />
                  Create automation
                </Button>
              ) : null
            }
          />
        </SettingsGroup>
      ) : null}
      {Object.entries(summaries).map(([label, entries]) => {
        if (entries.length === 0) return null;
        const summary = `${label} ${entries.join(", ")}`;
        return (
          <Tooltip key={label}>
            <TooltipTrigger
              render={<p className="truncate px-1 text-xs text-muted-foreground" role="status" />}
            >
              {summary}
            </TooltipTrigger>
            <TooltipPopup>{summary}</TooltipPopup>
          </Tooltip>
        );
      })}
    </>
  );
}

function AutomationEnvironmentSection({
  environment,
  scope,
  projectNameByKey,
  taskId,
  canCreate,
  onCreate,
  onEdit,
}: {
  readonly environment: EnvironmentPresentation;
  readonly scope: ResolvedSettingsScope;
  readonly projectNameByKey: ReadonlyMap<string, string>;
  readonly taskId?: ScheduledTaskId | undefined;
  readonly canCreate: boolean;
  readonly onCreate: (environmentId: EnvironmentId) => void;
  readonly onEdit: (environmentId: EnvironmentId, task: ScheduledTask) => void;
}) {
  const connected =
    environment.connection.phase === "connected" && environment.serverConfig !== null;
  const tasksQuery = useEnvironmentQuery(
    connected
      ? serverEnvironment.scheduledTasksLive({
          environmentId: environment.environmentId,
          input: {},
        })
      : null,
  );
  const tasks = tasksQuery.data?.tasks.filter((task) =>
    matchesAutomationScope(scope, environment.environmentId, task.projectId),
  );
  const linkedTask = tasks?.find((task) => task.id === taskId);
  const openedLink = useRef(false);
  useEffect(() => {
    if (!openedLink.current && linkedTask) {
      openedLink.current = true;
      onEdit(environment.environmentId, linkedTask);
    }
  }, [environment.environmentId, linkedTask, onEdit]);
  const now = useNowMinuteMs();
  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label={environment.label}>
      <h2 className="sr-only">{environment.label}</h2>
      <SettingsGroup>
        {!connected ? (
          <AutomationNotice
            title="Environment disconnected"
            description={`Reconnect ${environment.label} to view its automations.`}
          />
        ) : tasksQuery.error ? (
          <AutomationNotice
            title="Could not load automations"
            description={tasksQuery.error}
            error
          />
        ) : !tasks ? (
          <div role="status" aria-label="Loading automations">
            <span className="sr-only">Loading automations…</span>
            {[0, 1].map((index) => (
              <div
                key={index}
                aria-hidden
                className="flex flex-col gap-3 px-4 py-4 sm:px-5 sm:py-5"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="h-5 w-1/3 rounded bg-muted" />
                  <div className="h-10 w-4/5 rounded bg-muted/60" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="h-4 w-1/2 rounded bg-muted/60" />
                  <div className="h-4 w-2/3 rounded bg-muted/60" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {taskId && !linkedTask ? (
              <AutomationNotice
                title="Automation unavailable"
                description="This automation no longer exists or is outside the selected project."
              />
            ) : null}
            {tasks.length === 0 ? (
              <AutomationNotice
                title="No automations yet"
                description="Schedule a prompt to keep work moving in this environment."
                action={
                  canCreate ? (
                    <Button
                      variant="outline"
                      aria-label={`Create automation on ${environment.label}`}
                      onClick={() => onCreate(environment.environmentId)}
                    >
                      <PlusIcon />
                      Create automation
                    </Button>
                  ) : null
                }
              />
            ) : (
              tasks.map((task) => (
                <AutomationRow
                  key={task.id}
                  environmentId={environment.environmentId}
                  task={task}
                  projectName={
                    projectNameByKey.get(`${environment.environmentId}:${task.projectId}`) ?? null
                  }
                  now={now}
                  onEdit={() => onEdit(environment.environmentId, task)}
                />
              ))
            )}
          </>
        )}
      </SettingsGroup>
    </section>
  );
}

function AutomationNotice({
  title,
  description,
  action,
  error = false,
}: {
  readonly title: string;
  readonly description: string;
  readonly action?: ReactNode;
  readonly error?: boolean;
}) {
  const Icon = error ? CircleAlertIcon : Clock3Icon;
  return (
    <div className="flex min-h-36 flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-5">
      <div className="flex min-w-0 items-start gap-3" role="status">
        <Icon
          aria-hidden
          className={`mt-0.5 size-4 shrink-0 ${error ? "text-destructive" : "text-muted-foreground"}`}
        />
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="max-w-[65ch] text-xs leading-5 text-muted-foreground wrap-anywhere">
            {description}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}
