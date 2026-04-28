import { Injectable, inject } from "@angular/core";
import { User } from "../entity/user.entity";
import { UserControllerService } from "../controller/user-controller.service";
import { Query } from "../model/query.model";
import { DateOrderEnum } from "../../common/model/date-order.model";
import { NGXLogger } from "ngx-logger";
import { Mutex } from "async-mutex";

@Injectable({
    providedIn: "root",
})
export class UserStoreService {
    private userController = inject(UserControllerService);
    private logger = inject(NGXLogger);
    private listMutex = new Mutex();

    private paginationLimit = 15;

    public reachedMaxLimit = false;
    public reachedMaxSearchLimit = false;
    currentUser!: User;
    billingEnabled = false;

    searchMode: "email" | "name" | "role" = "email";

    searchValue = "";
    searchFilters: {
        text: string;
        query?: Query;
    }[] = [];

    users: User[] = [];
    searchUsers: User[] = [];
    usersById = new Map<string, User>();

    public isExecuting = false;
    public pendingExecution = false;

    private async withListLock<T>(fn: () => Promise<T>): Promise<T> {
        await this.listMutex.acquire();
        try {
            return await fn();
        } finally {
            this.listMutex.release();
        }
    }

    async loadCurrent() {
        try {
            if (!this.currentUser) await this.getCurrent();
        } catch (error) {
            this.logger.error("Error loading current user", error);
        }
    }

    async getCurrent(): Promise<User> {
        const { user: fetchedUser, billingEnabled } = await this.userController.getCurrentUser();
        const user = { ...fetchedUser, password: "" };
        this.currentUser = user;
        this.billingEnabled = billingEnabled;
        this.usersById.set(user.id, user);
        return user;
    }

    async get(): Promise<void> {
        await this.withListLock(async () => {
            const users = await this.userController.get(
                undefined,
                {
                    limit: this.paginationLimit,
                    offset: this.users.length,
                },
                { created_at: DateOrderEnum.desc },
            );

            if (!users.length) {
                this.reachedMaxLimit = true;
                return;
            }

            this.addUnsafe(users);
        });
    }

    add(users: User[]) {
        void this.withListLock(async () => {
            this.addUnsafe(users);
        });
    }

    addSearch(users: User[]) {
        void this.withListLock(async () => {
            this.addSearchUnsafe(users);
        });
    }

    private addUnsafe(users: User[]) {
        this.addUsersToUsersById(users);
        this.users = [...this.users, ...users];
    }

    private addSearchUnsafe(users: User[]) {
        this.addUsersToUsersById(users);
        this.searchUsers = [...this.searchUsers, ...users];
    }

    getInitialSearchConcurrent() {
        if (!this.searchValue) return;

        if (this.isExecuting) {
            // If an execution is already in progress, mark that another execution is pending
            if (!this.pendingExecution) this.pendingExecution = true;
            // Do nothing else to prevent multiple queues
            return;
        }

        // No execution is in progress, so start one
        this.isExecuting = true;

        this.getInitialSearch()
            .then(() => {
                // Execution finished
                this.isExecuting = false;

                // If there's a pending execution, reset the flag and execute again
                if (this.pendingExecution) {
                    this.pendingExecution = false;
                    this.getInitialSearchConcurrent();
                }
            })
            .catch(error => {
                // Handle errors if necessary
                this.logger.error("Error in getInitialSearchConcurrent:", error);
                this.isExecuting = false;

                // Even if there's an error, check for pending execution
                if (this.pendingExecution) {
                    this.pendingExecution = false;
                    this.getInitialSearchConcurrent();
                }
            });
    }

    async getInitialSearch(): Promise<void> {
        await this.withListLock(async () => {
            this.searchUsers = [];
            this.reachedMaxSearchLimit = false;

            const users = await this.userController.contentLike(
                `%${this.searchValue}%`,
                this.searchMode,
                this.searchFilters.reduce((acc, filter) => {
                    return { ...acc, ...filter.query };
                }, {}),
                {
                    limit: this.paginationLimit,
                    offset: this.searchUsers.length,
                },
                { created_at: DateOrderEnum.desc },
            );

            if (!users.length) {
                this.reachedMaxSearchLimit = true;
                return;
            }

            this.addSearchUnsafe(users);
        });
    }

    async getSearch(): Promise<void> {
        await this.withListLock(async () => {
            const users = await this.userController.contentLike(
                `%${this.searchValue}%`,
                "url",
                this.searchFilters.reduce((acc, filter) => {
                    return { ...acc, ...filter.query };
                }, {}),
                {
                    limit: this.paginationLimit,
                    offset: this.searchUsers.length,
                },
                { created_at: DateOrderEnum.desc },
            );

            if (!users.length) {
                this.reachedMaxSearchLimit = true;
                return;
            }

            this.addSearchUnsafe(users);
        });
    }

    async addFilter(filter: { text: string; query?: Query }) {
        this.searchFilters.push(filter);
        await this.getInitialSearch();
    }

    async removeFilter(filter: { text: string; query?: Query }) {
        this.searchFilters = this.searchFilters.filter(
            searchFilter => searchFilter.text !== filter.text,
        );
        await this.getInitialSearch();
    }

    async addUsersToUsersById(users: User[]) {
        users.forEach(u => {
            this.usersById.set(u.id, u);
        });
    }

    private matchesCurrentSearch(user: User): boolean {
        if (!this.searchValue || this.searchFilters.length > 0) return false;

        const searchValue = this.searchValue.toLowerCase();
        switch (this.searchMode) {
            case "name":
                return user.name.toLowerCase().includes(searchValue);
            case "email":
                return user.email.toLowerCase().includes(searchValue);
            case "role":
                return user.role.toLowerCase().includes(searchValue);
        }
    }

    async prependUser(user: User): Promise<void> {
        await this.withListLock(async () => {
            this.usersById.set(user.id, user);
            this.users = [user, ...this.users.filter(current => current.id !== user.id)];

            if (this.matchesCurrentSearch(user)) {
                this.searchUsers = [
                    user,
                    ...this.searchUsers.filter(current => current.id !== user.id),
                ];
            }
        });
    }

    async syncUser(user: User): Promise<void> {
        await this.withListLock(async () => {
            this.usersById.set(user.id, user);
            this.users = this.users.map(current => (current.id === user.id ? user : current));

            const searchIndex = this.searchUsers.findIndex(current => current.id === user.id);
            if (searchIndex !== -1) {
                this.searchUsers = this.searchUsers.map(current =>
                    current.id === user.id ? user : current,
                );
            } else if (this.matchesCurrentSearch(user)) {
                this.searchUsers = [user, ...this.searchUsers];
            }
        });
    }

    async removeUser(id: string): Promise<void> {
        await this.withListLock(async () => {
            this.usersById.delete(id);
            this.users = this.users.filter(user => user.id !== id);
            this.searchUsers = this.searchUsers.filter(user => user.id !== id);
        });
    }

    async getById(id: string): Promise<User> {
        const user = this.usersById.get(id);
        if (user) return user;
        const newUser = (await this.userController.get({ id: id }))[0];
        this.usersById.set(id, newUser);
        return newUser;
    }
}
