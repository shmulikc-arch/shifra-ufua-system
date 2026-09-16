// ============================================================================
// חיבור ל-Supabase — למלא את שני הערכים האלה אחרי יצירת הפרויקט.
// נמצאים ב-Supabase Dashboard -> Settings -> API.
// ה-anon key בטוח לחשיפה בקוד הציבורי הזה (זה בדיוק התפקיד שלו) —
// לעולם לא להדביק כאן את ה-service_role key הסודי.
// ============================================================================

const SUPABASE_URL = 'https://pgzoavwnzqbyapvktwzt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1mgAPaiGINg6oCZEKOShxg_h3AFuS_m';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
