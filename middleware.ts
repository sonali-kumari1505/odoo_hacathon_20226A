import { NextResponse, type NextRequest } from "next/server"

const AUTH_PAGES=new Set(["/login","/signup"])
const SESSION_COOKIE_NAME="coreinventory_session"

function isBypassPath(pathname:string){
 return pathname.startsWith("/_next")
 || pathname.startsWith("/api")
 || pathname.startsWith("/favicon")
 || pathname==="/robots.txt"
 || pathname==="/sitemap.xml"
}

async function hasValidSession(request:NextRequest){
 const token=request.cookies.get(SESSION_COOKIE_NAME)?.value
 if(!token) return false

 try{
 const meUrl=request.nextUrl.clone()
 meUrl.pathname="/api/auth/me"
 meUrl.search=""

 const response=await fetch(meUrl,{
 method:"GET",
 headers:{
 cookie:request.headers.get("cookie")||""
 },
 cache:"no-store"
 })

 return response.ok
 }catch{
 return false
 }
}

function clearSessionCookie(response:NextResponse){
 response.cookies.set(SESSION_COOKIE_NAME,"",{
 httpOnly:true,
 sameSite:"lax",
 secure:process.env.NODE_ENV==="production",
 path:"/",
 maxAge:0
 })
}

export async function middleware(request:NextRequest){
 const {pathname}=request.nextUrl

 if(isBypassPath(pathname)) return NextResponse.next()

 const token=request.cookies.get(SESSION_COOKIE_NAME)?.value
 const isAuthPage=AUTH_PAGES.has(pathname)

 if(!token && !isAuthPage){
 const redirectUrl=request.nextUrl.clone()
 redirectUrl.pathname="/login"
 return NextResponse.redirect(redirectUrl)
 }

 if(!token && isAuthPage){
 return NextResponse.next()
 }

 const validSession=await hasValidSession(request)

 if(!validSession && !isAuthPage){
 const redirectUrl=request.nextUrl.clone()
 redirectUrl.pathname="/login"
 const response=NextResponse.redirect(redirectUrl)
 clearSessionCookie(response)
 return response
 }

 if(!validSession && isAuthPage){
 const response=NextResponse.next()
 clearSessionCookie(response)
 return response
 }

 if(validSession && isAuthPage){
 const redirectUrl=request.nextUrl.clone()
 redirectUrl.pathname="/"
 return NextResponse.redirect(redirectUrl)
 }

 return NextResponse.next()
}

export const config={
 matcher:["/:path*"]
}
