// Fill these in from the NEW Supabase project: Project Settings -> API
// Use the SAME project/URL/key as the function-expenses site so both read/write the same data.
const SUPABASE_URL = "https://uagvndsgndxrqcgczuln.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0U5WphJtfaGdfLCIjH6Z1w_klVnFU5d";

// Two separate Supabase Auth users, so the Dashboard and the Accounts page have DIFFERENT passwords.
// Users only type a password; the email is fixed here. Create both in Supabase: Authentication -> Users.
const DASHBOARD_EMAIL = "dashboard@veeramathi.local";  // signs in to THIS dashboard
const ACCOUNTS_EMAIL = "admin@veeramathi.local";     // signs in to the Accounts page (function-expenses/); the dashboard
                                                              // only uses it to change that page's password
