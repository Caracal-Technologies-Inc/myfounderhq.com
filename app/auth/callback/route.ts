import {NextRequest,NextResponse} from "next/server";
import {isConfigured,supabaseServer} from "../../../lib/supabase/server";

export async function GET(request:NextRequest){
 const url=new URL(request.url);
 const code=url.searchParams.get("code");
 const tokenHash=url.searchParams.get("token_hash");
 const type=url.searchParams.get("type");
 const next=url.searchParams.get("next");
 const target=next==="/reset-password"?"/reset-password":next==="/email-confirmed"?"/email-confirmed":"/";
 if(!isConfigured())return NextResponse.redirect(new URL("/login",url.origin));

 const supabase=await supabaseServer();
 if(code){
  const {error}=await supabase.auth.exchangeCodeForSession(code);
  if(!error)return NextResponse.redirect(new URL(target,url.origin));
 }
 if(tokenHash&&(type==="email_change"||type==="recovery")){
  const {error}=await supabase.auth.verifyOtp({token_hash:tokenHash,type});
  if(!error)return NextResponse.redirect(new URL(type==="recovery"?"/reset-password":"/email-confirmed",url.origin));
 }
 const failed=new URL(next==="/email-confirmed"?"/email-confirmed":"/login",url.origin);
 if(next==="/email-confirmed")failed.searchParams.set("error","Email confirmation link expired or could not be verified.");
 else{failed.searchParams.set("type","error");failed.searchParams.set("message","Confirmation link expired or could not be verified.");}
 return NextResponse.redirect(failed);
}
