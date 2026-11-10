import {NextRequest,NextResponse} from "next/server";
import {isConfigured,supabaseServer} from "../../../lib/supabase/server";
export async function GET(request:NextRequest){
 const url=new URL(request.url);
 const code=url.searchParams.get("code");
 const next=url.searchParams.get("next");
 if(code&&isConfigured()){
  const supabase=await supabaseServer();
  const {error}=await supabase.auth.exchangeCodeForSession(code);
  if(!error){
   // A fixed allowlist prevents recovery redirect tampering and external redirects.
   const target=next==="/reset-password"?"/reset-password":"/";
   return NextResponse.redirect(new URL(target,url.origin));
  }
 }
 return NextResponse.redirect(new URL("/login?type=error&message=Email+confirmation+could+not+be+completed",url.origin));
}
