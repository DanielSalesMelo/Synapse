-- Migration: Add dual agent pairing logic (manual and automatic)
-- Description: Adds userId and departmentId fields to monitor_agentes and agent_pairing_codes tables

-- Add columns to monitor_agentes table for user and department association
ALTER TABLE "monitor_agentes" ADD COLUMN IF NOT EXISTS "user_id" varchar(255);
ALTER TABLE "monitor_agentes" ADD COLUMN IF NOT EXISTS "department_id" varchar(255);

-- Add columns to agent_pairing_codes table for user and department association
ALTER TABLE "agent_pairing_codes" ADD COLUMN IF NOT EXISTS "user_id" varchar(255) NOT NULL;
ALTER TABLE "agent_pairing_codes" ADD COLUMN IF NOT EXISTS "department_id" varchar(255) NOT NULL;
ALTER TABLE "agent_pairing_codes" ADD COLUMN IF NOT EXISTS "is_used" boolean DEFAULT false;
