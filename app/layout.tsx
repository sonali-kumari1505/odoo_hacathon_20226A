
import type {Metadata} from "next"
import {Manrope,Sora} from "next/font/google"

import AppShell from "@/app/components/app-shell"
import "./globals.css"

const headingFont=Sora({
 subsets:["latin"],
 variable:"--font-heading"
})

const bodyFont=Manrope({
 subsets:["latin"],
 variable:"--font-body"
})

export const metadata:Metadata={
 title:"CoreInventory",
 description:"Warehouse operations and stock tracking workspace"
}

export default function RootLayout({children}:{children:React.ReactNode}){

 return(
 <html lang="en">
 <body className={`${headingFont.variable} ${bodyFont.variable}`.trim()}>
 <AppShell>{children}</AppShell>
 </body>
 </html>
 )
}
