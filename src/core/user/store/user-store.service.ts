import { Injectable, inject } from "@angular/core";
import { User } from "../entity/user.entity";
import { UserControllerService } from "../controller/user-controller.service";
import { Query } from "../model/query.model";
import { DateOrderEnum } from "../../common/model/date-order.model";
import { NGXLogger } from "ngx-logger";

@Injectable({
    providedIn: "root",
})
export class UserStoreService {
    private userController = inject(UserControllerService);
    private logger = inject(NGXLogger);

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

        this.add(users);
    }

    add(users: User[]) {
        this.addUsersToUsersById(users);
        this.users = [...this.users, ...users];
    }

    addSearch(users: User[]) {
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
        this.searchUsers = [];

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

        this.addSearch(users);
    }

    async getSearch(): Promise<void> {
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

        this.addSearch(users);
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

    async getById(id: string): Promise<User> {
        const user = this.usersById.get(id);
        if (user) return user;
        const newUser = (await this.userController.get({ id: id }))[0];
        this.usersById.set(id, newUser);
        return newUser;
    }
}
