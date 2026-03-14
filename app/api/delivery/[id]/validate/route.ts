import {NextResponse} from "next/server"

import {getCurrentUser} from "@/lib/auth"
import {prisma} from "@/lib/prisma"
import {DOCUMENT_STATUS,DOCUMENT_TYPES,calculateStockByProduct} from "@/lib/stock"

function parseId(value:string){
 const id=Number(value)
 if(!Number.isInteger(id) || id<=0) return null
 return id
}

export async function POST(_:Request,{params}:{params:{id:string}}){
 try{
 const user=await getCurrentUser()
 if(!user){
 return NextResponse.json({error:"Unauthorized"},{status:401})
 }

 const id=parseId(params.id)
 if(!id){
 return NextResponse.json({error:"Invalid delivery id"},{status:400})
 }

 const result=await prisma.$transaction(async tx=>{
 const delivery=await tx.stockDocument.findUnique({
 where:{id},
 include:{
 lines:{
 include:{product:true},
 orderBy:{id:"asc"}
 }
 }
 })

 if(!delivery || delivery.type!==DOCUMENT_TYPES.DELIVERY){
 return{error:"not_found" as const}
 }

 if(delivery.status===DOCUMENT_STATUS.VALIDATED){
 return{delivery,alreadyValidated:true}
 }

 const productIds=Array.from(new Set(delivery.lines.map(line=>line.productId)))
 const movements=await tx.movement.findMany({
 where:{
 productId:{
 in:productIds
 }
 },
 select:{
 productId:true,
 type:true,
 quantity:true
 }
 })

 const stockByProduct=calculateStockByProduct(movements)
 const shortages=delivery.lines
 .map(line=>{
 const available=stockByProduct.get(line.productId)||0
 if(available>=line.quantity) return null

 return{
 productId:line.productId,
 productName:line.product?.name||`Product ${line.productId}`,
 required:line.quantity,
 available
 }
 })
 .filter((item):item is {productId:number,productName:string,required:number,available:number}=>Boolean(item))

 if(shortages.length>0){
 return{error:"insufficient_stock" as const,shortages}
 }

 await tx.movement.createMany({
 data:delivery.lines.map(line=>({
 productId:line.productId,
 type:"delivery",
 quantity:line.quantity,
 location:delivery.fromLocation,
 fromLocation:delivery.fromLocation,
 note:`Delivery #${delivery.id}`,
 documentId:delivery.id
 }))
 })

 const updated=await tx.stockDocument.update({
 where:{id:delivery.id},
 data:{
 status:DOCUMENT_STATUS.VALIDATED,
 validatedAt:new Date()
 },
 include:{
 lines:{
 include:{product:true},
 orderBy:{id:"asc"}
 }
 }
 })

 return{delivery:updated,alreadyValidated:false}
 })

 if("error" in result){
 if(result.error==="not_found"){
 return NextResponse.json({error:"Delivery not found"},{status:404})
 }

 return NextResponse.json({
 error:"Insufficient stock for one or more products",
 shortages:result.shortages
 },{status:400})
 }

 return NextResponse.json(result)
 }catch{
 return NextResponse.json({error:"Failed to validate delivery"},{status:500})
 }
}
