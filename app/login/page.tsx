import {redirect} from "next/navigation";
import ThemeToggle from "../theme-toggle";
import {authenticate} from "./actions";
import {isConfigured,supabaseServer} from "../../lib/supabase/server";
export const dynamic="force-dynamic";
export default async function Login({searchParams}:{searchParams:Promise<{type?:string;message?:string}>}){
 if(isConfigured()){const client=await supabaseServer();const {data}=await client.auth.getUser();if(data.user)redirect("/")}
 const params=await searchParams;
 return <main className="auth-screen"><div className="auth-card"><div className="auth-theme-slot"><ThemeToggle/></div><div className="auth-logo">MY<span>FOUNDER</span>HQ™</div><p className="auth-kicker">PRIVATE FOUNDER HEADQUARTERS</p><h1>Welcome to your headquarters.</h1><p>Create your account or sign in to manage your business ecosystem.</p>{!isConfigured()&&<div className="auth-alert">Supabase setup is pending. Account registration will become available when the project URL and publishable key are configured on Vercel.</div>}{params.message&&<div role="status" className={"auth-alert "+(params.type==="success"?"auth-success":"")}>{params.message}</div>}
 <form action={authenticate}><label htmlFor="auth-email">Email address</label><input id="auth-email" className="input" name="email" type="email" autoComplete="email" required placeholder="you@example.com"/><label htmlFor="auth-password">Password</label><input id="auth-password" className="input" name="password" type="password" autoComplete="current-password" minLength={6} required placeholder="Your secure password"/><div className="auth-buttons"><button disabled={!isConfigured()} className="action" name="mode" value="login">Sign in</button><button disabled={!isConfigured()} className="action secondary" name="mode" value="signup">Create account</button></div></form><p className="auth-footnote">Authentication is handled securely by Supabase Auth. Do not reuse passwords from other services.</p></div></main>
}
