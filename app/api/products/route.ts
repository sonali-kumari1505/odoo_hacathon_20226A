
import {getCurrentUser} from "@/lib/auth"
import {prisma} from "@/lib/prisma"
import {NextResponse} from "next/server"

export async function GET(){
 try{
 const user=await getCurrentUser()
 if(!user){
 return NextResponse.json({error:"Unauthorized"},{status:401})
 }

 const products=await prisma.product.findMany({
 include:{
 movements:{
 orderBy:{createdAt:"desc"}
 }
 },
 orderBy:{id:"asc"}
 })

 return NextResponse.json(products)
 }catch{
 return NextResponse.json({error:"Failed to load products"},{status:500})
 }
}

export async function POST(req:Request){
 try{
 const user=await getCurrentUser()
 if(!user){
 return NextResponse.json({error:"Unauthorized"},{status:401})
 }

 const body=await req.json()
 const name=typeof body.name==="string" ? body.name.trim() : ""
 const sku=typeof body.sku==="string" ? body.sku.trim() : ""
 const unit=typeof body.unit==="string" ? body.unit.trim() : ""
 const reorderLevel=body.reorderLevel===undefined ? 10 : Number(body.reorderLevel)

 if(!name || !sku || !unit){
 return NextResponse.json({error:"Name, SKU, and unit are required"},{status:400})
 }

 if(!Number.isInteger(reorderLevel) || reorderLevel<0){
 return NextResponse.json({error:"reorderLevel must be a non-negative whole number"},{status:400})
 }

 const product=await prisma.product.create({
 data:{name,sku,unit,reorderLevel}
 })

 return NextResponse.json(product,{status:201})
 }catch{
 return NextResponse.json({error:"Failed to create product"},{status:500})
 }
}
