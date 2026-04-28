-- Add new final stage without breaking existing flows
ALTER TYPE "CycleStatus" ADD VALUE IF NOT EXISTS 'MANAGEMENT_REVIEW';

