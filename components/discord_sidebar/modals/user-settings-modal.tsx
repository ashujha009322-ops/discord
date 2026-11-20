"use client";

import React, { useState } from "react";
import { User } from "../types";
import {
  X,
  LogOut,
  User as UserIcon,
  Shield,
  Palette,
  Volume2,
  Key,
} from "lucide-react";

interface UserSettingsModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

export function UserSettingsModal({
  user,
  isOpen,
  onClose,
}: UserSettingsModalProps) {
  const [activeTab, setActiveTab] = useState("profile");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#313338] flex select-none animate-in fade-in duration-150">
      {/* Left Navigation Menu */}
      <div className="w-60 bg-[#2b2d31] flex flex-col items-end pr-6 py-14 border-r border-[#1f2023] shrink-0">
        <div className="w-48 space-y-4 text-xs font-bold text-[#949ba4]">
          <div className="space-y-0.5">
            <span className="uppercase tracking-wider px-2 block mb-1">
              User Settings
            </span>
            <button
              onClick={() => setActiveTab("account")}
              className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-md font-semibold text-sm transition ${
                activeTab === "account"
                  ? "bg-[#404249] text-white"
                  : "text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]"
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>My Account</span>
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-md font-semibold text-sm transition ${
                activeTab === "profile"
                  ? "bg-[#404249] text-white"
                  : "text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]"
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Profiles</span>
            </button>
          </div>

          <div className="h-[1px] bg-[#3f4147]" />

          <div className="space-y-0.5">
            <span className="uppercase tracking-wider px-2 block mb-1">
              App Settings
            </span>
            <button
              onClick={() => setActiveTab("appearance")}
              className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-md font-semibold text-sm transition ${
                activeTab === "appearance"
                  ? "bg-[#404249] text-white"
                  : "text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]"
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Appearance</span>
            </button>
            <button
              onClick={() => setActiveTab("voice")}
              className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-md font-semibold text-sm transition ${
                activeTab === "voice"
                  ? "bg-[#404249] text-white"
                  : "text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]"
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>Voice & Video</span>
            </button>
          </div>

          <div className="h-[1px] bg-[#3f4147]" />

          <button className="w-full flex items-center space-x-2 px-2 py-1.5 rounded-md font-semibold text-sm text-[#f23f43] hover:bg-[#f23f43]/10 transition">
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Main Settings Content Canvas */}
      <div className="flex-1 flex justify-between px-10 py-14 overflow-y-auto no-scrollbar">
        <div className="max-w-xl w-full space-y-6">
          <h2 className="text-xl font-bold text-white">User Profile</h2>

          {/* Profile Customizer Card */}
          <div className="bg-[#1e1f22] rounded-lg overflow-hidden border border-[#2b2d31] p-4 space-y-4">
            <div className="h-24 bg-[#5865f2] rounded-t-md relative">
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-20 h-20 rounded-full border-4 border-[#1e1f22] absolute -bottom-10 left-4 bg-[#2b2d31] object-cover"
              />
            </div>

            <div className="pt-8 px-2 space-y-3">
              <div>
                <h3 className="text-lg font-bold text-white">{user.name}</h3>
                <p className="text-xs text-[#949ba4]">{user.username}</p>
              </div>

              <div className="h-[1px] bg-[#2b2d31]" />

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider">
                  About Me
                </label>
                <textarea
                  rows={3}
                  defaultValue="Building cool Next.js and shadcn UI interfaces!"
                  className="w-full bg-[#2b2d31] text-sm text-white rounded p-2 focus:outline-none border border-[#3f4147] focus:border-[#5865f2] resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Close Button Column */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="flex flex-col items-center group text-[#b5bac1] hover:text-white"
          >
            <div className="border-2 border-[#b5bac1] group-hover:border-white rounded-full p-1.5 transition">
              <X className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold mt-1 uppercase">ESC</span>
          </button>
        </div>
      </div>
    </div>
  );
}
