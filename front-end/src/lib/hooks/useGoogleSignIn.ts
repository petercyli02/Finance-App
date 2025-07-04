import {
  GoogleAuthProvider,
  signInWithPopup,
} from "@firebase/auth";
import { ApolloError, useLazyQuery } from "@apollo/client";
import { GET_SINGLE_USER_BY_UID } from "@/lib/graphql/Users";
import { User } from "@/__generated__/graphql";
import { User as FirebaseUser } from "firebase/auth"
import { auth } from "@/lib/firebase/firebase"

const provider = new GoogleAuthProvider();

export const useGoogleSignIn = (): {
  googleSignIn: () => Promise<{
      user: User | null;
      firebaseUser: FirebaseUser | null;
      error: {
        code: string;
        message: string;
      } | null;
    }
  >;
  queryError: ApolloError | null;
} => {
  const [getUserByUid, { error: getUserError }] = useLazyQuery(
    GET_SINGLE_USER_BY_UID
  );

  const googleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      const { data } = await getUserByUid({
        variables: { uid: firebaseUser.uid },
      });
      return {
        user: data?.getUserByUid || null,
        error: null,
        firebaseUser: firebaseUser,
      };
    } catch (error: any) {
      return {
        user: null,
        error: {
          code: error.code || "SIGN_IN_ERROR",
          message: error.message || "An error occurred when trying to sign in.",
        },  
        firebaseUser: null,
      };
    }
  };

  return { googleSignIn, queryError: getUserError || null };
};
