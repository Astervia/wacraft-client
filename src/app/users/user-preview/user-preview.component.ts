import {
    Component,
    ElementRef,
    HostBinding,
    HostListener,
    Input,
    ViewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { SimplifiedDatePipe } from "../../../core/common/pipe/simplified-date.pipe";
import { Role } from "../../../core/user/model/role.model";
import { User } from "../../../core/user/entity/user.entity";

@Component({
    selector: "app-user-preview",
    imports: [SimplifiedDatePipe, CommonModule, RouterModule],
    templateUrl: "./user-preview.component.html",
    styleUrl: "./user-preview.component.scss",
    standalone: true,
})
export class UserPreviewComponent {
    Role = Role;

    @Input("user") user!: User;

    isSelected: boolean = false;

    constructor(private route: ActivatedRoute) {}

    ngOnInit() {
        this.watchQueryParams();
    }

    watchQueryParams() {
        this.route.queryParams.subscribe((params) => {
            this.isSelected = params["user.id"] === this.user.id;
        });
    }

    /* ---------------- focus handling ------------------ */
    /** `ChatsSidebarComponent` toggles this to make just ONE row tabbable */
    @HostBinding("attr.tabindex") tabIndex = -1;
    /** used only for a visual ring */
    @HostBinding("class.focus-ring") isFocused = false;

    /** reference to the root anchor */
    @ViewChild("rootAnchor", { static: true })
    anchor!: ElementRef<HTMLAnchorElement>;

    /** Press Enter or Space ⇒ click the anchor */
    @HostListener("keydown.enter", ["$event"])
    handleKey(e: KeyboardEvent) {
        e.preventDefault(); // avoid page scroll on Space
        this.anchor.nativeElement.click();
    }
}
