export interface IMessageStatusIcon {
    type: "inline-svg" | "font";
    svgContent?: string;
    iconClass?: string;
    colorClass?: string;
    alt: string;
    width?: string;
}

export const STATUS_ICON_REPOSITORY: Record<string, IMessageStatusIcon> = {
    sent: {
        type: "inline-svg",
        svgContent:
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><polyline points="20 6 9 17 4 12"></polyline></svg>',
        colorClass: "text-gray-500 dark:text-gray-400",
        alt: "Message sent",
        width: "10px",
    },
    delivered: {
        type: "inline-svg",
        svgContent:
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><polyline points="18 6 7 17 2 12"></polyline><path d="M22 10l-9.5 9.5-1.5-1.5"></path></svg>',
        colorClass: "text-gray-500 dark:text-gray-400",
        alt: "Message delivered",
        width: "15px",
    },
    read: {
        type: "inline-svg",
        svgContent:
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><polyline points="18 6 7 17 2 12"></polyline><path d="M22 10l-9.5 9.5-1.5-1.5"></path></svg>',
        colorClass: "text-emerald-500 dark:text-emerald-400",
        alt: "Message read",
        width: "15px",
    },
    failed: {
        type: "font",
        iconClass: "fa fa-exclamation-circle text-xm text-red-600",
        alt: "Message failed",
    },
};
