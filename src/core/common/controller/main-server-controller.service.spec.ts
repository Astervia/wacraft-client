import { TestBed } from "@angular/core/testing";

import { MainServerControllerService } from "./controller.service";

describe("ControllerService", () => {
    let service: MainServerControllerService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(MainServerControllerService);
    });

    it("should be created", () => {
        expect(service).toBeTruthy();
    });
});
