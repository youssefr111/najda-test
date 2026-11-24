import type { User } from "@/types/user";

type Props = {
  user: Pick<User, "firstName" | "lastName" | "email">;
  className?: string;
};

// U+200C keeps adjacent Arabic letters from joining into a single word-shape; it is invisible for Latin names.
const NON_JOINER = "\u200C";

function getInitials({ firstName, lastName, email }: Props["user"]) {
  const [first = email[0] ?? "?"] = Array.from(firstName?.trim() ?? "");
  const [last = ""] = Array.from(lastName?.trim() ?? "");
  return last ? `${first}${NON_JOINER}${last}` : first;
}

/** Initials in a soft brand-tinted circle. Decorative: the name is always rendered next to it. */
export default function UserAvatar({ user, className = "h-8 w-8 text-xs" }: Props) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 select-none items-center justify-center rounded-full bg-red-50 font-semibold uppercase text-red-700 ring-1 ring-inset ring-red-100 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-900/60 ${className}`}
    >
      {getInitials(user)}
    </span>
  );
}