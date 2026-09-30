import {createHash} from "node:crypto";
export function stableSoundUuid(seed:string){
 const h=createHash("sha256").update(seed,"utf8").digest("hex").slice(0,32).split("");
 h[12]="5";h[16]=["8","9","a","b"][parseInt(h[16],16)%4];
 const x=h.join("");return x.slice(0,8)+"-"+x.slice(8,12)+"-"+x.slice(12,16)+"-"+x.slice(16,20)+"-"+x.slice(20);
}
export function soundChecksum(value:unknown){return createHash("sha256").update(JSON.stringify(value),"utf8").digest("hex");}
