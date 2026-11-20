/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { CreateChannelModal } from "./create-channel-modal";
import { CreateCategoryModal } from "./create-category-modal";
import { EditChannelModal } from "./edit-channel-modal";
import { DeleteChannelModal } from "./delete-channel-modal";
import { InviteModal } from "@/components/invitemodal/InviteModal"; // CONFIRM: same path as in InviteModal.tsx

export function ModalProvider() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <CreateChannelModal />
      <CreateCategoryModal />
      <EditChannelModal />
      <DeleteChannelModal />
      <InviteModal />
    </>
  );
}
