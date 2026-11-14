CREATE TABLE "profile_pictures" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"size" integer NOT NULL,
	"storage_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"content_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_pictures_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "profile_pictures_status_check" CHECK ("profile_pictures"."status" in ('pending', 'ready')),
	CONSTRAINT "profile_pictures_size_check" CHECK ("profile_pictures"."size" between 1 and 2097152),
	CONSTRAINT "profile_pictures_type_check" CHECK ("profile_pictures"."content_type" in ('image/png', 'image/jpeg', 'image/webp')),
	CONSTRAINT "profile_pictures_ready_type_check" CHECK ("profile_pictures"."status" = 'pending' or "profile_pictures"."content_type" is not null)
);
--> statement-breakpoint
ALTER TABLE "profile_pictures" ADD CONSTRAINT "profile_pictures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profile_pictures_one_ready_per_user" ON "profile_pictures" USING btree ("user_id") WHERE "profile_pictures"."status" = 'ready';--> statement-breakpoint
CREATE INDEX "profile_pictures_user_created_idx" ON "profile_pictures" USING btree ("user_id","created_at");