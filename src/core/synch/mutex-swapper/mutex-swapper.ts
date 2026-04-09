import { Mutex } from "async-mutex";

export class MutexSwapper<T> {
    private mu = new Mutex();
    private mutexes = new Map<T, Mutex>();
    private usageCount = new Map<T, number>();

    async acquire(msgId: T) {
        await this.mu.acquire();
        let mutex = this.mutexes.get(msgId);

        if (!mutex) {
            mutex = new Mutex();
            this.mutexes.set(msgId, mutex);
        }

        this.usageCount.set(msgId, (this.usageCount.get(msgId) ?? 0) + 1);

        this.mu.release();

        await mutex.acquire();
    }

    async release(msgId: T) {
        await this.mu.acquire();

        const mutex = this.mutexes.get(msgId);
        if (!mutex) return this.mu.release();

        let qttAcquired = this.usageCount.get(msgId);
        if (!qttAcquired) return this.mu.release();

        qttAcquired--;
        if (qttAcquired) {
            this.usageCount.set(msgId, qttAcquired);
        } else {
            this.usageCount.delete(msgId);
            this.mutexes.delete(msgId);
        }

        this.mu.release();

        mutex.release();
    }
}
