import { create } from 'zustand';
import { generateUsername } from '@/lib/utils/formatUsername';

interface OnboardingState {
  currentStep: number;
  displayName: string;
  username: string;
  bio: string;
  avatarFile: File | null;
  avatarPreview: string | null;
  bannerFile: File | null;
  bannerPreview: string | null;
  isSubmitting: boolean;

  // Actions
  setDisplayName: (name: string) => void;
  setUsername: (handle: string) => void;
  setBio: (bio: string) => void;
  setAvatar: (file: File | null) => void;
  setBanner: (file: File | null) => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  currentStep: 1,
  displayName: '',
  username: '',
  bio: '',
  avatarFile: null,
  avatarPreview: null,
  bannerFile: null,
  bannerPreview: null,
  isSubmitting: false,

  setDisplayName: (displayName: string) =>
    set((state) => {
      // Auto-generate username only if user hasn't manually altered it from default pattern
      const autoHandle = generateUsername(displayName);
      return {
        displayName,
        username: autoHandle,
      };
    }),

  setUsername: (username: string) => set({ username }),
  setBio: (bio: string) => set({ bio }),

  setAvatar: (file: File | null) =>
    set((state) => {
      if (state.avatarPreview) URL.revokeObjectURL(state.avatarPreview);
      return {
        avatarFile: file,
        avatarPreview: file ? URL.createObjectURL(file) : null,
      };
    }),

  setBanner: (file: File | null) =>
    set((state) => {
      if (state.bannerPreview) URL.revokeObjectURL(state.bannerPreview);
      return {
        bannerFile: file,
        bannerPreview: file ? URL.createObjectURL(file) : null,
      };
    }),

  setStep: (step: number) => set({ currentStep: step }),
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  prevStep: () => set((state) => ({ currentStep: Math.max(1, state.currentStep - 1) })),
  setIsSubmitting: (isSubmitting: boolean) => set({ isSubmitting }),
  reset: () =>
    set({
      currentStep: 1,
      displayName: '',
      username: '',
      bio: '',
      avatarFile: null,
      avatarPreview: null,
      bannerFile: null,
      bannerPreview: null,
      isSubmitting: false,
    }),
}));