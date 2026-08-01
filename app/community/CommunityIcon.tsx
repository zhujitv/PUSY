export type CommunityIconName = "home" | "spark" | "pen" | "user" | "bell" | "heart" | "comment" | "bookmark" | "share" | "chevron" | "shield" | "check";

export function CommunityIcon({ name, size = 20 }: { name: CommunityIconName; size?: number }) {
  const paths: Record<CommunityIconName, React.ReactNode> = {
    home: <><path d="M3.5 10.5 12 3l8.5 7.5" /><path d="M5.5 9.5V21h13V9.5M9 21v-7h6v7" /></>,
    spark: <><path d="m12 3 1.3 4.2L17.5 8.5l-4.2 1.3L12 14l-1.3-4.2-4.2-1.3 4.2-1.3L12 3Z" /><path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" /></>,
    pen: <><path d="m4 20 4.2-1 10.4-10.4a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" /><path d="m13.8 7.4 2.8 2.8" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4.8 21a7.2 7.2 0 0 1 14.4 0" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8.5h18C21 16 18 16 18 9Z" /><path d="M10 21h4" /></>,
    heart: <path d="M20.8 5.8a5.2 5.2 0 0 0-7.4 0L12 7.2l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 22l8.8-8.8a5.2 5.2 0 0 0 0-7.4Z" />,
    comment: <path d="M21 11.5a8.2 8.2 0 0 1-9 8.1 9.5 9.5 0 0 1-3.7-1L3 20l1.6-4.5A8.1 8.1 0 1 1 21 11.5Z" />,
    bookmark: <path d="M6 3.5h12v17L12 17l-6 3.5v-17Z" />,
    share: <><circle cx="18" cy="5" r="2.3" /><circle cx="6" cy="12" r="2.3" /><circle cx="18" cy="19" r="2.3" /><path d="m8 10.8 8-4.6M8 13.2l8 4.6" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    shield: <><path d="M12 3 20 6v5c0 5.2-3.4 8.6-8 10-4.6-1.4-8-4.8-8-10V6l8-3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
