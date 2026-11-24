/** Shared look of the header's buttons and menus, so the bell, the account menu and the mobile drawer match. */

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

/** A round, borderless icon button (bell, hamburger, close). */
export const ICON_BUTTON = `flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 ${FOCUS_RING} dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white`;

/** The floating panel behind a dropdown menu. */
export const MENU_PANEL = "rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-pop dark:border-slate-700 dark:bg-slate-900";

const MENU_ITEM_BASE = `flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm font-medium text-slate-700 transition-colors dark:text-slate-200 ${FOCUS_RING}`;

export const MENU_ITEM = `${MENU_ITEM_BASE} hover:bg-slate-100 dark:hover:bg-slate-800`;
export const MENU_ITEM_DANGER = `${MENU_ITEM_BASE} hover:bg-red-50 dark:hover:bg-red-950/40`;

export const MENU_DIVIDER = "my-1.5 h-px bg-slate-100 dark:bg-slate-800";