import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mnnpuxznejnsubcrfvor.supabase.co'
const supabaseKey = 'sb_publishable_4tRItS2lk1OdjEnQnYCZRw_gTxKSKYf'
const supabase = createClient(supabaseUrl, supabaseKey)

async function createAdmin() {
  console.log('Creating super admin user...')
  
  // 1. Sign up the user in Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: 'admin@clinicos.com',
    password: 'password123',
  })

  if (authError) {
    console.error('Auth Error:', authError.message)
    return
  }

  const userId = authData.user.id
  console.log('User created in Auth with ID:', userId)

  // 2. Insert into the public.users table
  const { error: dbError } = await supabase
    .from('users')
    .insert([
      {
        id: userId,
        email: 'admin@clinicos.com',
        name: 'Super Admin',
        role: 'super_admin'
      }
    ])

  if (dbError) {
    console.error('Database Error:', dbError.message)
    return
  }

  console.log('\n✅ SUCCESS! You can now log in with:')
  console.log('Email: admin@clinicos.com')
  console.log('Password: password123')
}

createAdmin()
