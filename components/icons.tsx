import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

function Base({ children, ...p }: P) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...p}
    >
      {children}
    </svg>
  );
}

export const IconMenu = (p: P) => (
  <Base {...p}>
    <path d="M4 7h16M4 12h10M4 17h16" />
  </Base>
);
export const IconGrid = (p: P) => (
  <Base {...p}>
    <rect x="4" y="4" width="7" height="9" rx="2" />
    <rect x="13" y="4" width="7" height="5" rx="2" />
    <rect x="13" y="11" width="7" height="9" rx="2" />
    <rect x="4" y="15" width="7" height="5" rx="2" />
  </Base>
);
export const IconPie = (p: P) => (
  <Base {...p}>
    <path d="M12 3v9h9" />
    <path d="M20.5 15.5A9 9 0 1 1 8.5 3.7" />
  </Base>
);
export const IconLayers = (p: P) => (
  <Base {...p}>
    <path d="M12 3 3 8l9 5 9-5-9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </Base>
);
export const IconUsers = (p: P) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
  </Base>
);
export const IconDoc = (p: P) => (
  <Base {...p}>
    <path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M14 3v5h5M9 13h6M9 17h6" />
  </Base>
);
export const IconBell = (p: P) => (
  <Base {...p}>
    <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </Base>
);
export const IconUser = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Base>
);
export const IconPlus = (p: P) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);
export const IconSync = (p: P) => (
  <Base {...p}>
    <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
    <path d="M4 4v4h4" />
    <path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
    <path d="M20 20v-4h-4" />
  </Base>
);
export const IconSearch = (p: P) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Base>
);
export const IconX = (p: P) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
);
export const IconChevron = (p: P) => (
  <Base {...p}>
    <path d="m6 9 6 6 6-6" />
  </Base>
);
export const IconArrowRight = (p: P) => (
  <Base {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Base>
);
export const IconCalendar = (p: P) => (
  <Base {...p}>
    <rect x="4" y="5" width="16" height="15" rx="3" />
    <path d="M4 10h16M8 3v4M16 3v4" />
  </Base>
);
export const IconCheck = (p: P) => (
  <Base {...p}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="m8.5 12.5 2.5 2.5 4.5-5" />
  </Base>
);
export const IconFlag = (p: P) => (
  <Base {...p}>
    <path d="M5 21V4h11l-1.5 4L16 12H5" />
  </Base>
);
export const IconPlay = (p: P) => (
  <Base {...p} fill="currentColor" stroke="none">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5Z" />
  </Base>
);
export const IconVideo = (p: P) => (
  <Base {...p}>
    <rect x="3" y="6" width="13" height="12" rx="3" />
    <path d="m16 10 5-3v10l-5-3" />
  </Base>
);
export const IconExternal = (p: P) => (
  <Base {...p}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Base>
);
export const IconBuilding = (p: P) => (
  <Base {...p}>
    <rect x="4" y="3" width="10" height="18" rx="1.5" />
    <path d="M14 9h5a1 1 0 0 1 1 1v11H14M7.5 7h3M7.5 11h3M7.5 15h3" />
  </Base>
);
export const IconTool = (p: P) => (
  <Base {...p}>
    <path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5a4 4 0 0 0-2-2Z" />
  </Base>
);
export const IconBook = (p: P) => (
  <Base {...p}>
    <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15Z" />
    <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19" />
  </Base>
);
export const IconCommand = (p: P) => (
  <Base {...p}>
    <path d="M9 9V6.5A2.5 2.5 0 1 0 6.5 9H9Zm0 0h6m-6 0v6m6-6V6.5A2.5 2.5 0 1 1 17.5 9H15Zm0 0v6m0 0h-6m6 0v2.5a2.5 2.5 0 1 0 2.5-2.5H15Zm-6 0v2.5A2.5 2.5 0 1 1 6.5 15H9Z" />
  </Base>
);
export const IconTarget = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="0.5" fill="currentColor" />
  </Base>
);
export const IconHeart = (p: P) => (
  <Base {...p}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
  </Base>
);
export const IconChevronLeft = (p: P) => (
  <Base {...p}>
    <path d="m15 6-6 6 6 6" />
  </Base>
);
