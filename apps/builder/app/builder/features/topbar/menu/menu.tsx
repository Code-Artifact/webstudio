import { useStore } from "@nanostores/react";
import {
  theme,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemRightSlot,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  Tooltip,
  Kbd,
  menuItemCss,
} from "@webstudio-is/design-system";
import {
  $isCloneDialogOpen,
  $isShareDialogOpen,
  $publishDialog,
  $remoteDialog,
} from "~/builder/shared/nano-states";
import { cloneProjectUrl, dashboardUrl } from "~/shared/router-utils";
import {
  $authPermit,
  $authToken,
  $authTokenPermissions,
  $isDesignMode,
  $userPlanFeatures,
} from "~/shared/nano-states";
import { emitCommand } from "~/builder/shared/commands";
import { MenuButton } from "./menu-button";
import { $openProjectSettings } from "~/shared/nano-states/project-settings";
import { UpgradeIcon } from "@webstudio-is/icons";
import { getSetting, setSetting } from "~/builder/shared/client-settings";
import { help } from "~/shared/help";
import { t } from "~/shared/i18n/t";

const ViewMenuItem = () => {
  const navigatorLayout = getSetting("navigatorLayout");

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>{t.topbar.view}</DropdownMenuSubTrigger>
      <DropdownMenuSubContent width="regular">
        <DropdownMenuCheckboxItem
          checked={navigatorLayout === "undocked"}
          onSelect={() => {
            const setting =
              navigatorLayout === "undocked" ? "docked" : "undocked";
            setSetting("navigatorLayout", setting);
          }}
        >
          {t.topbar.undockNavigator}
        </DropdownMenuCheckboxItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};

