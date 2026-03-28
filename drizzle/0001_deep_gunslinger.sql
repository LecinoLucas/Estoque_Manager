CREATE TABLE `movimentacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`tipo` enum('entrada','saida') NOT NULL,
	`quantidade` int NOT NULL,
	`quantidadeAnterior` int NOT NULL,
	`quantidadeNova` int NOT NULL,
	`observacao` text,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `movimentacoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`medida` enum('Solteiro','Solteirão','Casal','Queen','King') NOT NULL,
	`categoria` enum('Colchões','Roupas de Cama','Pillow Top','Travesseiros','Cabeceiras','Box Baú','Box Premium','Box Tradicional') NOT NULL,
	`quantidade` int NOT NULL DEFAULT 0,
	`estoqueMinimo` int NOT NULL DEFAULT 3,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`quantidade` int NOT NULL,
	`dataVenda` timestamp NOT NULL,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vendas_id` PRIMARY KEY(`id`)
);
