import { Button, Flex, InputField, theme } from "@webstudio-is/design-system";
import { authPath } from "~/shared/router-utils";

export const PasswordLogin = () => {
  return (
    <form
      method="post"
      action={authPath({ provider: "password" })}
      style={{ display: "contents" }}
    >
      <Flex direction="column" gap="3" css={{ width: "100%" }}>
        <InputField
          name="username"
          type="text"
          required
          autoFocus
          placeholder="نام کاربری"
          css={{ height: theme.spacing[15] }}
        />
        <InputField
          name="password"
          type="password"
          required
          placeholder="رمز عبور"
          css={{ height: theme.spacing[15] }}
        />
        <Button
          type="submit"
          color="primary"
          css={{ height: theme.spacing[15] }}
        >
          ورود
        </Button>
      </Flex>
    </form>
  );
};
