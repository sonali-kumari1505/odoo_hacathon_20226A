
import {getCurrentUser} from "@/lib/auth"
import {prisma} from "@/lib/prisma"
import {NextResponse} from "next/server"

export async function GET(){
 const user=await getCurrentUser()
 if(!user){
 return NextResponse.json({error:"Unauthorized"},{status:401})
 }

 const h=await prisma.movement.findMany({
 include:{
 product:true,
 document:{
 select:{
 id:true,
 type:true,
 status:true
 }
 }
 },
 orderBy:{createdAt:"desc"}
 })
 return NextResponse.json(h)
}
