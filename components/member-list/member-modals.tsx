"use client";

import React from "react";
import { MemberProfileDialog } from "./member-profile-dialog";
import { MemberModerationModals } from "./member-moderation-modals";

export function MemberModals() {
  return (
    <>
      <MemberProfileDialog />
      <MemberModerationModals />
    </>
  );
}
