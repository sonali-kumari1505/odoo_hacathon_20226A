import {NextResponse} from "next/server"

import {getCurrentUser} from "@/lib/auth"
import {prisma} from "@/lib/prisma"
import {DOCUMENT_STATUS,DOCUMENT_TYPES} from "@/lib/stock"

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
 return NextResponse.json({error:"Invalid receipt id"},{status:400})
 }

 const result=await prisma.$transaction(async tx=>{
 const receipt=await tx.stockDocument.findUnique({
 where:{id},
 include:{
 supplier:true,
 lines:{
 include:{product:true},
 orderBy:{id:"asc"}
 }
 }
 })

 if(!receipt || receipt.type!==DOCUMENT_TYPES.RECEIPT){
 return{error:"not_found" as const}
 }

 if(receipt.status===DOCUMENT_STATUS.VALIDATED){
 return{receipt,alreadyValidated:true}
 }

 await tx.movement.createMany({
 data:receipt.lines.map(line=>({
 productId:line.productId,
 type:"receipt",
 quantity:line.quantity,
 location:receipt.toLocation,
 toLocation:receipt.toLocation,
 note:`Receipt #${receipt.id}`,
 documentId:receipt.id
 }))
 })

 const updated=await tx.stockDocument.update({
 where:{id:receipt.id},
 data:{
 status:DOCUMENT_STATUS.VALIDATED,
 validatedAt:new Date()
 },
 include:{
 supplier:true,
 lines:{
 include:{product:true},
 orderBy:{id:"asc"}
 }
 }
 })

 return{receipt:updated,alreadyValidated:false}
 })

 if("error" in result){
 return NextResponse.json({error:"Receipt not found"},{status:404})
 }

 return NextResponse.json(result)
 }catch{
 return NextResponse.json({error:"Failed to validate receipt"},{status:500})
 }
}
