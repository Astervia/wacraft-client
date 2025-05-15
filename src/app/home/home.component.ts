import { Component, HostListener, OnInit, ViewChild } from "@angular/core";
import { SidebarComponent } from "../common/sidebar/sidebar.component";
import { ChatsSidebarComponent } from "../chats-sidebar/chats-sidebar.component";
import { CommonModule } from "@angular/common";
import { ConversationsComponent } from "../conversations/conversations.component";
import { TemplateSidebarComponent } from "../templates/template-sidebar/template-sidebar.component";
import { TemplateDetailsComponent } from "../templates/template-details/template-details.component";
import { QueryParamsService } from "../../core/navigation/service/query-params.service";
import { ActivatedRoute, Router } from "@angular/router";
import { HomeFragment } from "./model/home-fragment.model";
import { CampaignsSidebarComponent } from "../campaigns/campaigns-sidebar/campaigns-sidebar.component";
import { CampaignDetailsComponent } from "../campaigns/campaign-details/campaign-details.component";
import { NewContactComponent } from "../contacts/new-contact/new-contact.component";
import { environment } from "../../environments/environment";

@Component({
    selector: "app-home",
    imports: [
        CommonModule,
        SidebarComponent,
        ChatsSidebarComponent,
        ConversationsComponent,
        NewContactComponent,
        TemplateSidebarComponent,
        TemplateDetailsComponent,
        CampaignsSidebarComponent,
        CampaignDetailsComponent,
    ],
    templateUrl: "./home.component.html",
    styleUrl: "./home.component.scss",
    standalone: true,
})
export class HomeComponent implements OnInit {
    HomeFragment = HomeFragment;
    environment = environment;

    @ViewChild("chatsSidebar") chatsSidebar!: ChatsSidebarComponent;
    @ViewChild("conversations") conversations!: ConversationsComponent;

    currentFragment!: HomeFragment;

    constructor(
        public queryParamsService: QueryParamsService,
        private route: ActivatedRoute,
        private router: Router,
    ) {}

    async ngOnInit() {
        this.watchQueryParams();
    }

    watchQueryParams() {
        // Handle home fragments
        this.route.fragment.subscribe((fragment) => {
            if (!fragment) {
                // If there's no fragment, set it to HomeFragment.chats
                this.router.navigate([], {
                    fragment: HomeFragment.chats.toString(),
                    queryParamsHandling: "preserve",
                });
                return;
            }
            // Handle existing fragment if needed
            this.currentFragment =
                HomeFragment[fragment as keyof typeof HomeFragment];
        });
    }

    queryParamIs(param: string, value: string): boolean {
        const paramText = this.route.snapshot.queryParamMap.get(param);
        return paramText ? paramText === value : false;
    }

    // Function to check if query parameter is present
    hasQueryParam(param: string): boolean {
        return this.route.snapshot.queryParamMap.has(param);
    }
}
