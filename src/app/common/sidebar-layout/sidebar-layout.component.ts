import { Component, Input } from "@angular/core";
import { SidebarComponent } from "../sidebar/sidebar.component";
import { RoutePath } from "../../app.routes";
import { HomeFragment } from "../../home/model/home-fragment.model";

@Component({
    selector: "app-sidebar-layout",
    imports: [SidebarComponent],
    templateUrl: "./sidebar-layout.component.html",
    standalone: true,
})
export class SidebarLayoutComponent {
    @Input() activePage!: RoutePath | HomeFragment;
}
