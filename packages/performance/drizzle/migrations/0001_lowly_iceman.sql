CREATE TABLE "performance"."custom_dashboards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"period_filter" text,
	"show_in_sidebar" boolean DEFAULT false NOT NULL,
	"is_draft" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance"."dashboard_widgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dashboard_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"layout" jsonb NOT NULL,
	"content" jsonb NOT NULL,
	"widget_period" text,
	"generation_prompt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "custom_dashboards_by_tenant_owner" ON "performance"."custom_dashboards" USING btree ("tenant_id","created_by");--> statement-breakpoint
CREATE INDEX "custom_dashboards_by_tenant_draft" ON "performance"."custom_dashboards" USING btree ("tenant_id","is_draft");--> statement-breakpoint
CREATE INDEX "widgets_by_dashboard" ON "performance"."dashboard_widgets" USING btree ("dashboard_id");