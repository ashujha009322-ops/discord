import { create } from "zustand";
import {  ChannelType } from "@/app/generated/prisma/enums";
import { Channel } from "@/app/generated/prisma/client";

export type ModalType =
  | "createChannel"
  | "createCategory"
  | "editChannel"
  | "editCategory"
  | "deleteChannel"
  | "invite";

export interface ModalData {
  guildId?: string;
  channel?: Channel;
  channelType?: ChannelType;
  parentId?: string | null;
}
export interface ModalData {
  guildId?: string;
  guildName?: string;          // add this
  channel?: Channel;
  channelId?: string | null;   // add this
  channelType?: ChannelType;
  parentId?: string | null;
}

interface ModalStore {
  type: ModalType | null;
  data: ModalData;
  isOpen: boolean;
  onOpen: (type: ModalType, data?: ModalData) => void;
  onClose: () => void;
}

export const useModal = create<ModalStore>((set) => ({
  type: null,
  data: {},
  isOpen: false,
  onOpen: (type, data = {}) => set({ isOpen: true, type, data }),
  onClose: () => set({ type: null, isOpen: false, data: {} }),
}));