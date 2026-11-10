"use client";
import {useEffect,useMemo,useState} from "react";
import {createBrowserClient} from "@supabase/ssr";

type Result={email:string;pending:string;error:string};
export default function EmailConfirmed(){
 const db=useMemo(()=>createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!),[]);
 const [result,setResult]=useState<Result|null>(null);
 useEffect(()=>{
  let active=true;
  void (async()=>{
   const query=new URLSearchParams(window.location.search);
   const fragment=new URLSearchParams(window.location.hash.replace(/^#/,""));
   const remoteError=query.get("error_description")||query.get("error")||fragment.get("error_description")||"";
   if(remoteError){if(active)setResult({email:"",pending:"",error:remoteError});return;}
   const code=query.get("code");
   const tokenHash=query.get("token_hash");
   const tokenType=query.get("type");
   if(code){
    const {error}=await db.auth.exchangeCodeForSession(code);
    if(error){if(active)setResult({email:"",pending:"",error:"The confirmation link could not be verified: "+error.message});return;}
   }else if(tokenHash&&tokenType==="email_change"){
    const {error}=await db.auth.verifyOtp({token_hash:tokenHash,type:"email_change"});
    if(error){if(active)setResult({email:"",pending:"",error:"The confirmation link could not be verified: "+error.message});return;}
   }else if(fragment.has("access_token")&&fragment.has("refresh_token")){
    const {error}=await db.auth.setSession({access_token:fragment.get("access_token")!,refresh_token:fragment.get("refresh_token")!});
    if(error){if(active)setResult({email:"",pending:"",error:"The confirmation session could not be established: "+error.message});return;}
   }
   // No confirmation claim unless the server-retrieved account reflects it.
   const {data,error}=await db.auth.getUser();
   if(!active)return;
   if(error||!data.user){
    setResult({email:"",pending:"",error:"We could not verify the signed-in account. Please sign in and check the current email in Settings."});return;
   }
   const user=data.user as typeof data.user&{new_email?:string};
   setResult({email:user.email||"",pending:user.new_email||"",error:""});
  })();
  return()=>{active=false;};
 },[db]);
 return <main className="auth-screen"><section className="auth-card">
  <div className="auth-logo">MY<span>FOUNDER</span>HQ™</div>
  <div className="auth-kicker">ACCOUNT EMAIL</div>
  <h1>Email confirmation</h1>
  {!result?<p role="status">Checking confirmation and account email…</p>
   :result.error?<p role="alert">{result.error}</p>
   :<><p>Current verified account email: <strong>{result.email}</strong></p>
    {result.pending?<p>Supabase still shows another email address awaiting confirmation. This change is not complete.</p>:<p>Check that the displayed address is the one you intended. If it is still your old email, the change has not been confirmed.</p>}</>}
  <a className="settings-reset-link" href="/">Return to Settings</a>
 </section></main>;
}
