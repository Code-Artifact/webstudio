import { useState } from "react";
import { ShieldIcon } from "@webstudio-is/icons";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  theme,
  ToolbarButton,
  Button,
  Text,
  Flex,
  rawTheme,
} from "@webstudio-is/design-system";
import { builderApi } from "~/shared/builder-api";
import { t } from "~/shared/i18n/t";

export const SafeModeButton = () => {
  const [open, setOpen] = useState(false);

  if (!builderApi.isSafeMode()) {
    return;
  }

  const handleExitSafeMode = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("safemode");
    window.location.href = url.href;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ToolbarButton variant="subtle" tabIndex={0}>
          <ShieldIcon stroke={rawTheme.colors.foregroundDestructive} />
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent>
        <Flex
          direction="column"
          gap="2"
          css={{
            padding: theme.panel.padding,
            width: theme.spacing[30],
          }}
        >
          <Text variant="regularBold">{t.topbar.safeModeActive}</Text>
          <Text>
            {t.topbar.safeModeDescription}
          </Text>
          <Button color="destructive" onClick={handleExitSafeMode}>
            {t.topbar.exitSafeMode}
          </Button>
        </Flex>
      </PopoverContent>
    </Popover>
  );
};
