"use client"

import {usePathname} from "next/navigation"

import MainNav from "@/app/components/main-nav"

const authRoutes=new Set(["/login","/signup"])

export default function AppShell({children}:{children:React.ReactNode}){
 const pathname=usePathname()

 if(authRoutes.has(pathname)){
 return <main className="auth-main">{children}</main>
 }

 return(
 <div className="app-shell">
 <aside className="app-sidebar">
 <div>
 <p className="brand-kicker">CoreInventory</p>
 <h1 className="brand-title">Stock Flow Console</h1>
 <p className="brand-copy">
 Track incoming, outgoing, and adjusted stock with a live operational ledger.
 </p>
 </div>

 <MainNav/>

 <p className="sidebar-footnote">
 Use Products for catalog setup, Receive and Deliver for pending validations, Transfer and Adjustment for control actions, and History to audit every change.
 </p>
 </aside>

 <main className="app-main">{children}</main>
 </div>
 )
}
