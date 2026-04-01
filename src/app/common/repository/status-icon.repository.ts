export interface IMessageStatusIcon {
    type: "image" | "font";
    src?: string;
    iconClass?: string;
    alt: string;
    width?: string;
}

export const STATUS_ICON_REPOSITORY: Record<string, IMessageStatusIcon> = {
    sent: {
        type: "image",
        src: "assets/icons/flaticon/check-mark.png",
        alt: "Message sent",
        width: "10px",
    },
    delivered: {
        type: "image",
        src: "assets/icons/flaticon/double-check-mark.png",
        alt: "Message delivered",
        width: "15px",
    },
    read: {
        type: "image",
        src: "assets/icons/flaticon/double-green-check-mark.png",
        alt: "Message read",
        width: "15px",
    },
    failed: {
        type: "font",
        iconClass: "fa fa-exclamation-circle text-xm text-red-600",
        alt: "Message failed",
    },
};
