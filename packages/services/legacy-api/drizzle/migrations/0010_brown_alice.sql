CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_tenant_roles" (
	"user_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	CONSTRAINT "user_tenant_roles_user_id_tenant_id_role_id_pk" PRIMARY KEY("user_id","tenant_id","role_id")
);
--> statement-breakpoint
ALTER TABLE "agent_pairing_codes" ADD COLUMN "user_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_pairing_codes" ADD COLUMN "department_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_pairing_codes" ADD COLUMN "is_used" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "monitor_agentes" ADD COLUMN "user_id" varchar;--> statement-breakpoint
ALTER TABLE "monitor_agentes" ADD COLUMN "department_id" varchar;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tenant_roles" ADD CONSTRAINT "user_tenant_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tenant_roles" ADD CONSTRAINT "user_tenant_roles_tenant_id_empresas_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tenant_roles" ADD CONSTRAINT "user_tenant_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_parent_id_empresas_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."empresas"("id") ON DELETE set null ON UPDATE no action;