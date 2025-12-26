import { createClient } from '@supabase/supabase-js'

// 1. クライアントを生成する「関数」を作る（これで使う瞬間まで遅延させる）
export const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are missing!')
  }

  return createClient(supabaseUrl, supabaseKey)
}

// 2. 既存のコードへの影響を最小限にするため、シングルトンもexportしておく
// （ただし、Server Componentからは上の関数を使うのが推奨です）
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)