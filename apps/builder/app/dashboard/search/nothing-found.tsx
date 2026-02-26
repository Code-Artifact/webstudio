import { Flex, Text } from "@webstudio-is/design-system";
import { t } from "~/shared/i18n/t";

export const NothingFound = () => (
  <Flex align="center" justify="center" direction="column" gap="6">
    <Text variant="brandSectionTitle" as="h1" align="center">
      {t.dashboard.nothingFound}
    </Text>
  </Flex>
);
