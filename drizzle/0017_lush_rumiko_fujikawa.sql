CREATE TABLE `marcas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marcas_id` PRIMARY KEY(`id`),
	CONSTRAINT `marcas_nome_unique` UNIQUE(`nome`)
);
