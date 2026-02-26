import { useStore } from "@nanostores/react";
import {
  Button,
  Tooltip,
  rawTheme,
} from "@webstudio-is/design-system";
import { $authTokenPermissions } from "~/shared/nano-states";
import { $publishDialog } from "~/builder/shared/nano-states";

export const DeployButton = () => {
  const authTokenPermissions = useStore($authTokenPermissions);
  const isPublishEnabled = authTokenPermissions.canPublish;

  const tooltipContent = isPublishEnabled
    ? "Deploy to static hosting"
    : "Only the owner or admin can deploy projects";

  return (
    <Tooltip
      side="bottom"
      content={tooltipContent}
      sideOffset={Number.parseFloat(rawTheme.spacing[5])}
    >
      <Button
        type="button"
        disabled={isPublishEnabled === false}
        color="neutral"
        onClick={() => {
          $publishDialog.set("deploy");
        }}
      >
        Deploy
      </Button>
    </Tooltip>
  );
};
