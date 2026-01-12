-- Add missing financial tracking fields to goals table
-- payment_type: 'hourly' or 'fixed' payment model
-- fixed_rate: amount for fixed payment
-- fixed_rate_period: 'week' or 'month' for fixed payment period

ALTER TABLE goals
ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IS NULL OR payment_type IN ('hourly', 'fixed'));

ALTER TABLE goals
ADD COLUMN IF NOT EXISTS fixed_rate NUMERIC(10, 2);

ALTER TABLE goals
ADD COLUMN IF NOT EXISTS fixed_rate_period TEXT CHECK (fixed_rate_period IS NULL OR fixed_rate_period IN ('week', 'month'));

-- Add comments for documentation
COMMENT ON COLUMN goals.payment_type IS 'Payment model: hourly or fixed rate';
COMMENT ON COLUMN goals.fixed_rate IS 'Fixed payment amount (if payment_type is fixed)';
COMMENT ON COLUMN goals.fixed_rate_period IS 'Period for fixed payment: week or month';
