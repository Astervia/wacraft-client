import { Injectable } from "@angular/core";
import { Subject } from "rxjs";

@Injectable({
    providedIn: "root",
})
export class WorkspaceContextService {
    currentWorkspaceId: string | null = localStorage.getItem("currentWorkspaceId");

    workspaceChanged = new Subject<string>();

    setWorkspaceId(id: string): void {
        this.currentWorkspaceId = id;
        localStorage.setItem("currentWorkspaceId", id);
        this.workspaceChanged.next(id);
    }
}
