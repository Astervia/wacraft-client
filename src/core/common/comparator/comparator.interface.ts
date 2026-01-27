export interface Comparator<T = unknown> {
    /**
     * Determines if this comparator can handle the given value
     */
    canCompare(val: unknown): boolean;

    /**
     * Compares two values of the same type
     * @param a First value
     * @param b Second value
     * @param recurse Function to recursively compare nested values
     */
    compare(a: T, b: T, recurse: (a: unknown, b: unknown) => boolean): boolean;
}
