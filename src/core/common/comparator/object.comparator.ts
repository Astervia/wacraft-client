import { Comparator } from "./comparator.interface";

export class ObjectComparator implements Comparator<Record<string, unknown>> {
    canCompare(val: unknown): val is Record<string, unknown> {
        return (
            typeof val === "object" && val !== null && !Array.isArray(val) && !(val instanceof Date)
        );
    }

    compare(
        a: Record<string, unknown>,
        b: Record<string, unknown>,
        recurse: (x: unknown, y: unknown) => boolean,
    ): boolean {
        const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

        for (const key of allKeys) {
            if (!recurse(a[key], b[key])) return false;
        }
        return true;
    }
}
