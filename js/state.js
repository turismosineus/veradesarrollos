// Estado de la aplicación.
export const D = { projects:[], providers:[], expenses:[], liquidaciones:[], investments:[], investorDocs:[] };
export const S = {
  page:'login', user:null, modal:null, tab:'estado',
  proj:null, prov:null, order:null, inv:null, invName:'',
  revCat:'', revName:'', editId:null, provFilter:'todos', bdCtx:'provider',
  mi:[{desc:'',qty:'',unit:'u',price:''}]
};
export const ui = { pendingFile:null, pendingFiles:[] };
