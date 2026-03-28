CREATE TABLE `historicoPrecos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`precoCustoAnterior` decimal(10,2),
	`precoCustoNovo` decimal(10,2),
	`precoVendaAnterior` decimal(10,2),
	`precoVendaNovo` decimal(10,2),
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historicoPrecos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','gerente') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `products` ADD `precoCusto` decimal(10,2);--> statement-breakpoint
ALTER TABLE `products` ADD `precoVenda` decimal(10,2);