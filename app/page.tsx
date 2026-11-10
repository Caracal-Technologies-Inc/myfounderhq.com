import {redirect} from "next/navigation";
import {isConfigured,supabaseServer} from "../lib/supabase/server";
import Dashboard from "./dashboard-client";
import {signOut} from "./login/actions";
export const dynamic="force-dynamic";
export default async function Home(){
 if(!isConfigured())redirect("/login");
 const supabase=await supabaseServer();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)redirect("/login");
 return <Dashboard email={user.email} userId={user.id} signOutAction={signOut}/>;
}
