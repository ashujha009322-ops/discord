import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// 1. Create a skeleton or spinner for the fallback state
function OnboardingFallback() {
  return <div>Loading your dashboard environment...</div>;
}

// 2. Isolate the dynamic checks inside a leaf component
async function DashboardGuard({ children }: { children: React.ReactNode }) {
  await auth.protect();
  const user = await currentUser();

  const userId = await prisma.user.findFirst({
    where: {
      clerkId: user?.id,
    },
  });

  if (!userId) {
    redirect("/onboarding");
  }

  return <>{children}</>;
}

// 3. Keep the main Layout entry static
export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <Suspense fallback={<OnboardingFallback />}>
        <DashboardGuard>{children}</DashboardGuard>
      </Suspense>
    </div>
  );
}
