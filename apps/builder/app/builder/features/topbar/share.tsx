import { useStore } from "@nanostores/react";
import {
  Button,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
  theme,
  Tooltip,
  rawTheme,
  Popover,
} from "@webstudio-is/design-system";
import { ShareProjectContainer } from "~/shared/share-project";
import { $authPermit } from "~/shared/nano-states";
import { $isShareDialogOpen } from "~/builder/shared/nano-states";
import { t } from "~/shared/i18n/t";

export const ShareButton = ({ projectId }: { projectId: string }) => {
  const isShareDialogOpen = useStore($isShareDialogOpen);
  const authPermit = useStore($authPermit);

  const isShareDisabled = authPermit !== "own";
  const tooltipContent = isShareDisabled
    ? t.topbar.onlyOwnerCanShare
    : undefined;

  return (
    <Popover
      modal
      open={isShareDialogOpen}
      onOpenChange={(isOpen) => {
        $isShareDialogOpen.set(isOpen);
      }}
    >
      <Tooltip
        content={tooltipContent ?? t.topbar.shareProjectLink}
        sideOffset={Number.parseFloat(rawTheme.spacing[5])}
      >
        <PopoverTrigger asChild>
          <Button disabled={isShareDisabled} color="gradient">
            {t.topbar.share}
          </Button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        sideOffset={Number.parseFloat(rawTheme.spacing[8])}
        css={{ marginRight: theme.spacing[3] }}
      >
        <ShareProjectContainer projectId={projectId} />
        <PopoverTitle>{t.topbar.share}</PopoverTitle>
      </PopoverContent>
    </Popover>
  );
};
