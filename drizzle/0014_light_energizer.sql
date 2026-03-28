CREATE TABLE `encomendas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int,
	`nomeProduto` varchar(255),
	`medidaProduto` varchar(100),
	`quantidade` int NOT NULL,
	`nomeCliente` varchar(200) NOT NULL,
	`telefoneCliente` varchar(20),
	`dataEntrega` timestamp NOT NULL,
	`status` enum('pendente','em_producao','pronto','entregue','cancelado') NOT NULL DEFAULT 'pendente',
	`observacoes` text,
	`vendedor` varchar(100),
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `encomendas_id` PRIMARY KEY(`id`)
);
