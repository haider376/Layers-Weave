import crypto from "crypto"; import fs from "fs"; import { PrismaClient } from "@prisma/client";
const SECRET=(fs.readFileSync(new URL("../.env",import.meta.url),"utf8").match(/SESSION_SECRET="?([^"\n]+)"?/)||[])[1];
const p=new PrismaClient();
const cj=(id)=>{const m=crypto.createHmac("sha256",SECRET).update(id).digest("hex");return `lw_session=${id}.${m}`;};
const h=await p.user.findFirst({where:{email:"haider@layerswholesale.co"}});
const co=await p.company.findFirst();const ct=await p.contact.findFirst();
const g=async(x)=>(await (await fetch("http://localhost:3000"+x,{headers:{cookie:cj(h.id)}})).text());
const s=await g("/sales"),l=await g("/companies"),pe=await g("/contacts"),cp=await g("/companies/"+co.id),cn=await g("/contacts/"+ct.id),st=await g("/settings");
const C=[
 ["Deals Board/Table/Report + drag-only", s.includes(">Board<")&&s.includes(">Table<")&&s.includes(">Report<")&&!s.includes("stage-select")],
 ["Leads import/export/add", l.includes(">Import<")&&l.includes(">Export<")&&l.includes("+ Add lead")],
 ["Leads rich columns", l.includes(">Owner<")&&l.includes(">BDR<")&&l.includes(">Last activity<")],
 ["People 3-view toolbar", pe.includes("lv-toolbar")&&pe.includes(">Report<")],
 ["Company Tasks panel", cp.includes("Add a task for this record")],
 ["Contact Tasks panel", cn.includes("Add a task for this record")],
 ["Topbar icons + search", s.includes("search-c")&&s.includes("Sign out")&&s.includes("Settings")],
 ["Settings Team", st.includes("Team")],
 ["Renames live", s.includes(">Deals<")&&l.includes(">Leads<")&&pe.includes(">People<")],
];
let pass=0;for(const[n,ok]of C){console.log((ok?"PASS":"FAIL")+"  "+n);if(ok)pass++;}
console.log("\n"+pass+"/"+C.length+" feature checks");
await p.$disconnect();
