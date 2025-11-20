import {
    Component,
    ElementRef,
    EventEmitter,
    HostListener,
    Input,
    Output,
    ViewChild,
} from "@angular/core";

import { FormsModule } from "@angular/forms";
import { NavItem } from "../common/sidebar/model/nav-item.model";

/**
 * Lightweight, stand-alone shortcuts modal.
 *
 * Responsibilities
 * ────────────────
 * • Draw a dark scrim + card (HTML template).
 * • Close on <Esc> or outside-click.
 * • Expose `@Input() navItems` so the “1 – N” hint is correct.
 * • Simple client-side search that hides non-matching lines as you type.
 *
 * Zero services, zero providers, just Angular + Tailwind.
 */
@Component({
    selector: "app-shortcuts",
    standalone: true,
    imports: [FormsModule],
    templateUrl: "./shortcuts.component.html",
    styleUrl: "./shortcuts.component.scss",
})
export class ShortcutsComponent {
    /* ───────────── Inputs & Outputs ───────────── */

    /** Sidebar items count is used to show “1 – N” in the modal. */
    @Input() navItems: NavItem[] = [];

    /** The host component (AppComponent) listens to this to hide the modal. */
    @Output() close = new EventEmitter<void>();

    @ViewChild("searchInput")
    searchInput!: ElementRef<HTMLInputElement>;

    /* ───────────── Public state ───────────── */

    /** Two-way bound to the search input. */
    searchTerm = "";

    /* ───────────── Keyboard handling ───────────── */

    /**
     * Listens for the keyboard shortcut Shift + Esc at the window level
     * and closes the modal when pressed.
     * The default browser behavior for this key combination is prevented.
     */
    @HostListener("window:keydown.shift.escape", ["$event"])
    private closeOnShiftEscape(event: KeyboardEvent) {
        event.preventDefault();
        this.close.emit();
    }

    @HostListener("window:keydown.control.shift.f", ["$event"])
    private onControlShiftF(event: KeyboardEvent) {
        event.preventDefault();
        this.searchInput.nativeElement.focus();
    }

    /* ───────────── Helper methods ───────────── */

    /**
     * Return *true* if **any** of the provided texts contains the current
     * `searchTerm`.  Called in the template to decide whether to render a row.
     */
    matches(...texts: string[]): boolean {
        if (!this.searchTerm) return true; // no filter, show everything
        const t = this.searchTerm.toLowerCase();
        return texts.some(txt => txt.toLowerCase().includes(t));
    }
}