export const Menu = () => {
  const userPlanFeatures = useStore($userPlanFeatures);
  const hasPaidPlan = userPlanFeatures.purchases.length > 0;
  const authPermit = useStore($authPermit);
  const authTokenPermission = useStore($authTokenPermissions);
  const authToken = useStore($authToken);
  const isDesignMode = useStore($isDesignMode);

  const isPublishEnabled = authPermit === "own" || authPermit === "admin";

  const isShareEnabled = authPermit === "own";

  const disabledPublishTooltipContent = isPublishEnabled
    ? undefined
    : t.topbar.onlyOwnerCanPublish;

  const disabledShareTooltipContent = isShareEnabled
    ? undefined
    : t.topbar.onlyOwnerCanShare;

  // If authToken is defined, the user is not logged into the current project and must be redirected to the dashboard to clone the project.
  const cloneIsExternal = authToken !== undefined;

  return (
    <DropdownMenu modal={false}>
      <MenuButton />
      <DropdownMenuContent sideOffset={4} collisionPadding={4} width="regular">
        <DropdownMenuItem
          onSelect={() => {
            window.location.href = dashboardUrl({ origin: window.origin });
          }}
        >
          {t.topbar.dashboard}
        </DropdownMenuItem>
        <Tooltip side="right" content={undefined}>
          <DropdownMenuItem
            onSelect={() => {
              $openProjectSettings.set("general");
            }}
          >
            {t.topbar.projectSettings}
          </DropdownMenuItem>
        </Tooltip>
        <DropdownMenuItem onSelect={() => emitCommand("openBreakpointsMenu")}>
          {t.topbar.breakpoints}
        </DropdownMenuItem>
        <ViewMenuItem />
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => emitCommand("undo")}>
          {t.topbar.undo}
          <DropdownMenuItemRightSlot>
            <Kbd value={["meta", "z"]} />
          </DropdownMenuItemRightSlot>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => emitCommand("redo")}>
          {t.topbar.redo}
          <DropdownMenuItemRightSlot>
            <Kbd value={["meta", "shift", "z"]} />
          </DropdownMenuItemRightSlot>
        </DropdownMenuItem>
        {/* https://github.com/webstudio-is/webstudio/issues/499

          <DropdownMenuItem
            onSelect={() => {
              // TODO
            }}
          >
            Copy
            <DropdownMenuItemRightSlot><Kbd value={["meta", "c"]} /></DropdownMenuItemRightSlot>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              // TODO
            }}
          >
            Paste
            <DropdownMenuItemRightSlot><Kbd value={["meta", "v"]} /></DropdownMenuItemRightSlot>
          </DropdownMenuItem>

          */}
        <DropdownMenuItem onSelect={() => emitCommand("deleteInstanceBuilder")}>
          {t.topbar.delete}
          <DropdownMenuItemRightSlot>
            <Kbd value={["backspace"]} />
          </DropdownMenuItemRightSlot>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => emitCommand("save")}>
          {t.topbar.save}
          <DropdownMenuItemRightSlot>
            <Kbd value={["meta", "s"]} />
          </DropdownMenuItemRightSlot>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => emitCommand("togglePreviewMode")}>
          {t.topbar.preview}
          <DropdownMenuItemRightSlot>
            <Kbd value={["meta", "shift", "p"]} />
          </DropdownMenuItemRightSlot>
        </DropdownMenuItem>

        <Tooltip
          side="right"
          sideOffset={10}
          content={disabledShareTooltipContent}
        >
          <DropdownMenuItem
            onSelect={() => {
              $isShareDialogOpen.set(true);
            }}
            disabled={isShareEnabled === false}
          >
            {t.topbar.share}
          </DropdownMenuItem>
        </Tooltip>

        <Tooltip
          side="right"
          sideOffset={10}
          content={disabledPublishTooltipContent}
        >
          <DropdownMenuItem
            onSelect={() => {
              $publishDialog.set("publish");
            }}
            disabled={isPublishEnabled === false}
          >
            {t.topbar.publish}
            <DropdownMenuItemRightSlot>
              <Kbd value={["shift", "P"]} />
            </DropdownMenuItemRightSlot>
          </DropdownMenuItem>
        </Tooltip>

        <Tooltip
          side="right"
          sideOffset={10}
          content={disabledPublishTooltipContent}
        >
          <DropdownMenuItem
            onSelect={() => {
              $publishDialog.set("export");
            }}
            disabled={isPublishEnabled === false}
          >
            {t.topbar.export}
            <DropdownMenuItemRightSlot>
              <Kbd value={["shift", "E"]} />
            </DropdownMenuItemRightSlot>
          </DropdownMenuItem>
        </Tooltip>

        <Tooltip
          side="right"
          sideOffset={10}
          content={disabledPublishTooltipContent}
        >
          <DropdownMenuItem
            onSelect={() => {
              $publishDialog.set("deploy");
            }}
            disabled={isPublishEnabled === false}
          >
            {t.topbar.deploy}
            <DropdownMenuItemRightSlot>
              <Kbd value={["shift", "D"]} />
            </DropdownMenuItemRightSlot>
          </DropdownMenuItem>
        </Tooltip>

        <Tooltip
          side="right"
          sideOffset={10}
          content={
            authTokenPermission.canClone === false
              ? "Cloning has been disabled by the project owner"
              : undefined
          }
        >
          <DropdownMenuItem
            onSelect={() => {
              if ($authToken.get() === undefined) {
                $isCloneDialogOpen.set(true);
                return;
              }
            }}
            disabled={authTokenPermission.canClone === false}
            asChild={cloneIsExternal}
          >
            {cloneIsExternal ? (
              <a
                className={menuItemCss()}
                href={cloneProjectUrl({
                  origin: window.origin,
                  sourceAuthToken: authToken,
                })}
              >
                {t.topbar.clone}
              </a>
            ) : (
              t.topbar.clone
            )}
          </DropdownMenuItem>
        </Tooltip>

        <DropdownMenuSeparator />

        {isDesignMode && (
          <DropdownMenuItem onSelect={() => emitCommand("openCommandPanel")}>
            {t.topbar.searchAndCommands}
            <DropdownMenuItemRightSlot>
              <Kbd value={["meta", "k"]} />
            </DropdownMenuItemRightSlot>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onSelect={() => emitCommand("openKeyboardShortcuts")}>
          {t.topbar.keyboardShortcuts}
          <DropdownMenuItemRightSlot>
            <Kbd value={["shift", "?"]} />
          </DropdownMenuItemRightSlot>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{t.topbar.help}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent width="regular">
            {help.map((item) => (
              <DropdownMenuItem
                key={item.url}
                onSelect={(event) => {
                  if ("target" in item && item.target === "embed") {
                    event.preventDefault();
                    $remoteDialog.set({
                      title: item.label,
                      url: item.url,
                    });
                    return;
                  }
                  window.open(item.url);
                }}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {hasPaidPlan === false && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                window.open("https://webstudio.is/pricing");
              }}
              css={{ gap: theme.spacing[3] }}
            >
              <UpgradeIcon />
              <div>{t.topbar.upgradeToPro}</div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
