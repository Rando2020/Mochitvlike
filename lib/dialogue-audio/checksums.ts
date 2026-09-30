import {createHash} from "node:crypto";
export function checksumText(text:string){return createHash("sha256").update(text,"utf8").digest("hex");}
export function checksumJson(value:unknown){return createHash("sha256").update(JSON.stringify(value),"utf8").digest("hex");}
