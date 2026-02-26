import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import * as db from "~/shared/db";
import { sessionStorage } from "~/services/session.server";
import { AUTH_PROVIDERS } from "~/shared/session";
import { isBuilder } from "~/shared/router-utils";
import { getUserById } from "~/shared/db/user.server";
import env from "~/env/env.server";
import { builderAuthenticator } from "./builder-auth.server";
import type { SessionData } from "./auth.server.utils";
import { createContext } from "~/shared/context.server";

// Create an instance of the authenticator, pass a generic with what
// strategies will return and will store in the session
export const authenticator = new Authenticator<SessionData>(sessionStorage, {
  throwOnError: true,
});

if (env.ADMIN_USERNAME && env.ADMIN_PASSWORD) {
  authenticator.use(
    new FormStrategy(async ({ form, request }) => {
      const username = form.get("username");
      const password = form.get("password");

      if (username == null || password == null) {
        throw new Error("Username and password are required");
      }

      if (
        username.toString() === env.ADMIN_USERNAME &&
        password.toString() === env.ADMIN_PASSWORD
      ) {
        try {
          const context = await createContext(request);
          const email = `${env.ADMIN_USERNAME}@localhost`;
          const user = await db.user.createOrLoginWithPassword(context, email);
          return {
            userId: user.id,
            createdAt: Date.now(),
          };
        } catch (error) {
          if (error instanceof Error) {
            console.error({
              error,
              extras: {
                loginMethod: AUTH_PROVIDERS.LOGIN_PASSWORD,
              },
            });
          }
          throw error;
        }
      }

      throw new Error("Invalid username or password");
    }),
    "password"
  );
}

export const findAuthenticatedUser = async (request: Request) => {
  const user = isBuilder(request)
    ? await builderAuthenticator.isAuthenticated(request)
    : await authenticator.isAuthenticated(request);

  if (user == null) {
    return null;
  }
  const context = await createContext(request);

  try {
    return await getUserById(context, user.userId);
  } catch (error) {
    return null;
  }
};
