"use server";
import {redirect} from "next/navigation";
import {headers} from "next/headers";
import {isConfigured,supabaseServer} from "../../lib/supabase/server";
function destination(type:string,message:string){return "/login?"+new URLSearchParams({type,message}).toString()}
export async function authenticate(formData:FormData){
 if(!isConfigured())redirect(destination("error","Supabase is not configured. Connect your project in Vercel."));
 const mode=String(formData.get("mode")||"login");
 const email=String(formData.get("email")||"").trim();
 const password=String(formData.get("password")||"");
 if(!email||!password)redirect(destination("error","Email and password are required."));
 if(password.length<8&&mode==="signup")redirect(destination("error","Use at least 8 characters for your password."));
 const client=await supabaseServer();
 if(mode==="signup"){
  const origin=(await headers()).get("origin")||process.env.NEXT_PUBLIC_SITE_URL||"https://myfounderhq.com";
  const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:origin+"/auth/callback"}});
  if(error)redirect(destination("error",error.message));
  if(data.session)redirect("/");
  redirect(destination("success","Check your email for a confirmation link, then sign in."));
 }
 const {error}=await client.auth.signInWithPassword({email,password});
 if(error)redirect(destination("error",error.message));
 redirect("/");
}
export async function signOut(){if(isConfigured()){const client=await supabaseServer();await client.auth.signOut()}redirect("/login")}
