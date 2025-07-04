import Uppy from "@uppy/core";
import Dashboard from "@uppy/dashboard";
import AwsS3 from "@uppy/aws-s3";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import { useLazyQuery, useQuery } from "@apollo/client";
import { GET_USER_PFP } from "@/lib/graphql/Users";
import { Pencil } from "lucide-react";
import { fallbackProfilePicturePath } from "@/lib/constants";

type Props = {
  className?: string;
  userId: number;
};

export const ProfilePicture = ({ className, userId }: Props) => {

  const [url, setUrl] = useState(null);

  const [getUserPfp] = useLazyQuery(GET_USER_PFP, {
    variables: {
      userId: userId,
    },
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      setUrl(data?.getUserById.profilePictureUrl);
    },
  });

  const uppyRef = useRef<Uppy | null>(null);
  const dashboardRef = useRef<any>(null);

  useEffect(() => {
    getUserPfp();
    uppyRef.current = new Uppy();
    uppyRef.current.use(Dashboard, { inline: false });
    uppyRef.current.use(AwsS3, {
      shouldUseMultipart: false,
      getUploadParameters(file) {
        return fetch(`${process.env.NEXT_SERVER_URL}/graphql`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            query: `
              mutation GetUploadSignedUrl($userId: Int!) {
                getUploadSignedUrl(userId: $userId)
              }
            `,
            variables: {
              userId: userId,
            },
          }),
        })
          .then((response) => response.json())
          .then((result) => {
            const signedUrl = result.data.getUploadSignedUrl;
            return {
              method: "PUT",
              url: signedUrl,
              headers: {
                "Content-Type": file.type,
              },
            };
          });
      },
    });
    uppyRef.current.on("upload-success", (result) => {
      setTimeout(() => {});
      getUserPfp();
    });
    dashboardRef.current = uppyRef.current.getPlugin("Dashboard");
  }, [userId]);

  const openUppy = () => {
    if (dashboardRef.current) {
      dashboardRef.current.openModal();
    }
  };

  return (
    <div className="relative max-h-40 group rounded-full self-center">
      <img src={url ?? fallbackProfilePicturePath} className={className} onClick={openUppy} />
      <Pencil
        className="absolute opacity-0 group-hover:opacity-50 top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        height={42}
        width={42}
        color="white"
      />
    </div>
  );
};
