CREATE TABLE "work_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "work_sessions_order_check" CHECK ("work_sessions"."ended_at" is null or "work_sessions"."ended_at" >= "work_sessions"."started_at")
);
--> statement-breakpoint
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "work_sessions_one_open_per_user" ON "work_sessions" USING btree ("user_id") WHERE "work_sessions"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "work_sessions_user_started_idx" ON "work_sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "work_sessions_project_idx" ON "work_sessions" USING btree ("project_id");