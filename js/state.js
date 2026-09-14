// Estado de la aplicación.
export const D = { projects:[], providers:[], expenses:[], liquidaciones:[], investments:[], investorDocs:[], settings:{ refRate:null } };
export const S = {
  page:'login', user:null, modal:null, tab:'estado',
  proj:null, prov:null, order:null, inv:null, invName:'',
  revCat:'', revName:'', editId:null, provFilter:'todos', bdCtx:'provider', invProjId:null, expProjId:null, ftab:'panel', projQ:'', projStatus:'todos', projSort:null, projView:'table', projQFocus:false,
  mi:[{desc:'',qty:'',unit:'u',price:''}]
};
export const ui = { pendingFile:null, pendingFiles:[] };
