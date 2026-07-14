export {
  getProcedimentoById,
  listProcedimentos,
} from "@/lib/supabase/procedimentos-server";
export {
  createProcedimento,
  createProcedimentosBatch,
  deleteProcedimento,
  findExistingProcedimentoNomes,
  updateProcedimento,
  type ProcedimentoInput,
} from "@/lib/supabase/procedimentos";
