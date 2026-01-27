import { Comparator } from "./comparator.interface";

type Primitive = string | number | boolean | symbol | null | undefined | Date;

export class PrimitiveComparator implements Comparator<Primitive> {
    canCompare(val: unknown): val is Primitive {
        return val === null || typeof val !== "object" || val instanceof Date;
    }

    compare(a: Primitive, b: Primitive): boolean {
        if (a instanceof Date && b instanceof Date) {
            return a.getTime() === b.getTime();
        }
        return a === b;
    }
}
