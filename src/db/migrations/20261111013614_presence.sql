CREATE TABLE "presence" (
	"user_id" text PRIMARY KEY NOT NULL,
	"x" integer,
	"z" integer,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "presence_spot_check" CHECK (("presence"."x" is null) = ("presence"."z" is null)),
	CONSTRAINT "presence_spot_range_check" CHECK ("presence"."x" between -1000 and 1000 and "presence"."z" between -1000 and 1000)
);
--> statement-breakpoint
ALTER TABLE "presence" ADD CONSTRAINT "presence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;