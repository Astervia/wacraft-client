import { Component, EventEmitter, Input, Output, OnInit, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { CampaignGatewayService } from "../../../core/campaign/gateway/campaign-gateway.service";
import { CampaignResults } from "../../../core/campaign/model/campaign-results.model";
import { CampaignStatus } from "../../../core/campaign/entity/campaign.entity";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import { CommonModule } from "@angular/common";
import {
    ApexAxisChartSeries,
    ApexChart,
    ApexXAxis,
    NgApexchartsModule,
    ApexTheme,
    ApexFill,
    ApexLegend,
    ApexYAxis,
    ApexTitleSubtitle,
} from "ng-apexcharts";
import { LocalSettingsService } from "../../local-settings.service";
import { ThemeMode } from "../../../core/common/model/theme-modes.model";

@Component({
    selector: "app-send-campaign",
    imports: [
        MatProgressSpinnerModule,
        MatIconModule,
        MatTooltipModule,
        CommonModule,
        NgApexchartsModule,
    ],
    templateUrl: "./send-campaign.component.html",
    styleUrl: "./send-campaign.component.scss",
    standalone: true,
})
export class SendCampaignComponent implements OnInit {
    private campaignGateway = inject(CampaignGatewayService);
    private route = inject(ActivatedRoute);
    private localSettings = inject(LocalSettingsService);

    // @ViewChild("chart") chart!: ChartComponent;

    campaignId?: string;
    @Input() total = 0;
    @Input() campaignStatus?: CampaignStatus;
    batchSize: number = this.total;
    sent = 0;
    errors = 0;
    success = 0;

    loading = false;
    sending = false;

    @Output() done = new EventEmitter<void>();

    async ngOnInit(): Promise<void> {
        const themeMode = this.localSettings.themeMode;
        this.chartOptions.theme.mode = themeMode === ThemeMode.system ? undefined : themeMode;
        this.watchQueryParams();
    }

    watchQueryParams() {
        this.route.queryParams.subscribe(async params => {
            this.loading = true;

            const campaignId = params["campaign.id"];
            if (campaignId !== this.campaignId) {
                this.campaignId = campaignId;
                this.total = 0;
                this.batchSize = 0;
                this.sent = 0;
                this.errors = 0;
                this.success = 0;
                this.setChartSeries();
                this.campaignGateway.connectToCampaign(campaignId);

                this.campaignGateway.watchCampaign(
                    (result: CampaignResults) => {
                        if (!result?.total) {
                            this.loading = false;
                            return;
                        }

                        this.sending = true;

                        this.total = result.total;
                        this.batchSize = result.total;
                        this.sent = result.sent;
                        this.errors = result.errors;
                        this.success = result.successes;
                        this.setChartSeries();

                        if (this.total === this.sent) {
                            this.sending = false;
                            this.done.emit();
                        }
                    },
                    (result: string) => {
                        switch (result) {
                            case "not sending":
                                this.sending = false;
                                this.done.emit();
                                break;
                            case "sending":
                                this.sending = true;
                                break;
                        }
                    },
                );
            }

            this.loading = false;
        });
    }

    send() {
        this.sending = true;
        this.campaignGateway.send();
    }

    cancel() {
        this.campaignGateway.cancel();
    }

    chartOptions: {
        chart: ApexChart;
        theme: ApexTheme;
        series: ApexAxisChartSeries;
        fill: ApexFill;
        xaxis: ApexXAxis;
        yaxis: ApexYAxis;
        legend: ApexLegend;
        title: ApexTitleSubtitle;
    } = {
        chart: {
            height: 350,
            type: "bar",
            stacked: true,
            toolbar: {
                show: true,
            },
            zoom: {
                enabled: true,
            },
            background: "rgba(255, 255, 255, 0)",
        },
        theme: {
            mode: "dark",
        },
        series: [
            {
                name: "Total in the batch",
                data: [0, this.batchSize, 0],
                color: "#CCC",
            },
            {
                name: "Handled",
                data: [0, 0, this.sent],
                color: "#1E40AF",
            },
            {
                name: "Errors",
                data: [this.errors, 0, 0],
                color: "#FF3333",
            },
            {
                name: "Successes",
                data: [this.success, 0, 0],
                color: "#33FF33",
            },
        ],
        xaxis: {
            categories: ["Results", "Total", "Handled"],
        },
        yaxis: {
            max: this.batchSize,
        },
        legend: {
            position: "right",
            offsetY: 40,
        },
        fill: {
            opacity: 1,
        },
        title: {
            text: "Campaign progress",
        },
    };
    setChartSeries() {
        this.chartOptions.yaxis.max = this.batchSize;
        this.chartOptions.series = [
            {
                name: "Total in the batch",
                data: [0, this.batchSize, 0],
                color: "#CCC",
            },
            {
                name: "Handled",
                data: [0, 0, this.sent],
                color: "#1E40AF",
            },
            {
                name: "Errors",
                data: [this.errors, 0, 0],
                color: "#FF3333",
            },
            {
                name: "Successes",
                data: [this.success, 0, 0],
                color: "#33FF33",
            },
        ];
    }
}
