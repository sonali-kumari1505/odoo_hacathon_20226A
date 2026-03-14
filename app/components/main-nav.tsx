"use client"

import Link from "next/link"
import {usePathname,useRouter} from "next/navigation"
import {useState} from "react"

const links=[
 {href:"/",label:"Dashboard",hint:"Inventory snapshot"},
 {href:"/products",label:"Products",hint:"Catalog and stock"},
 {href:"/receive",label:"Receive",hint:"Incoming goods"},
 {href:"/deliver",label:"Deliver",hint:"Outgoing goods"},
 {href:"/transfer",label:"Transfer",hint:"Warehouse to warehouse"},
 {href:"/adjustment",label:"Adjustment",hint:"Physical stock count"},
 {href:"/suppliers",label:"Suppliers",hint:"Vendor records"},
 {href:"/history",label:"History",hint:"Ledger trail"},
 {href:"/analytics",label:"Analytics",hint:"Movement insights"}
]

export default function MainNav(){
 const pathname=usePathname()
 const router=useRouter()
 const[loggingOut,setLoggingOut]=useState(false)

 async function handleLogout(){
 setLoggingOut(true)

 try{
 await fetch("/api/auth/logout",{method:"POST"})
 }finally{
 router.push("/login")
 router.refresh()
 setLoggingOut(false)
 }
 }

 return(
 <nav className="nav-list" aria-label="Primary">
 {links.map(link=>{
 const active=link.href==="/"
 ? pathname===link.href
 : pathname.startsWith(link.href)

 return(
 <Link
 key={link.href}
 href={link.href}
 className={`nav-link ${active?"active":""}`.trim()}
 >
 <span className="nav-label">{link.label}</span>
 <span className="nav-hint">{link.hint}</span>
 </Link>
 )
 })}

 <button
 type="button"
 className="nav-link nav-logout"
 onClick={handleLogout}
 disabled={loggingOut}
 >
 <span className="nav-label">{loggingOut?"Signing out...":"Logout"}</span>
 <span className="nav-hint">End your current session</span>
 </button>
 </nav>
 )
}
