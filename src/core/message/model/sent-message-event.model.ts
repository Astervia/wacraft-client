import { MessageFields } from "../entity/message.entity";
import { SenderData } from "./sender-data.model";

export interface SentMessageEvent {
    senderData: SenderData;
    httpResponse?: Promise<MessageFields>;
}
