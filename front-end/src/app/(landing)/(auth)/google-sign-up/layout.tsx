import "@/app/globals.css";
import { Suspense } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<div className="w-full text-center">Loading...</div>}>
      {children}
    </Suspense>
  );
}

    
