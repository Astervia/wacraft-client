import { Component } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { SidebarLayoutComponent } from "../common/sidebar-layout/sidebar-layout.component";
import { RoutePath } from "../app.routes";

interface DevTool {
    path: string;
    label: string;
    icon: string;
}

@Component({
    selector: "app-devtools",
    imports: [SidebarLayoutComponent, RouterLink, RouterLinkActive, RouterOutlet],
    templateUrl: "./devtools.component.html",
    standalone: true,
})
export class DevtoolsComponent {
    RoutePath = RoutePath;

    tools: DevTool[] = [{ path: "token-replacer", label: "Token Replacer", icon: "key" }];
}
