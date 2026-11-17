// The base and counter travel with the project, so copying a copy does not nest suffixes.
export function nextProjectSave(project){
 const name=project.name.trim()||'Untitled project';
 if(!project.lastSaved)return {name,saveBase:name,saveCopy:0};
 const count=Number.isInteger(project.saveCopy)&&project.saveCopy>=0?project.saveCopy:0;
 const base=project.saveBase||name;
 const expected=count?`${base} (${count})`:base;
 const saveBase=name===expected?base:name,saveCopy=name===expected?count+1:1;
 return {name:`${saveBase} (${saveCopy})`,saveBase,saveCopy};
}
