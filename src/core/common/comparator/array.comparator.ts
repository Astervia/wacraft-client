import { Comparator } from "./comparator.interface";

export class ArrayComparator implements Comparator<unknown[]> {
    canCompare(val: unknown): val is unknown[] {
        return Array.isArray(val);
    }

    compare(a: unknown[], b: unknown[], recurse: (x: unknown, y: unknown) => boolean): boolean {
        if (a.length !== b.length) return false;
        return a.every((val, i) => recurse(val, b[i]));
    }
}
