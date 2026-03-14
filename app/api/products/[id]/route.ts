import {NextResponse} from "next/server"

import {getCurrentUser} from "@/lib/auth"
import {prisma} from "@/lib/prisma"

function parseId(value:string){
 const id=Number(value)
 if(!Number.isInteger(id) || id<=0) return null
 return id
}

export async function PUT(req:Request,{params}:{params:{id:string}}){
 try{
 const user=await getCurrentUser()
 if(!user){
 return NextResponse.json({error:"Unauthorized"},{status:401})
 }

 const id=parseId(params.id)
 if(!id){
 return NextResponse.json({error:"Invalid product id"},{status:400})
 }

 const body=await req.json()
 const name=typeof body.name==="string" ? body.name.trim() : ""
 const sku=typeof body.sku==="string" ? body.sku.trim() : ""
 const unit=typeof body.unit==="string" ? body.unit.trim() : ""
 const reorderLevel=Number(body.reorderLevel)

 if(!name || !sku || !unit){
 return NextResponse.json({error:"Name, SKU, and unit are required"},{status:400})
 }

 if(!Number.isInteger(reorderLevel) || reorderLevel<0){
 return NextResponse.json({error:"reorderLevel must be a non-negative whole number"},{status:400})
 }

 const existing=await prisma.product.findUnique({
 where:{id},
 select:{id:true}
 })

 if(!existing){
 return NextResponse.json({error:"Product not found"},{status:404})
 }

 const product=await prisma.product.update({
 where:{id},
 data:{name,sku,unit,reorderLevel}
 })

 return NextResponse.json(product)
 }catch{
 return NextResponse.json({error:"Failed to update product"},{status:500})
 }
}

export async function DELETE(_:Request,{params}:{params:{id:string}}){
 try{
 const user=await getCurrentUser()
 if(!user){
 return NextResponse.json({error:"Unauthorized"},{status:401})
 }

 const id=parseId(params.id)
 if(!id){
 return NextResponse.json({error:"Invalid product id"},{status:400})
 }

 const existing=await prisma.product.findUnique({
 where:{id},
 select:{
 id:true,
 _count:{
 select:{
 movements:true,
 documentLines:true
 }
 }
 }
 })

 if(!existing){
 return NextResponse.json({error:"Product not found"},{status:404})
 }

 if(existing._count.movements>0 || existing._count.documentLines>0){
 return NextResponse.json({error:"Cannot delete product with stock history"},{status:409})
 }

 await prisma.product.delete({where:{id}})
 return NextResponse.json({ok:true})
 }catch{
 return NextResponse.json({error:"Failed to delete product"},{status:500})
 }
}
