import { Injectable } from "@angular/core";
import { Comparator } from "./comparator.interface";
import { PrimitiveComparator } from "./primitive.comparator";
import { ArrayComparator } from "./array.comparator";
import { ObjectComparator } from "./object.comparator";

@Injectable({ providedIn: "root" })
export class DeepEqualService {
    private comparators: Comparator[] = [
        new PrimitiveComparator(),
        new ArrayComparator(),
        new ObjectComparator(),
    ];

    /**
     * Performs a deep equality comparison between two values.
     * Empty values (null, undefined, "", {}) are normalized to null before comparison.
     */
    areEqual(a: unknown, b: unknown): boolean {
        const normalizedA = this.normalize(a);
        const normalizedB = this.normalize(b);

        for (const comparator of this.comparators) {
            if (comparator.canCompare(normalizedA)) {
                if (!comparator.canCompare(normalizedB)) return false;
                return comparator.compare(normalizedA, normalizedB, (x, y) => this.areEqual(x, y));
            }
        }

        return false;
    }

    /**
     * Normalizes empty values to null for consistent comparison.
     * Empty values include: null, undefined, empty string, empty object
     */
    private normalize(val: unknown): unknown {
        if (this.isEmpty(val)) return null;
        return val;
    }

    /**
     * Checks if a value should be considered "empty"
     */
    private isEmpty(val: unknown): boolean {
        return (
            val === null ||
            val === undefined ||
            val === "" ||
            (typeof val === "object" &&
                !Array.isArray(val) &&
                !(val instanceof Date) &&
                Object.keys(val).length === 0)
        );
    }
}
