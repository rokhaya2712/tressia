-- Passage de la plateforme en France : les prix sont desormais stockes en euros entiers.
-- Les montants existants (en FCFA) sont convertis au taux fixe 1 EUR = 655,957 FCFA.
ALTER TABLE "booking_items" RENAME COLUMN "price_fcfa" TO "price_eur";--> statement-breakpoint
ALTER TABLE "bookings" RENAME COLUMN "total_price_fcfa" TO "total_price_eur";--> statement-breakpoint
ALTER TABLE "services" RENAME COLUMN "price_fcfa" TO "price_eur";--> statement-breakpoint
UPDATE "booking_items" SET "price_eur" = ROUND("price_eur" / 655.957);--> statement-breakpoint
UPDATE "bookings" SET "total_price_eur" = ROUND("total_price_eur" / 655.957);--> statement-breakpoint
UPDATE "services" SET "price_eur" = ROUND("price_eur" / 655.957);
