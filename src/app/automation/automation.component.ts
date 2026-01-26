import { Component } from "@angular/core";
import { NodeRedComponent } from "../node-red/node-red.component";
import { SidebarLayoutComponent } from "../common/sidebar-layout/sidebar-layout.component";
import { RoutePath } from "../app.routes";

@Component({
    selector: "app-automation",
    imports: [SidebarLayoutComponent, NodeRedComponent],
    templateUrl: "./automation.component.html",
    styleUrl: "./automation.component.scss",
    standalone: true,
})
export class AutomationComponent {
    RoutePath = RoutePath;
}
