CREATE TABLE "attendance_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"checked_in_at" timestamp with time zone DEFAULT now() NOT NULL,
	"checked_out_at" timestamp with time zone,
	CONSTRAINT "attendance_sessions_order_check" CHECK ("attendance_sessions"."checked_out_at" is null or "attendance_sessions"."checked_out_at" >= "attendance_sessions"."checked_in_at")
);
--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_sessions_one_open_per_user" ON "attendance_sessions" USING btree ("user_id") WHERE "attendance_sessions"."checked_out_at" is null;--> statement-breakpoint
CREATE INDEX "attendance_sessions_user_checked_in_idx" ON "attendance_sessions" USING btree ("user_id","checked_in_at");