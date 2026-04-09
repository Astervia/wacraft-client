import { KeyboardNavigableList } from "./keyboard-navigable-list.base";
import { ElementRef, QueryList } from "@angular/core";

class MockKeyboardNavigableList extends KeyboardNavigableList {
    protected override rows = new QueryList<ElementRef<HTMLElement>>();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    protected override onEnter(_i: number): void {}
}

describe("KeyboardNavigableList", () => {
    it("should create an instance", () => {
        expect(new MockKeyboardNavigableList()).toBeTruthy();
    });
});
