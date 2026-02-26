import { useStore } from "@nanostores/react";
import { atom } from "nanostores";
import {
  Flex,
  rawTheme,
  Text,
  theme,
  Tooltip,
} from "@webstudio-is/design-system";
import { OfflineIcon } from "@webstudio-is/icons";
import { useEffect } from "react";
import { $queueStatus } from "~/shared/sync/project-queue";
import { t } from "~/shared/i18n/t";

const $isOnline = atom(false);

const subscribeIsOnline = () => {
  const handle = () => $isOnline.set(navigator.onLine);
  addEventListener("offline", handle);
  addEventListener("online", handle);
  return () => {
    removeEventListener("offline", handle);
    removeEventListener("online", handle);
  };
};

export const SyncStatus = () => {
  const statusObject = useStore($queueStatus);
  const isOnline = useStore($isOnline);
  useEffect(subscribeIsOnline, []);

  if (
    statusObject.status === "idle" ||
    statusObject.status === "running" ||
    statusObject.status === "recovering"
  ) {
    return null;
  }

  const containerProps = {
    align: "center" as const,
    justify: "center" as const,
    css: { height: theme.spacing["15"] },
    shrink: false,
  };

  if (statusObject.status === "failed") {
    return (
      <Tooltip
        variant="wrapped"
        content={
          <Text>
            {isOnline ? (
              <>
                {t.topbar.connectivityIssues}
              </>
            ) : (
              <>
                {t.topbar.offlineChanges}
              </>
            )}
          </Text>
        }
      >
        <Flex {...containerProps}>
          <OfflineIcon
            aria-label={t.topbar.syncFailed}
            color={rawTheme.colors.foregroundDestructive}
          />
        </Flex>
      </Tooltip>
    );
  }

  if (statusObject.status === "fatal") {
    return (
      <Flex {...containerProps}>
        <Tooltip variant="wrapped" content={<>{statusObject.error}</>}>
          <OfflineIcon
            aria-label={t.topbar.syncFatal}
            color={rawTheme.colors.foregroundDestructive}
          />
        </Tooltip>
      </Flex>
    );
  }

  /* exhaustive check */
  statusObject satisfies never;
};
