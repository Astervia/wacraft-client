import { CommonModule } from "@angular/common";
import { Component, Input, ViewChild, ContentChild, TemplateRef } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";

@Component({
    selector: "app-small-button",
    imports: [CommonModule, MatIconModule],
    templateUrl: "./small-button.component.html",
    styleUrls: ["./small-button.component.scss"],
    standalone: true,
})
export class SmallButtonComponent {
    @Input() src = "";
    @Input() matIcon = "";
    @Input() matSymbol = "";
    @Input() active = false;
    @Input() width = "40px";
    @Input() alt = "";
    @Input() ariaLabel = "";
    @ViewChild("button") button!: HTMLButtonElement;
    @ContentChild(TemplateRef) customContent?: TemplateRef<unknown>;

    changeActive() {
        this.active = !this.active;
    }
}
