export {
  getDocumentoById,
  listDocumentos,
} from "@/lib/supabase/documentos-server";
export {
  createDocumento,
  createDocumentosBatch,
  deleteDocumento,
  findExistingDocumentoNomes,
  updateDocumento,
  type DocumentoInput,
} from "@/lib/supabase/documentos";
