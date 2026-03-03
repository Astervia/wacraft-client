import { CommonModule } from "@angular/common";
import { Component, EventEmitter, HostListener, Input, Output } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { SectionData } from "../../../core/message/model/section-data.model";
import { CopyButtonComponent } from "../../common/copy-button/copy-button.component";

interface ListOptionRow {
    id: string;
    title: string;
    description?: string;
}

@Component({
    selector: "app-list-options-modal",
    imports: [CommonModule, MatIconModule, MatIconModule, CopyButtonComponent],
    templateUrl: "./list-options-modal.component.html",
    styleUrl: "./list-options-modal.component.scss",
    standalone: true,
})
export class ListOptionsModalComponent {
    selectedRow?: ListOptionRow;

    @Input() listName!: string;
    @Input() sections!: SectionData[];
    @Output() close = new EventEmitter();

    selectRow(row: ListOptionRow): void {
        this.selectedRow = row;
    }

    // Method to check if a row is selected
    isSelectedRow(row: ListOptionRow): boolean {
        return this.selectedRow ? this.selectedRow === row : false;
    }

    /** Close modal when user presses <Esc> anywhere. */
    @HostListener("window:keydown.shift.escape", ["$event"])
    private closeOnShiftEscape(event: KeyboardEvent) {
        event.preventDefault();
        this.close.emit();
    }
}
