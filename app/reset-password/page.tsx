"use client";
import React,{useEffect,useMemo,useState} from "react";
import {createBrowserClient} from "@supabase/ssr";
export default function ResetPassword(){
 const db=useMemo(()=>createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!),[]);
 const [checking,setChecking]=useState(true);
 const [authenticated,setAuthenticated]=useState(false);
 const [password,setPassword]=useState("");
 const [confirm,setConfirm]=useState("");
 const [error,setError]=useState("");
 const [complete,setComplete]=useState(false);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  let active=true;
  void db.auth.getUser().then(({data,error})=>{
   if(!active)return;
   setAuthenticated(!error&&!!data.user);
   setChecking(false);
  });
  return()=>{active=false};
 },[db]);
 async function save(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");
  if(password.length<8){setError("Use a password of at least 8 characters.");return;}
  if(password!==confirm){setError("Passwords do not match.");return;}
  setBusy(true);
  const {error}=await db.auth.updateUser({password});
  setBusy(false);
  if(error){setError(error.message);return;}
  setPassword("");setConfirm("");setComplete(true);
 }
 return <main className="auth-screen"><section className="auth-card">
  <div className="auth-logo">MY<span>FOUNDER</span>HQ™</div>
  <div className="auth-kicker">ACCOUNT SECURITY</div>
  <h1>Reset password</h1>
  {checking?<p>Verifying your recovery link…</p>:complete?<><p role="status">Your password has been updated.</p><a className="settings-reset-link" href="/">Return to MyFounderHQ</a></>:!authenticated?<><p>This recovery link is invalid, expired, or has not been verified.</p><a className="settings-reset-link" href="/login">Return to sign in</a></>:<form className="settings-edit" onSubmit={save}>
   <label>New password<input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <label>Confirm new password<input type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
   {error&&<p className="settings-feedback settings-feedback-error" role="alert">{error}</p>}
   <div><button type="submit" disabled={busy}>{busy?"Saving…":"Reset password"}</button></div>
  </form>}
 </section></main>;
}
