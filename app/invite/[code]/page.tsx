import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AcceptInviteButton } from "@/components/invitemodal/AcceptInviteButton";
import { InviteCard } from "@/components/invitemodal/InviteCard";
import { INVITE_CODE_REGEX } from "@/features/invite/constants";
import {
  getInvitePreview,
  getJoinEligibility,
} from "@/features/invite/actions/join.action";
import { INVITE_STATUS_MESSAGES } from "@/features/invite/types";
import { findUserIdByClerkId } from "@/features/invite/query";
import { guildChannelPath } from "@/features/invite/actions/guildChannelPath";
import { buildInviteUrl } from "@/features/invite/url";

export const metadata = {
  title: "Server invite",
  robots: {
    index: false,
    follow: false,
  },
};

const homeLink = (
  <Link href="/" className="text-sm text-[#00a8fc] hover:underline">
    Go to the app
  </Link>
);

type InvitePageProps = {
  params: Promise<{ code: string }>;
};

/**
 * Suspense boundary for dynamically rendered invite content.
 */
export default function InvitePage({ params }: InvitePageProps) {
  return (
    <Suspense
      fallback={
        <InviteCard
          title="Loading invitation..."
          description="Please wait while we load your invitation."
        />
      }
    >
      <InvitePageContent params={params} />
    </Suspense>
  );
}

/**
 * Dynamic invite page content.
 */
async function InvitePageContent({ params }: InvitePageProps) {
  // Wait for an incoming request before accessing dynamic data.
  await connection();

  const { code } = await params;

  // 1. Validate and preview the invitation.
  const preview = INVITE_CODE_REGEX.test(code)
    ? await getInvitePreview(code)
    : null;

  if (!preview || preview.status !== "valid" || !preview.guild) {
    const status =
      preview && preview.status !== "valid" ? preview.status : "not_found";

    const message = INVITE_STATUS_MESSAGES[status];

    return (
      <InviteCard title={message.title} description={message.description}>
        {homeLink}
      </InviteCard>
    );
  }

  // 2. Require authentication for valid invitations.
  const { userId: clerkId, redirectToSignIn } = await auth();

  if (!clerkId) {
    return redirectToSignIn({
      returnBackUrl: buildInviteUrl(code),
    });
  }

  // 3. Resolve the internal user ID.
  const userId = await findUserIdByClerkId(clerkId);

  if (!userId) {
    return (
      <InviteCard
        title="Almost there"
        description="Your account is still being set up. Refresh this page in a moment."
      />
    );
  }

  // 4. Check membership and ban status.
  const eligibility = await getJoinEligibility(preview.guild.id, userId);

  if (eligibility === "already_member") {
    redirect(guildChannelPath(preview.guild.id, preview.channelId));
  }

  if (eligibility === "banned") {
    return (
      <InviteCard
        title="Unable to join"
        description="You are not able to join this server."
      >
        {homeLink}
      </InviteCard>
    );
  }

  // 5. Display the invitation.
  const { memberCount } = preview.guild;

  return (
    <InviteCard
      badge="You have been invited to join"
      title={preview.guild.name}
      description={`${memberCount} ${memberCount === 1 ? "member" : "members"}`}
    >
      <AcceptInviteButton code={code} />
    </InviteCard>
  );
}
