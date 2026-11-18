import {nextProjectSave} from './project-names.js';
// File-system handles remain session-only and are never embedded in projects.
export async function availableProjectSave(directory,plan){
 let next=plan;for(let attempt=0;attempt<10000;attempt++){try{await directory.getFileHandle(next.name+'.trstudio');next=nextProjectSave({...next,lastSaved:1});}catch(error){if(error.name==='NotFoundError')return next;throw error;}}throw Error('Too many existing project copies in this folder.');
}
export async function writeProjectFile(file,blob){const writer=await file.createWritable();try{await writer.write(blob);await writer.close();}catch(error){await writer.abort?.().catch(()=>{});throw error;}}
