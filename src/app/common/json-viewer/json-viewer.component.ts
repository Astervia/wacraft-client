import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";

interface JsonNode {
    key: string;
    value: unknown;
    type: "string" | "number" | "boolean" | "null" | "object" | "array";
    expanded: boolean;
    children?: JsonNode[];
    length?: number;
}

@Component({
    selector: "app-json-viewer",
    imports: [CommonModule],
    templateUrl: "./json-viewer.component.html",
    standalone: true,
})
export class JsonViewerComponent {
    @Input() set json(value: unknown) {
        this.nodes = this.parseValue(value, "root", this.initialDepth);
    }
    @Input() initialDepth = 2;

    nodes: JsonNode[] = [];

    private parseValue(value: unknown, key: string, expandDepth: number): JsonNode[] {
        const node = this.createNode(key, value, expandDepth > 0);

        if (node.type === "object" && value !== null) {
            const obj = value as Record<string, unknown>;
            node.children = Object.keys(obj).flatMap(k => this.parseValue(obj[k], k, expandDepth - 1));
            node.length = Object.keys(obj).length;
        } else if (node.type === "array") {
            const arr = value as unknown[];
            node.children = arr.flatMap((item, index) =>
                this.parseValue(item, index.toString(), expandDepth - 1),
            );
            node.length = arr.length;
        }

        return [node];
    }

    private createNode(key: string, value: unknown, expanded: boolean): JsonNode {
        let type: JsonNode["type"];

        if (value === null) {
            type = "null";
        } else if (Array.isArray(value)) {
            type = "array";
        } else if (typeof value === "object") {
            type = "object";
        } else if (typeof value === "string") {
            type = "string";
        } else if (typeof value === "number") {
            type = "number";
        } else if (typeof value === "boolean") {
            type = "boolean";
        } else {
            type = "string";
        }

        return { key, value, type, expanded };
    }

    copiedNode: JsonNode | null = null;

    toggleNode(node: JsonNode): void {
        if (node.type === "object" || node.type === "array") {
            node.expanded = !node.expanded;
        }
    }

    isExpandable(node: JsonNode): boolean {
        return (node.type === "object" || node.type === "array") && (node.length ?? 0) > 0;
    }

    isCopyable(node: JsonNode): boolean {
        return node.type === "object" || node.type === "array";
    }

    async copyNode(node: JsonNode, event: Event): Promise<void> {
        event.stopPropagation();
        try {
            const jsonString = JSON.stringify(node.value, null, 2);
            await navigator.clipboard.writeText(jsonString);
            this.copiedNode = node;
            setTimeout(() => {
                this.copiedNode = null;
            }, 1500);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    }

    getDisplayValue(node: JsonNode): string {
        switch (node.type) {
            case "string":
                return `"${node.value}"`;
            case "null":
                return "null";
            case "boolean":
            case "number":
                return String(node.value);
            case "object":
                return node.expanded ? "{" : `{ ${node.length} keys }`;
            case "array":
                return node.expanded ? "[" : `[ ${node.length} items ]`;
            default:
                return String(node.value);
        }
    }

    getClosingBracket(node: JsonNode): string {
        if (!node.expanded) return "";
        return node.type === "array" ? "]" : "}";
    }
}
