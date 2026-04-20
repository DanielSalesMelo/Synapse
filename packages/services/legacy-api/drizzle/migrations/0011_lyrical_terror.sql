CREATE TABLE "assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"hostname" varchar(255) NOT NULL,
	"osType" varchar(100),
	"totalMemory" bigint,
	"last_seen" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assets_hostname_unique" UNIQUE("hostname")
);
