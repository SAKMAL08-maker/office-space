ALTER TABLE "attachments" DROP CONSTRAINT "attachments_status_check";--> statement-breakpoint
ALTER TABLE "profile_pictures" DROP CONSTRAINT "profile_pictures_status_check";--> statement-breakpoint
ALTER TABLE "profile_pictures" DROP CONSTRAINT "profile_pictures_ready_type_check";--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_status_check" CHECK ("attachments"."status" in ('pending', 'ready', 'removed'));--> statement-breakpoint
ALTER TABLE "profile_pictures" ADD CONSTRAINT "profile_pictures_status_check" CHECK ("profile_pictures"."status" in ('pending', 'ready', 'removed'));--> statement-breakpoint
ALTER TABLE "profile_pictures" ADD CONSTRAINT "profile_pictures_ready_type_check" CHECK ("profile_pictures"."status" <> 'ready' or "profile_pictures"."content_type" is not null);