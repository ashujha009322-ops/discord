import type { ReactNode } from "react";

/** Centered card used by every state of the invite page. Server-component safe. */
export function InviteCard(props: {
  title: string;
  description?: string;
  badge?: string;
  children?: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1e1f22] p-4">
      <div className="w-full max-w-[440px] rounded-lg bg-[#313338] p-8 text-center text-[#dbdee1] shadow-xl">
        {props.badge && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#b5bac1]">
            {props.badge}
          </p>
        )}
        <h1 className="break-words text-2xl font-semibold text-white">
          {props.title}
        </h1>
        {props.description && (
          <p className="mt-2 text-[#b5bac1]">{props.description}</p>
        )}
        {props.children && <div className="mt-6">{props.children}</div>}
      </div>
    </main>
  );
}