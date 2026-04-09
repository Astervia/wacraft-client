import { MutexSwapper } from "./mutex-swapper";

describe("MutexSwapper", () => {
    let swapper: MutexSwapper<string>;

    beforeEach(() => {
        swapper = new MutexSwapper<string>();
    });

    it("should allow acquiring and releasing a mutex for a single ID", async () => {
        await swapper.acquire("id1");
        await swapper.release("id1");
    });

    it("should allow sequential acquisitions for the same ID", async () => {
        await swapper.acquire("id1");
        await swapper.release("id1");
        await swapper.acquire("id1");
        await swapper.release("id1");
    });

    it("should block concurrent acquisitions for the same ID", async () => {
        let acquired2 = false;

        await swapper.acquire("id1");

        const p2 = swapper.acquire("id1").then(() => {
            acquired2 = true;
        });

        // Small delay to ensure p2 has a chance to run but should be blocked
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(acquired2).toBe(false);

        await swapper.release("id1");
        await p2;
        expect(acquired2).toBe(true);
        await swapper.release("id1");
    });

    it("should NOT block concurrent acquisitions for different IDs", async () => {
        let acquired1 = false;
        let acquired2 = false;

        await swapper.acquire("id1");
        acquired1 = true;

        await swapper.acquire("id2");
        acquired2 = true;

        expect(acquired1).toBe(true);
        expect(acquired2).toBe(true);

        await swapper.release("id1");
        await swapper.release("id2");
    });

    it("should handle release without acquire gracefully", async () => {
        // Should not throw
        await swapper.release("id1");
    });

    it("should handle multiple releases for the same ID", async () => {
        await swapper.acquire("id1");
        await swapper.release("id1");
        // Second release should be ignored gracefully
        await swapper.release("id1");
    });

    it("should allow re-acquisition after all releases", async () => {
        await swapper.acquire("id1");
        await swapper.release("id1");

        // This should not hang
        await swapper.acquire("id1");
        await swapper.release("id1");
    });
});
