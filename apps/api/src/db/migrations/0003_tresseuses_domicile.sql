ALTER TABLE "bookings" ADD COLUMN "location" text DEFAULT 'chez_tresseuse' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "client_address" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "client_city" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "travel_fee_eur" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "salons" ADD COLUMN "service_mode" text DEFAULT 'chez_moi' NOT NULL;--> statement-breakpoint
ALTER TABLE "salons" ADD COLUMN "travel_fee_eur" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "salons" ADD COLUMN "travel_zone" text[] DEFAULT '{}'::text[] NOT NULL;