export const DOCUMENT_TYPES={
 RECEIPT:"RECEIPT",
 DELIVERY:"DELIVERY",
 TRANSFER:"TRANSFER",
 ADJUSTMENT:"ADJUSTMENT"
} as const

export const DOCUMENT_STATUS={
 PENDING:"PENDING",
 VALIDATED:"VALIDATED"
} as const

const POSITIVE_MOVEMENT_TYPES=new Set(["in","receipt","transfer_in"])
const NEGATIVE_MOVEMENT_TYPES=new Set(["out","delivery","transfer_out"])

export function movementDelta(type:string,quantity:number){
 const normalizedType=String(type||"").toLowerCase()
 const value=Number(quantity)||0

 if(POSITIVE_MOVEMENT_TYPES.has(normalizedType)) return value
 if(NEGATIVE_MOVEMENT_TYPES.has(normalizedType)) return -value
 if(normalizedType==="adjustment") return value

 return 0
}

export function calculateStockFromMovements(movements:Array<{type:string,quantity:number}>){
 return movements.reduce((sum,movement)=>{
 return sum+movementDelta(movement.type,movement.quantity)
 },0)
}

export function calculateStockByProduct(movements:Array<{productId:number,type:string,quantity:number}>){
 const map=new Map<number,number>()

 for(const movement of movements){
 const previous=map.get(movement.productId)||0
 map.set(movement.productId,previous+movementDelta(movement.type,movement.quantity))
 }

 return map
}

export function movementDirection(type:string){
 const normalizedType=String(type||"").toLowerCase()

 if(POSITIVE_MOVEMENT_TYPES.has(normalizedType)) return "in"
 if(NEGATIVE_MOVEMENT_TYPES.has(normalizedType)) return "out"
 if(normalizedType==="adjustment") return "adjustment"

 return "neutral"
}
