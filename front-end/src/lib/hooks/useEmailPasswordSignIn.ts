import {
  signInWithEmailAndPassword,
} from "@firebase/auth";
import { ApolloError, useLazyQuery } from "@apollo/client";
import { GET_SINGLE_USER_BY_UID } from "@/lib/graphql/Users";
import { auth } from "../firebase/firebase";
import { User } from "@/__generated__/graphql";

export const useEmailPasswordSignIn = (): {
  emailPasswordSignIn: (
    email: string, password: string
  ) => Promise<{
      user: User | null;
      errorCode: string | null;
      errorMessage: string | null;
    }
  >;
  queryError: ApolloError | null;
} => {
  const [getUserByUid, { error: getUserError }] = useLazyQuery(
    GET_SINGLE_USER_BY_UID
  );

  const emailPasswordSignIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log({result})
      const firebaseUser = result.user;
      const { data } = await getUserByUid({
        variables: { uid: firebaseUser.uid },
      });

      return {
        user: data.getUserByUid || null,
        errorCode: null,
        errorMessage: null,
      };
    } catch (error: any) {
      return {
        user: null,
        errorCode: error.code || "SIGN_IN_ERROR",
        errorMessage:
          error.message || "An error occurred when trying to sign in.",
      };
    }
  };

  return { emailPasswordSignIn, queryError: getUserError || null };
};
