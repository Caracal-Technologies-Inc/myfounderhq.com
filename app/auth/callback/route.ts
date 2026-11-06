import {NextRequest,NextResponse} from "next/server";
import {isConfigured,supabaseServer} from "../../../lib/supabase/server";
export async function GET(request:NextRequest){const url=new URL(request.url);const code=url.searchParams.get("code");if(code&&isConfigured()){const supabase=await supabaseServer();const {error}=await supabase.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL("/",url.origin))}return NextResponse.redirect(new URL("/login?type=error&message=Email+confirmation+could+not+be+completed",url.origin))}
