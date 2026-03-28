ALTER TABLE `encomendas` ADD `dataCompra` timestamp;--> statement-breakpoint
ALTER TABLE `encomendas` ADD `pedidoFeito` boolean DEFAULT false NOT NULL;