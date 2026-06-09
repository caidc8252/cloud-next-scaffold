import { Avatar, AvatarFallback } from "@cloud/ui";
import { initials } from "@/lib/format";

// Small identity pill (avatar + email) shown above MFA / workspace / no-company
// steps to remind the operator which account they're completing sign-in for.
export function AccountChip({ name, email }: { name?: string; email?: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-line-default bg-surface-3 py-1 pl-1 pr-3">
      <Avatar size="sm">
        <AvatarFallback className="bg-primary-700 text-xs font-semibold text-white">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate text-xs font-medium text-content-secondary">{email}</span>
    </span>
  );
}
