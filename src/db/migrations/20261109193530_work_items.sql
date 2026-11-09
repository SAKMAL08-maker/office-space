CREATE TABLE "cubicles" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"project_id" text NOT NULL,
	"seat" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cubicles_project_id_unique" UNIQUE("project_id"),
	CONSTRAINT "cubicles_owner_seat_unique" UNIQUE("owner_id","seat"),
	CONSTRAINT "cubicles_seat_check" CHECK ("cubicles"."seat" >= 1)
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"source_task_id" text,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_source_task_id_unique" UNIQUE("source_task_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"sender_id" text NOT NULL,
	"receiver_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reject_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	CONSTRAINT "tasks_status_check" CHECK ("tasks"."status" in ('pending', 'accepted', 'rejected', 'cancelled')),
	CONSTRAINT "tasks_not_to_self_check" CHECK ("tasks"."sender_id" <> "tasks"."receiver_id")
);
--> statement-breakpoint
ALTER TABLE "cubicles" ADD CONSTRAINT "cubicles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cubicles" ADD CONSTRAINT "cubicles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_source_task_id_tasks_id_fk" FOREIGN KEY ("source_task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_owner_id_idx" ON "projects" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "tasks_receiver_status_idx" ON "tasks" USING btree ("receiver_id","status");--> statement-breakpoint
CREATE INDEX "tasks_sender_created_idx" ON "tasks" USING btree ("sender_id","created_at");