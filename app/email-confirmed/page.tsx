"use client";
import {useEffect,useMemo,useState} from "react";
import {createBrowserClient} from "@supabase/ssr";

export default function EmailConfirmed(){
 const db=useMemo(()=>createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!),[]);
 const [result,setResult]=useState<{email:string;pending:boolean;error:string}|null>(null);
 useEffect(()=>{
  let active=true;
  void (async()=>{
   // Browsers may arrive with a Supabase fragment after email confirmation.
   const params=new URLSearchParams(window.location.search);
   const urlError=params.get("error")||new URLSearchParams(window.location.hash.slice(1)).get("error_description")||"";
   const {data,error}=await db.auth.getUser();
   if(!active)return;
   const user=data.user as ({email?:string;new_email?:string}|null);
   setResult({email:user?.email||"",pending:!!user?.new_email,error:urlError||error?.message||""});
  })();
  return()=>{active=false};
 },[db]);
 return <main className="auth-screen"><section className="auth-card">
  <div className="auth-logo">MY<span>FOUNDER</span>HQ™</div>
  <div className="auth-kicker">ACCOUNT EMAIL</div>
  <h1>Email confirmation</h1>
  {!result?<p>Checking email confirmation…</p>:result.error?<p role="alert">{result.error}</p>:result.pending?<p>The first confirmation was received. For security, you may also need to approve the change from the other email inbox before your address updates.</p>:result.email?<p>Your account currently uses <strong>{result.email}</strong>. If this is your new address, the change is complete. Otherwise, confirm the link sent to your other email address.</p>:<p>Open this confirmation link in the browser where you signed in, or sign in to check your account email.</p>}
  <a className="settings-reset-link" href="/">Return to MyFounderHQ</a>
 </section></main>;
}
