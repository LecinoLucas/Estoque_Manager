ALTER TABLE `vendas` ADD `status` enum('concluida','cancelada') DEFAULT 'concluida' NOT NULL;--> statement-breakpoint
ALTER TABLE `vendas` ADD `motivoCancelamento` text;