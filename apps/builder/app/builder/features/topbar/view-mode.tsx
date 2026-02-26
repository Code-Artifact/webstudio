import { useStore } from "@nanostores/react";
import { Flex, rawTheme, Tooltip, theme } from "@webstudio-is/design-system";
import { CloudIcon } from "@webstudio-is/icons";
import { $authPermit } from "~/shared/nano-states";
import { t } from "~/shared/i18n/t";

export const ViewMode = () => {
  const authPermit = useStore($authPermit);

  if (authPermit !== "view") {
    return;
  }

  return (
    <Tooltip content={t.topbar.viewMode}>
      <Flex
        align="center"
        justify="center"
        css={{ height: theme.spacing["15"] }}
        shrink={false}
      >
        <CloudIcon
          color={rawTheme.colors.backgroundAlertMain}
          aria-label={t.topbar.viewMode}
        />
      </Flex>
    </Tooltip>
  );
};
