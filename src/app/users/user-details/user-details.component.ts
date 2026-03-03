import { Component, OnInit, ViewChild, inject } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { Role } from "../../../core/user/model/role.model";
import { User } from "../../../core/user/entity/user.entity";
import { QueryParamsService } from "../../../core/navigation/service/query-params.service";
import { UserControllerService } from "../../../core/user/controller/user-controller.service";
import { UserStoreService } from "../../../core/user/store/user-store.service";
import { NGXLogger } from "ngx-logger";
import { MatTooltipModule } from "@angular/material/tooltip";
import { TimeoutErrorModalComponent } from "../../common/timeout-error-modal/timeout-error-modal.component";
import { isHttpError } from "../../../core/common/model/http-error-shape.model";
import { CopyButtonComponent } from "../../common/copy-button/copy-button.component";

@Component({
    selector: "app-user-details",
    imports: [
        FormsModule,
        CommonModule,
        MatIconModule,
        MatTooltipModule,
        TimeoutErrorModalComponent,
        CopyButtonComponent,
    ],
    templateUrl: "./user-details.component.html",
    styleUrl: "./user-details.component.scss",
    preserveWhitespaces: false,
    standalone: true,
})
export class UserDetailsComponent implements OnInit {
    private queryParamsService = inject(QueryParamsService);
    private userController = inject(UserControllerService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    userStore = inject(UserStoreService);
    private logger = inject(NGXLogger);

    Role = Role;
    Event = Event;

    user!: User;
    userId?: string;

    isEditing = false;

    @ViewChild("errorModal") errorModal!: TimeoutErrorModalComponent;

    ngOnInit(): void {
        this.watchQueryParams();
    }

    async saveChanges() {
        if (this.user)
            try {
                if (!this.userId) {
                    const wh = await this.userController.create({
                        email: this.user.email,
                        name: this.user.name,
                        password: this.user.password,
                        role: this.user.role || Role.user,
                    });
                    await this.router.navigate([], {
                        queryParams: {
                            "user.id": wh.id,
                            ...this.queryParamsService.globalQueryParams,
                        },
                        preserveFragment: true,
                        queryParamsHandling: "replace",
                    });
                    window.location.reload();
                    return;
                }
                await this.userController.update({
                    id: this.userId,
                    name: this.user.name,
                    email: this.user.email,
                    role: this.user.role,
                });
                this.isEditing = false;
                return;
            } catch (error) {
                this.handleErr("Error saving changes", error);
            }
    }

    watchQueryParams() {
        this.route.queryParams.subscribe(async params => {
            const userId = params["user.id"];
            if (!(userId != this.userId)) return await this.loadUser();
            this.userId = userId;
            return await this.loadUser();
        });
    }

    async loadUser() {
        if (!this.userId) {
            this.user = {
                id: "",
                name: "",
                email: "",
                password: "",
                role: Role.user,
                created_at: new Date(),
                updated_at: new Date(),
            };
            this.isEditing = true;
            return;
        }
        this.isEditing = false;
        try {
            this.user = await this.userStore.getById(this.userId);
        } catch (error) {
            this.handleErr("Error loading user", error);
            return;
        }
    }

    toggleEdit() {
        this.isEditing = !this.isEditing;
    }

    cancelEdit() {
        if (!this.userId) {
            this.user = {
                id: "",
                name: "",
                email: "",
                password: "",
                role: Role.user,
                created_at: new Date(),
                updated_at: new Date(),
            };
            this.isEditing = true;
            return;
        }
        this.isEditing = false;
        this.loadUser();
    }

    async delete() {
        if (!this.userId) return;

        // Show confirmation alert
        const confirmed = window.confirm(
            "Are you sure you want to delete this user? This action cannot be undone.",
        );

        // If the user confirms, proceed with the deletion
        if (confirmed) {
            try {
                await this.userController.delete(this.userId);
                await this.resetUserId();
                window.location.reload();
                this.resetUserId(); // Call to reset or clean up after deletion
            } catch (error) {
                this.handleErr("Error deleting user", error);
                return;
            }
        }
    }

    async resetUserId() {
        await this.router.navigate([], {
            queryParams: this.queryParamsService.globalQueryParams,
            preserveFragment: true,
            queryParamsHandling: "replace",
        });
    }

    showPassword = false;
    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }

    errorStr = "";
    errorData: unknown;
    handleErr(message: string, err: unknown) {
        if (isHttpError(err)) {
            this.errorData = err.response?.data;
            this.errorStr = err.response?.data?.description ?? message;
        } else {
            this.errorData = err;
            this.errorStr = message;
        }

        this.logger.error("Async error", err);
        this.errorModal.openModal();
    }
}
