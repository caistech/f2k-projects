INSERT INTO admin_users (
  email,
  role,
  first_name,
  last_name,
  email_marketing_opt_in,
  created_at
) VALUES (
  'shamini.bhaskaran@gmail.com',
  'fund_manager',
  'Shamini',
  'Bhaskaran',
  false,
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  role = 'fund_manager',
  updated_at = NOW();
